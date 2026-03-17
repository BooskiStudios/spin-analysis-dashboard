import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { dismissCookieBanners, ensureCanvasExists, ensureSessionDirectory, resolveGameSurface, resolveSpinButtonSelector, saveSpinVideo, startCanvasRecording, stopCanvasRecording, waitForSpinButtonReady, waitForSpinStart, writeSessionMetadata, } from './lib/recorder.js';
function getArgumentValue(argumentsList, flagName) {
    const index = argumentsList.indexOf(flagName);
    if (index === -1) {
        return undefined;
    }
    return argumentsList[index + 1];
}
function parseBoolean(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    return value.toLowerCase() === 'true';
}
function parseNumber(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}
async function loadConfigFile(filePath) {
    if (!filePath) {
        return {};
    }
    const fileContents = await readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
}
async function resolveConfig() {
    const argumentsList = process.argv.slice(2);
    const configFilePath = getArgumentValue(argumentsList, '--config');
    const fileConfig = await loadConfigFile(configFilePath);
    const url = getArgumentValue(argumentsList, '--url') ?? fileConfig.url;
    if (!url) {
        throw new Error('A game URL is required. Pass --url or use --config.');
    }
    return {
        url,
        gameName: getArgumentValue(argumentsList, '--game-name') ?? fileConfig.gameName,
        sessionId: getArgumentValue(argumentsList, '--session-id') ?? fileConfig.sessionId,
        totalSpins: parseNumber(getArgumentValue(argumentsList, '--spins'), fileConfig.totalSpins ?? 500),
        headless: parseBoolean(getArgumentValue(argumentsList, '--headless'), fileConfig.headless ?? false),
        spinButtonSelector: getArgumentValue(argumentsList, '--spin-selector') ?? fileConfig.spinButtonSelector,
        canvasSelector: getArgumentValue(argumentsList, '--canvas-selector') ?? fileConfig.canvasSelector ?? 'canvas',
        readyTimeoutMs: parseNumber(getArgumentValue(argumentsList, '--ready-timeout-ms'), fileConfig.readyTimeoutMs ?? 15000),
        spinStartTimeoutMs: parseNumber(getArgumentValue(argumentsList, '--spin-start-timeout-ms'), fileConfig.spinStartTimeoutMs ?? 5000),
        spinFinishTimeoutMs: parseNumber(getArgumentValue(argumentsList, '--spin-finish-timeout-ms'), fileConfig.spinFinishTimeoutMs ?? 30000),
        fallbackSpinDurationMs: parseNumber(getArgumentValue(argumentsList, '--fallback-spin-duration-ms'), fileConfig.fallbackSpinDurationMs ?? 2500),
        recordingFps: parseNumber(getArgumentValue(argumentsList, '--fps'), fileConfig.recordingFps ?? 30),
    };
}
function buildSessionId() {
    return `session-${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}`;
}
async function main() {
    const config = await resolveConfig();
    console.log(`Opening ${config.url}`);
    const browser = await chromium.launch({ headless: config.headless });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
        await page.goto(config.url, { waitUntil: 'domcontentloaded' });
        await dismissCookieBanners(page);
        console.log('Cookie banner handling complete');
        const gameSurface = await resolveGameSurface(page, config.canvasSelector, config.readyTimeoutMs);
        console.log('Game surface resolved');
        const spinButtonSelector = await resolveSpinButtonSelector(gameSurface, config.spinButtonSelector);
        await ensureCanvasExists(gameSurface, config.canvasSelector);
        await waitForSpinButtonReady(gameSurface, spinButtonSelector, config.readyTimeoutMs);
        console.log(`Spin control ready: ${spinButtonSelector}`);
        const pageTitle = await page.title();
        const gameName = config.gameName ?? pageTitle ?? new URL(config.url).hostname;
        const sessionId = config.sessionId ?? buildSessionId();
        const { directory } = await ensureSessionDirectory(gameName, sessionId);
        console.log(`Recording session to ${directory}`);
        const metadata = {
            sessionId,
            gameName,
            startTime: new Date().toISOString(),
            totalSpins: 0,
            spins: [],
        };
        await writeSessionMetadata(directory, metadata);
        for (let spinNumber = 1; spinNumber <= config.totalSpins; spinNumber += 1) {
            const timestamp = new Date().toISOString();
            console.log(`Starting spin ${spinNumber}/${config.totalSpins}`);
            await waitForSpinButtonReady(gameSurface, spinButtonSelector, config.readyTimeoutMs);
            await startCanvasRecording(gameSurface, config.canvasSelector, config.recordingFps);
            await gameSurface.locator(spinButtonSelector).first().click();
            const spinStarted = await waitForSpinStart(gameSurface, spinButtonSelector, config.spinStartTimeoutMs);
            if (spinStarted) {
                await waitForSpinButtonReady(gameSurface, spinButtonSelector, config.spinFinishTimeoutMs);
            }
            else {
                await page.waitForTimeout(config.fallbackSpinDurationMs);
                await waitForSpinButtonReady(gameSurface, spinButtonSelector, config.readyTimeoutMs);
            }
            const videoBuffer = await stopCanvasRecording(gameSurface);
            const videoFile = await saveSpinVideo(directory, spinNumber, videoBuffer);
            metadata.spins.push({
                spinNumber,
                videoFile,
                timestamp,
            });
            metadata.totalSpins = metadata.spins.length;
            await writeSessionMetadata(directory, metadata);
            console.log(`Recorded spin ${spinNumber}/${config.totalSpins}: ${videoFile}`);
        }
        console.log(`Session complete: ${directory}`);
    }
    finally {
        await context.close();
        await browser.close();
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
