import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ffmpegBinary = require('ffmpeg-static');
const defaultSpinButtonSelectors = [
    '[data-testid="spin-button"]',
    '[data-test="spin-button"]',
    'button[aria-label*="spin" i]',
    'button[title*="spin" i]',
    'button[id*="spin" i]',
    '.spin-button',
    '[class*="spin-button"]',
];
const defaultCookieButtonLabels = ['Accept All', 'Accept', 'Allow all', 'I agree', 'Got it'];
function padSpinNumber(spinNumber) {
    return String(spinNumber).padStart(3, '0');
}
export function sanitizePathSegment(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'session';
}
export async function dismissCookieBanners(page) {
    for (const label of defaultCookieButtonLabels) {
        const button = page.getByRole('button', { name: label }).first();
        if (await button.count()) {
            await button.click().catch(() => undefined);
            await page.waitForTimeout(500);
        }
    }
}
export async function resolveGameSurface(page, canvasSelector, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const frames = [page, ...page.frames()];
        for (const frame of frames) {
            try {
                const canvas = frame.locator(canvasSelector).first();
                await canvas.waitFor({ state: 'visible', timeout: 750 });
                return frame;
            }
            catch {
                continue;
            }
        }
        await page.waitForTimeout(500);
    }
    return page;
}
export async function resolveSpinButtonSelector(surface, configuredSelector) {
    if (configuredSelector) {
        await surface.locator(configuredSelector).first().waitFor({ state: 'visible', timeout: 15000 });
        return configuredSelector;
    }
    for (const selector of defaultSpinButtonSelectors) {
        const locator = surface.locator(selector).first();
        if (await locator.count()) {
            try {
                await locator.waitFor({ state: 'visible', timeout: 1000 });
                return selector;
            }
            catch {
                continue;
            }
        }
    }
    throw new Error('Unable to locate a visible spin button. Provide --spin-selector explicitly.');
}
export async function ensureCanvasExists(surface, canvasSelector) {
    await surface.locator(canvasSelector).first().waitFor({ state: 'visible', timeout: 15000 });
}
export async function waitForSpinButtonReady(surface, spinButtonSelector, timeout) {
    await surface.waitForFunction((selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
            return false;
        }
        if (element.matches('[disabled], [aria-disabled="true"]')) {
            return false;
        }
        const ariaDisabled = element.getAttribute('aria-disabled');
        const dataDisabled = element.getAttribute('data-disabled');
        return ariaDisabled !== 'true' && dataDisabled !== 'true';
    }, spinButtonSelector, { timeout });
}
export async function waitForSpinStart(surface, spinButtonSelector, timeout) {
    try {
        await surface.waitForFunction((selector) => {
            const element = document.querySelector(selector);
            if (!(element instanceof HTMLElement)) {
                return false;
            }
            return element.matches('[disabled], [aria-disabled="true"]') || element.getAttribute('data-disabled') === 'true';
        }, spinButtonSelector, { timeout });
        return true;
    }
    catch {
        return false;
    }
}
export async function startCanvasRecording(surface, canvasSelector, fps) {
    await surface.evaluate(async ({ selector, framesPerSecond }) => {
        const canvas = document.querySelector(selector);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas not found for selector: ${selector}`);
        }
        if (window.__spinRecorder && window.__spinRecorder.mediaRecorder.state !== 'inactive') {
            throw new Error('A recording is already in progress');
        }
        const stream = canvas.captureStream(framesPerSecond);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        const chunks = [];
        let resolveStop = () => undefined;
        let rejectStop = () => undefined;
        const stopPromise = new Promise((resolve, reject) => {
            resolveStop = resolve;
            rejectStop = reject;
        });
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        });
        mediaRecorder.addEventListener('error', (event) => {
            rejectStop(event);
        });
        mediaRecorder.addEventListener('stop', async () => {
            try {
                const blob = new Blob(chunks, { type: mimeType });
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(String(reader.result));
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                resolveStop(dataUrl);
            }
            catch (error) {
                rejectStop(error);
            }
        });
        window.__spinRecorder = {
            mediaRecorder,
            stopPromise,
            stream,
        };
        mediaRecorder.start(100);
    }, { selector: canvasSelector, framesPerSecond: fps });
}
export async function stopCanvasRecording(surface) {
    const dataUrl = await surface.evaluate(async () => {
        if (!window.__spinRecorder) {
            throw new Error('No recording is in progress');
        }
        const recorder = window.__spinRecorder;
        recorder.mediaRecorder.stop();
        const result = await recorder.stopPromise;
        recorder.stream.getTracks().forEach((track) => track.stop());
        delete window.__spinRecorder;
        return result;
    });
    const [, base64Payload = ''] = dataUrl.split(',');
    return Buffer.from(base64Payload, 'base64');
}
export async function ensureSessionDirectory(gameName, sessionId) {
    const gameFolder = sanitizePathSegment(gameName);
    const directory = path.resolve(process.cwd(), 'sessions', gameFolder, sessionId);
    await mkdir(directory, { recursive: true });
    return { directory, gameFolder };
}
export async function writeSessionMetadata(directory, metadata) {
    const sessionFilePath = path.join(directory, 'session.json');
    await writeFile(sessionFilePath, JSON.stringify(metadata, null, 2));
}
export async function saveSpinVideo(directory, spinNumber, webmBuffer) {
    const tempWebmPath = path.join(directory, `spin_${padSpinNumber(spinNumber)}.webm`);
    const finalMp4Path = path.join(directory, `spin_${padSpinNumber(spinNumber)}.mp4`);
    await writeFile(tempWebmPath, webmBuffer);
    await convertToMp4(tempWebmPath, finalMp4Path);
    await rm(tempWebmPath, { force: true });
    return path.basename(finalMp4Path);
}
async function convertToMp4(inputPath, outputPath) {
    if (!ffmpegBinary) {
        throw new Error('ffmpeg-static is required to convert recorded WebM files to MP4');
    }
    await new Promise((resolve, reject) => {
        const processHandle = spawn(ffmpegBinary, [
            '-y',
            '-i',
            inputPath,
            '-movflags',
            '+faststart',
            '-pix_fmt',
            'yuv420p',
            '-c:v',
            'libx264',
            outputPath,
        ]);
        let stderr = '';
        processHandle.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        processHandle.on('error', reject);
        processHandle.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`ffmpeg failed with exit code ${code}: ${stderr}`));
        });
    });
}
