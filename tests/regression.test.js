import puppeteer from 'puppeteer';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import path from 'path';
import fs from 'fs';

expect.extend({ toMatchImageSnapshot });

describe('Visual Regression Testing', () => {
    let browser;
    let page;

    // Increase the timeout for the entire test suite
    jest.setTimeout(30000);

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    it('should match the baseline screenshot', async () => {
        try {
            // Set a consistent viewport size
            await page.setViewport({ width: 1920, height: 1080 });

            // Navigate to the page with detailed error logging
            const response = await page.goto('https://localhost/sitrec/?sitch=agua&frame=10', {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });

            if (!response.ok()) {
                console.error(`Page load failed with status: ${response.status()}`);
            }

            // Wait for network to be idle
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Ensure the page is fully rendered
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(resolve);
                    });
                });
            });

            // Take the screenshot with explicit encoding
            const screenshot = await page.screenshot({
                fullPage: true,
                type: 'png',
                encoding: 'binary'
            });

            // Ensure snapshot directory exists
            const snapshotDir = path.join(process.cwd(), '__image_snapshots__');
            if (!fs.existsSync(snapshotDir)) {
                fs.mkdirSync(snapshotDir, { recursive: true });
            }

            // and ensure the custom diff directory exists
            const customDiffDir = path.join(snapshotDir, '__diff_output__')
            if (!fs.existsSync(customDiffDir)) {
                fs.mkdirSync(customDiffDir, { recursive: true });
            }

            const customConfig = {
                customDiffConfig: {
                    threshold: 0.01, // 1% threshold for pixel color difference
                },
                failureThreshold: 0.01, // 1% threshold for image diff percentage
                failureThresholdType: 'percent',
                customSnapshotsDir: snapshotDir,
                customDiffDir: customDiffDir,
                // updateSnapshot: process.env.UPDATE_SNAPSHOT === 'true'
            };

            // Log snapshot configuration
            const screenshotBuffer = Buffer.from(screenshot);

            expect(screenshotBuffer).toMatchImageSnapshot(customConfig);
        } catch (error) {
            console.error('Test failed with error:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    });
});