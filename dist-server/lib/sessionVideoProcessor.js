import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { createWorker, OEM, PSM } from 'tesseract.js';
import { getDatabase } from './database.js';
const require = createRequire(import.meta.url);
const ffmpegBinary = require('ffmpeg-static');
function getNullDevice() {
    return process.platform === 'win32' ? 'NUL' : '/dev/null';
}
function ensureFfmpegBinary() {
    if (!ffmpegBinary) {
        throw new Error('ffmpeg-static is required for session video analysis');
    }
    return ffmpegBinary;
}
function parseDuration(durationText) {
    const match = durationText.match(/(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
    if (!match) {
        return 0;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    return hours * 3600 + minutes * 60 + seconds;
}
function clampFrame(value) {
    return Math.max(1, Math.round(value));
}
function clampNumber(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}
function meanAbsoluteDifference(left, right) {
    const sampleLength = Math.min(left.length, right.length);
    if (sampleLength === 0) {
        return 0;
    }
    let totalDifference = 0;
    for (let index = 0; index < sampleLength; index += 1) {
        const leftValue = left[index] ?? 0;
        const rightValue = right[index] ?? 0;
        totalDifference += Math.abs(leftValue - rightValue);
    }
    return totalDifference / sampleLength / 255;
}
function percentile(values, ratio) {
    if (values.length === 0) {
        return 0;
    }
    const sortedValues = [...values].sort((left, right) => left - right);
    const safeRatio = Math.min(1, Math.max(0, ratio));
    const targetIndex = Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * safeRatio));
    return sortedValues[targetIndex] ?? 0;
}
function smoothValues(values, radius) {
    return values.map((_value, index) => {
        let total = 0;
        let count = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
            const candidate = values[index + offset];
            if (candidate === undefined) {
                continue;
            }
            total += candidate;
            count += 1;
        }
        return count === 0 ? 0 : total / count;
    });
}
function sanitizeOcrText(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function parseWinAmount(text) {
    const candidates = Array.from(text.matchAll(/(?:[£$€])?\s*(\d+(?:[.,]\d{1,2})?)/g))
        .map((match) => Number(match[1]?.replace(',', '.') ?? NaN))
        .filter((value) => Number.isFinite(value));
    if (candidates.length === 0) {
        return 0;
    }
    return Math.max(...candidates);
}
function detectBonusKeyword(text) {
    const normalizedText = text.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ');
    const keywords = ['BONUS', 'FREE SPINS', 'FREESPINS', 'SCATTER', 'FEATURE'];
    return keywords.some((keyword) => normalizedText.includes(keyword));
}
function calculateAnalysisFps(durationSeconds) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return 10;
    }
    return clampNumber(Math.round(2400 / durationSeconds), 6, 12);
}
function parseIsoTimestamp(value) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}
function normalizeMetadataTime(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function buildSegmentsFromMetadata(metadata, durationSeconds, framesPerSecond) {
    const spins = metadata?.spins?.filter((spin) => spin && typeof spin === 'object') ?? [];
    if (spins.length === 0) {
        return null;
    }
    const firstTimestamp = spins[0]?.timestamp ? parseIsoTimestamp(spins[0].timestamp) : null;
    const resolvedStarts = spins.map((spin, index) => {
        const explicitStart = normalizeMetadataTime(spin.startSeconds ?? spin.startTimeSeconds);
        if (explicitStart !== null) {
            return explicitStart;
        }
        if (firstTimestamp !== null && spin.timestamp) {
            const candidateTimestamp = parseIsoTimestamp(spin.timestamp);
            if (candidateTimestamp !== null) {
                return Math.max(0, (candidateTimestamp - firstTimestamp) / 1000);
            }
        }
        if (index === 0) {
            return 0;
        }
        return null;
    });
    const segments = [];
    for (let index = 0; index < spins.length; index += 1) {
        const spin = spins[index];
        const startSeconds = resolvedStarts[index];
        if (!spin || startSeconds === null || startSeconds === undefined) {
            continue;
        }
        const explicitEnd = normalizeMetadataTime(spin.endSeconds ?? spin.endTimeSeconds);
        const explicitDuration = normalizeMetadataTime(spin.durationSeconds);
        const nextStart = resolvedStarts[index + 1];
        const derivedEnd = explicitEnd ?? (explicitDuration !== null ? startSeconds + explicitDuration : nextStart ?? durationSeconds);
        const boundedStart = clampNumber(startSeconds, 0, durationSeconds);
        const boundedEnd = clampNumber(derivedEnd, boundedStart, durationSeconds);
        if (boundedEnd - boundedStart < 0.2) {
            continue;
        }
        segments.push({
            spinNumber: spin.spinNumber && spin.spinNumber > 0 ? spin.spinNumber : segments.length + 1,
            startSeconds: boundedStart,
            endSeconds: boundedEnd,
            startFrame: clampFrame(boundedStart * framesPerSecond + 1),
            endFrame: clampFrame(boundedEnd * framesPerSecond),
            metadata: {
                winAmount: typeof spin.winAmount === 'number' && Number.isFinite(spin.winAmount) ? spin.winAmount : undefined,
                cascades: typeof spin.cascades === 'number' && Number.isFinite(spin.cascades) ? Math.max(0, Math.round(spin.cascades)) : undefined,
                bonusTriggered: typeof spin.bonusTriggered === 'boolean' ? spin.bonusTriggered : undefined,
            },
        });
    }
    return segments.length > 0 ? segments.sort((left, right) => left.startSeconds - right.startSeconds) : null;
}
async function withTimeout(promise, timeoutMs, fallbackValue) {
    let timeoutHandle;
    try {
        return await Promise.race([
            promise,
            new Promise((resolve) => {
                timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
            }),
        ]);
    }
    finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}
function buildSegmentsFromBoundaries(boundaries, durationSeconds, framesPerSecond, sceneTimes) {
    const minSpinDurationSeconds = 1.1;
    const maxSpinDurationSeconds = 8.5;
    const preferredSpinDurationSeconds = 3.2;
    const normalizedBoundaries = Array.from(new Set([0, ...boundaries, durationSeconds]))
        .filter((value) => value >= 0 && value <= durationSeconds)
        .sort((left, right) => left - right);
    const pushSegment = (segments, startSeconds, endSeconds) => {
        if (endSeconds - startSeconds < minSpinDurationSeconds) {
            return;
        }
        segments.push({
            spinNumber: segments.length + 1,
            startSeconds,
            endSeconds,
            startFrame: clampFrame(startSeconds * framesPerSecond + 1),
            endFrame: clampFrame(endSeconds * framesPerSecond),
        });
    };
    const segments = [];
    for (let index = 0; index < normalizedBoundaries.length - 1; index += 1) {
        const startSeconds = normalizedBoundaries[index] ?? 0;
        const endSeconds = normalizedBoundaries[index + 1] ?? durationSeconds;
        const span = endSeconds - startSeconds;
        if (span < minSpinDurationSeconds) {
            continue;
        }
        if (span <= maxSpinDurationSeconds) {
            pushSegment(segments, startSeconds, endSeconds);
            continue;
        }
        const sceneCandidates = sceneTimes.filter((timestamp) => timestamp > startSeconds + minSpinDurationSeconds && timestamp < endSeconds - minSpinDurationSeconds);
        if (sceneCandidates.length > 0) {
            let chunkStart = startSeconds;
            for (const sceneCandidate of sceneCandidates) {
                if (sceneCandidate - chunkStart >= minSpinDurationSeconds && endSeconds - sceneCandidate >= minSpinDurationSeconds / 2) {
                    pushSegment(segments, chunkStart, sceneCandidate);
                    chunkStart = sceneCandidate;
                }
            }
            pushSegment(segments, chunkStart, endSeconds);
            continue;
        }
        const chunkCount = Math.max(2, Math.ceil(span / preferredSpinDurationSeconds));
        const chunkDuration = span / chunkCount;
        for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
            const chunkStart = startSeconds + chunkDuration * chunkIndex;
            const chunkEnd = chunkIndex === chunkCount - 1 ? endSeconds : startSeconds + chunkDuration * (chunkIndex + 1);
            pushSegment(segments, chunkStart, chunkEnd);
        }
    }
    if (segments.length > 0) {
        return segments;
    }
    const fallbackCount = Math.max(1, Math.ceil(durationSeconds / 3.2));
    const fallbackDuration = durationSeconds / fallbackCount;
    return Array.from({ length: fallbackCount }, (_value, index) => {
        const startSeconds = fallbackDuration * index;
        const endSeconds = index === fallbackCount - 1 ? durationSeconds : fallbackDuration * (index + 1);
        return {
            spinNumber: index + 1,
            startSeconds,
            endSeconds,
            startFrame: clampFrame(startSeconds * framesPerSecond + 1),
            endFrame: clampFrame(endSeconds * framesPerSecond),
        };
    });
}
function detectSpinSegments(frameSamples, durationSeconds, framesPerSecond, sceneTimes, analysisFps) {
    if (frameSamples.length <= 1) {
        return buildSegmentsFromBoundaries([], durationSeconds, framesPerSecond, sceneTimes);
    }
    const rawScores = frameSamples.map((sample) => sample.motionScore);
    const smoothedScores = smoothValues(rawScores, 2);
    const activeScores = smoothedScores.slice(1);
    const baseline = percentile(activeScores, 0.35);
    const upperBand = percentile(activeScores, 0.82);
    const quietThreshold = Math.max(0.006, baseline + (upperBand - baseline) * 0.12);
    const minQuietFrames = Math.max(3, Math.round(analysisFps * 0.35));
    const quietMidpoints = [];
    let quietRunStart = -1;
    for (let index = 1; index < smoothedScores.length; index += 1) {
        const score = smoothedScores[index] ?? 0;
        if (score <= quietThreshold) {
            if (quietRunStart === -1) {
                quietRunStart = index;
            }
            continue;
        }
        if (quietRunStart !== -1 && index - quietRunStart >= minQuietFrames) {
            const midpointIndex = quietRunStart + Math.floor((index - quietRunStart) / 2);
            quietMidpoints.push(frameSamples[midpointIndex]?.timestampSeconds ?? 0);
        }
        quietRunStart = -1;
    }
    if (quietRunStart !== -1 && smoothedScores.length - quietRunStart >= minQuietFrames) {
        const midpointIndex = quietRunStart + Math.floor((smoothedScores.length - quietRunStart) / 2);
        quietMidpoints.push(frameSamples[midpointIndex]?.timestampSeconds ?? durationSeconds);
    }
    return buildSegmentsFromBoundaries(quietMidpoints, durationSeconds, framesPerSecond, sceneTimes);
}
function detectSegmentMotionMetadata(frameSamples, segment) {
    const segmentSamples = frameSamples.filter((sample) => sample.timestampSeconds >= segment.startSeconds && sample.timestampSeconds <= segment.endSeconds);
    if (segmentSamples.length === 0) {
        return { cascades: 0, cascadeTimes: [] };
    }
    const smoothedScores = smoothValues(segmentSamples.map((sample) => sample.motionScore), 1);
    const baseline = percentile(smoothedScores, 0.35);
    const upperBand = percentile(smoothedScores, 0.82);
    const activityThreshold = Math.max(0.02, baseline + (upperBand - baseline) * 0.55);
    const quietThreshold = Math.max(0.008, baseline + (upperBand - baseline) * 0.2);
    const cascadeTimes = [];
    let inCluster = false;
    let quietFrames = 0;
    let clusterCount = 0;
    for (let index = 0; index < smoothedScores.length; index += 1) {
        const score = smoothedScores[index] ?? 0;
        if (score >= activityThreshold) {
            quietFrames = 0;
            if (!inCluster) {
                inCluster = true;
                clusterCount += 1;
                if (clusterCount > 1) {
                    const timestamp = segmentSamples[index]?.timestampSeconds ?? segment.startSeconds;
                    cascadeTimes.push(Math.max(0, timestamp - segment.startSeconds));
                }
            }
            continue;
        }
        if (inCluster) {
            if (score <= quietThreshold) {
                quietFrames += 1;
            }
            if (quietFrames >= 2) {
                inCluster = false;
                quietFrames = 0;
            }
        }
    }
    return {
        cascades: Math.max(0, clusterCount - 1),
        cascadeTimes,
    };
}
function findFrameNearTime(frameSamples, targetTimeSeconds) {
    let closestSample = frameSamples[0] ?? null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const sample of frameSamples) {
        const distance = Math.abs(sample.timestampSeconds - targetTimeSeconds);
        if (distance < closestDistance) {
            closestSample = sample;
            closestDistance = distance;
        }
    }
    return closestSample;
}
async function createOcrWorker() {
    return createWorker('eng', OEM.LSTM_ONLY);
}
async function recognizeText(worker, imageBuffer, whitelist, pageSegMode) {
    await worker.setParameters({
        tessedit_char_whitelist: whitelist,
        tessedit_pageseg_mode: pageSegMode,
        preserve_interword_spaces: '1',
    });
    const result = await withTimeout(worker.recognize(imageBuffer), 1500, { data: { text: '' } });
    return sanitizeOcrText(result.data.text);
}
async function prepareRegionBuffer(imagePath, region) {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const imageWidth = metadata.width ?? 0;
    const imageHeight = metadata.height ?? 0;
    if (imageWidth <= 0 || imageHeight <= 0) {
        return Buffer.alloc(0);
    }
    const extractionRegion = {
        left: Math.max(0, Math.floor(imageWidth * region.leftRatio)),
        top: Math.max(0, Math.floor(imageHeight * region.topRatio)),
        width: Math.max(1, Math.floor(imageWidth * region.widthRatio)),
        height: Math.max(1, Math.floor(imageHeight * region.heightRatio)),
    };
    const targetWidth = Math.min(960, Math.max(220, extractionRegion.width * 2));
    const targetHeight = Math.min(320, Math.max(90, extractionRegion.height * 2));
    return image
        .extract(extractionRegion)
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: targetWidth, height: targetHeight, fit: 'fill' })
        .threshold(148)
        .png()
        .toBuffer();
}
async function extractSpinGameplayMetadata(worker, frameSamples, segment) {
    const winFrame = findFrameNearTime(frameSamples, Math.max(segment.startSeconds, segment.endSeconds - 0.2));
    const bonusFrame = findFrameNearTime(frameSamples, (segment.startSeconds + segment.endSeconds) / 2);
    if (!winFrame || !bonusFrame) {
        return {
            winAmount: 0,
            bonusTriggered: false,
            ocrWinText: '',
            ocrBonusText: '',
        };
    }
    try {
        const winMeterBuffer = await prepareRegionBuffer(winFrame.filePath, {
            leftRatio: 0.2,
            topRatio: 0.7,
            widthRatio: 0.6,
            heightRatio: 0.2,
        });
        const bonusBuffer = await prepareRegionBuffer(bonusFrame.filePath, {
            leftRatio: 0.1,
            topRatio: 0.08,
            widthRatio: 0.8,
            heightRatio: 0.28,
        });
        const ocrWinText = winMeterBuffer.length
            ? await recognizeText(worker, winMeterBuffer, '0123456789.,£$€ ', PSM.SINGLE_LINE)
            : '';
        const ocrBonusText = bonusBuffer.length
            ? await recognizeText(worker, bonusBuffer, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ', PSM.SPARSE_TEXT)
            : '';
        return {
            winAmount: parseWinAmount(ocrWinText),
            bonusTriggered: detectBonusKeyword(ocrBonusText),
            ocrWinText,
            ocrBonusText,
        };
    }
    catch {
        return {
            winAmount: 0,
            bonusTriggered: false,
            ocrWinText: '',
            ocrBonusText: '',
        };
    }
}
async function runFfmpeg(args, acceptedExitCodes = [0]) {
    const binary = ensureFfmpegBinary();
    return new Promise((resolve, reject) => {
        const processHandle = spawn(binary, args, { windowsHide: true });
        let stdout = '';
        let stderr = '';
        processHandle.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        processHandle.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        processHandle.on('error', reject);
        processHandle.on('close', (code) => {
            if (acceptedExitCodes.includes(code ?? 0)) {
                resolve({ stdout, stderr });
                return;
            }
            reject(new Error(`ffmpeg failed with exit code ${code}: ${stderr}`));
        });
    });
}
async function probeVideo(videoPath) {
    const { stderr } = await runFfmpeg(['-i', videoPath], [0, 1]);
    const durationMatch = stderr.match(/Duration:\s*([^,]+)/);
    const fpsMatch = stderr.match(/([0-9]+(?:\.[0-9]+)?)\s+fps/);
    const durationSeconds = durationMatch?.[1] ? parseDuration(durationMatch[1]) : 0;
    const framesPerSecond = fpsMatch ? Number(fpsMatch[1]) : 30;
    if (durationSeconds <= 0) {
        throw new Error('Unable to determine uploaded video duration');
    }
    return {
        durationSeconds,
        framesPerSecond: Number.isFinite(framesPerSecond) && framesPerSecond > 0 ? framesPerSecond : 30,
    };
}
async function extractFrames(videoPath, framesDirectory, analysisFps) {
    await mkdir(framesDirectory, { recursive: true });
    await runFfmpeg([
        '-y',
        '-i',
        videoPath,
        '-vf',
        `fps=${analysisFps},scale=640:-1:flags=lanczos`,
        '-q:v',
        '2',
        path.join(framesDirectory, 'frame-%06d.jpg'),
    ]);
}
async function detectSceneTimes(videoPath, analysisFps) {
    const { stderr } = await runFfmpeg(['-i', videoPath, '-vf', `fps=${analysisFps},select=gt(scene\\,0.1),showinfo`, '-fps_mode', 'vfr', '-f', 'null', getNullDevice()], [0]);
    const sceneTimes = new Set();
    const showInfoPattern = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
    for (const match of stderr.matchAll(showInfoPattern)) {
        const timestamp = Number(match[1]);
        if (Number.isFinite(timestamp)) {
            sceneTimes.add(timestamp);
        }
    }
    return Array.from(sceneTimes).sort((left, right) => left - right);
}
async function buildFrameSamples(framesDirectory, analysisFps) {
    const frameNames = (await readdir(framesDirectory))
        .filter((fileName) => fileName.toLowerCase().endsWith('.jpg'))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const frameSamples = [];
    let previousBuffer = null;
    for (const [index, frameName] of frameNames.entries()) {
        const absoluteFramePath = path.join(framesDirectory, frameName);
        const normalizedBuffer = await sharp(absoluteFramePath).resize(96, 54, { fit: 'fill' }).grayscale().raw().toBuffer();
        const motionScore = previousBuffer ? meanAbsoluteDifference(previousBuffer, normalizedBuffer) : 0;
        frameSamples.push({
            filePath: absoluteFramePath,
            timestampSeconds: index / analysisFps,
            motionScore,
        });
        previousBuffer = normalizedBuffer;
    }
    return frameSamples;
}
async function clearDirectory(directory) {
    await rm(directory, { recursive: true, force: true });
    await mkdir(directory, { recursive: true });
}
async function createSpinClip(sourceVideoPath, outputPath, startSeconds, durationSeconds) {
    await runFfmpeg([
        '-y',
        '-ss',
        startSeconds.toFixed(3),
        '-i',
        sourceVideoPath,
        '-t',
        Math.max(0.2, durationSeconds).toFixed(3),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-c:a',
        'aac',
        outputPath,
    ]);
}
async function removeExistingSessionSpins(sessionId) {
    const database = await getDatabase();
    const spinIds = await database.all('SELECT id FROM spins WHERE session_id = ?', [sessionId]);
    for (const spin of spinIds) {
        await database.run('DELETE FROM videos WHERE spin_id = ?', [spin.id]);
        await database.run('DELETE FROM events WHERE spin_id = ?', [spin.id]);
    }
    await database.run('DELETE FROM spins WHERE session_id = ?', [sessionId]);
}
export async function processUploadedSessionVideo(sessionId, sourceVideoPath, metadata) {
    const database = await getDatabase();
    const sessionRoot = path.join(process.cwd(), 'storage', 'sessions', String(sessionId));
    const spinsDirectory = path.join(sessionRoot, 'spins');
    const framesDirectory = path.join(sessionRoot, 'frames');
    let ocrWorker = null;
    await database.run('UPDATE sessions SET processing_status = ?, processing_error = NULL WHERE id = ?', ['processing', sessionId]);
    try {
        await clearDirectory(spinsDirectory);
        await clearDirectory(framesDirectory);
        const videoProbe = await probeVideo(sourceVideoPath);
        const analysisFps = calculateAnalysisFps(videoProbe.durationSeconds);
        await extractFrames(sourceVideoPath, framesDirectory, analysisFps);
        const frameSamples = await buildFrameSamples(framesDirectory, analysisFps);
        if (frameSamples.length === 0) {
            throw new Error('No frames were extracted from the uploaded video');
        }
        const sceneTimes = await detectSceneTimes(sourceVideoPath, analysisFps);
        const segments = buildSegmentsFromMetadata(metadata, videoProbe.durationSeconds, videoProbe.framesPerSecond) ??
            detectSpinSegments(frameSamples, videoProbe.durationSeconds, videoProbe.framesPerSecond, sceneTimes, analysisFps);
        const needsOcr = segments.some((segment) => segment.metadata?.winAmount === undefined || segment.metadata?.bonusTriggered === undefined);
        if (needsOcr) {
            ocrWorker = await createOcrWorker();
        }
        await removeExistingSessionSpins(sessionId);
        for (const segment of segments) {
            const clipFileName = `spin_${String(segment.spinNumber).padStart(3, '0')}.mp4`;
            const clipAbsolutePath = path.join(spinsDirectory, clipFileName);
            const relativeVideoPath = path.posix.join('storage', 'sessions', String(sessionId), 'spins', clipFileName);
            const duration = Math.max(0.2, segment.endSeconds - segment.startSeconds);
            const motionMetadata = segment.metadata?.cascades !== undefined
                ? { cascades: segment.metadata.cascades, cascadeTimes: [] }
                : detectSegmentMotionMetadata(frameSamples, segment);
            const extractedMetadata = segment.metadata?.winAmount !== undefined && segment.metadata?.bonusTriggered !== undefined
                ? {
                    winAmount: segment.metadata.winAmount,
                    bonusTriggered: segment.metadata.bonusTriggered,
                    ocrWinText: '',
                    ocrBonusText: '',
                }
                : ocrWorker
                    ? await extractSpinGameplayMetadata(ocrWorker, frameSamples, segment)
                    : {
                        winAmount: segment.metadata?.winAmount ?? 0,
                        bonusTriggered: segment.metadata?.bonusTriggered ?? false,
                        ocrWinText: '',
                        ocrBonusText: '',
                    };
            await createSpinClip(sourceVideoPath, clipAbsolutePath, segment.startSeconds, duration);
            const spinResult = await database.run(`INSERT INTO spins (session_id, spin_number, win_amount, cascades, bonus_triggered, duration, start_frame, end_frame)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                sessionId,
                segment.spinNumber,
                extractedMetadata.winAmount,
                motionMetadata.cascades,
                extractedMetadata.bonusTriggered ? 1 : 0,
                duration,
                segment.startFrame,
                segment.endFrame,
            ]);
            await database.run('INSERT INTO videos (spin_id, video_path) VALUES (?, ?)', [spinResult.lastID, relativeVideoPath]);
            await database.run('INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)', [spinResult.lastID, 'spin_start', 0]);
            for (const cascadeTime of motionMetadata.cascadeTimes) {
                await database.run('INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)', [spinResult.lastID, 'cascade', cascadeTime]);
            }
            if (extractedMetadata.bonusTriggered) {
                await database.run('INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)', [spinResult.lastID, 'bonus_detected', Math.max(0, duration - 0.2)]);
            }
            await database.run('INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)', [spinResult.lastID, 'spin_end', duration]);
        }
        await database.run(`UPDATE sessions
       SET total_spins = ?, processing_status = ?, processing_error = NULL
       WHERE id = ?`, [segments.length, 'completed', sessionId]);
    }
    catch (error) {
        await database.run('UPDATE sessions SET processing_status = ?, processing_error = ? WHERE id = ?', ['failed', error instanceof Error ? error.message : String(error), sessionId]);
        throw error;
    }
    finally {
        if (ocrWorker) {
            await ocrWorker.terminate().catch(() => undefined);
        }
    }
}
