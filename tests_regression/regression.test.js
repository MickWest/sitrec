

    import puppeteer from 'puppeteer';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import path from 'path';
import fs from 'fs';

expect.extend({ toMatchImageSnapshot });

// Array of test cases: each object contains a name and its corresponding URL.
const testData = [
    { name: 'agua', url: 'https://localhost/sitrec/?sitch=agua&frame=10' },
    { name: 'gimbal', url: 'https://localhost/sitrec/?sitch=gimbal&frame=10' },
    { name: 'starlink', url: 'https://localhost/sitrec/?custom=https://sitrec.s3.us-west-2.amazonaws.com/99999999/Stalink%20Names/20250218_060544.js' },
    { name: "potomac", url: "https://localhost/sitrec/?custom=https://sitrec.s3.us-west-2.amazonaws.com/99999999/Potomac/20250204_203812.js&frame=10" },
    { name: "orion", url: "https://localhost/sitrec/?custom=https://sitrec.s3.us-west-2.amazonaws.com/99999999/Orion%20in%20Both%20views%20for%20Label%20Check/20250306_175023.js",}
    // Add more objects as needed.
];

describe('Visual Regression Testing', () => {
    let browser;
    let page;

    // Increase the timeout for the entire test suite.
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

    // Iterate through each test data object.
    testData.forEach(({ name, url }) => {
        it(`should match the baseline screenshot for ${name}`, async () => {
            try {
                // Set a consistent viewport size.
                await page.setViewport({ width: 1920, height: 1080 });

                url = url+'&ignoreunload=1';

                // Navigate to the URL with detailed error logging.
                const response = await page.goto(url, {
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 30000
                });

                if (!response.ok()) {
                    console.error(`Page load failed with status: ${response.status()} for URL: ${url}`);
                }

                // Wait for the network to be idle.
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Ensure the page is fully rendered.
                await page.evaluate(() => {
                    return new Promise((resolve) => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(resolve);
                        });
                    });
                });

                // Take the screenshot with explicit encoding.
                const screenshot = await page.screenshot({
                    fullPage: true,
                    type: 'png',
                    encoding: 'binary'
                });

                // Ensure snapshot directory exists.
                const snapshotDir = path.join(process.cwd(), '__image_snapshots__');
                if (!fs.existsSync(snapshotDir)) {
                    fs.mkdirSync(snapshotDir, { recursive: true });
                }

                // Ensure the custom diff directory exists.
                const customDiffDir = path.join(snapshotDir, '__diff_output__');
                if (!fs.existsSync(customDiffDir)) {
                    fs.mkdirSync(customDiffDir, { recursive: true });
                }

                // Use the provided name as part of the snapshot identifier.
                const customConfig = {
                    customSnapshotIdentifier: () => `${name}-snapshot`,
                    customDiffConfig: {
                        threshold: 0.01, // 1% threshold for pixel color difference.
                    },
                    failureThreshold: 0.01, // 1% threshold for image diff percentage.
                    failureThresholdType: 'percent',
                    customSnapshotsDir: snapshotDir,
                    customDiffDir: customDiffDir,
                    // updateSnapshot: process.env.UPDATE_SNAPSHOT === 'true'
                };

                const screenshotBuffer = Buffer.from(screenshot);

                expect(screenshotBuffer).toMatchImageSnapshot(customConfig);
            } catch (error) {
                console.error(`Test for ${name} failed with error:`, error);
                console.error('Stack trace:', error.stack);
                throw error;
            }
        });
    });
});
