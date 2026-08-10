const puppeteer = require('puppeteer');
const fs = require('fs');

async function generateVectorPdf() {
    const args = process.argv.slice(2);
    const targetUrl = args[0];
    const outputPath = args[1];
    const pageSize = args[2] || 'A4';
    const orientation = args[3] || 'portrait';
    const authToken = args[4] || '';

    if (!targetUrl || !outputPath) {
        console.error("Usage: node pdf-generator.js <targetUrl> <outputPath> [pageSize] [orientation] [authToken]");
        process.exit(1);
    }

    let executablePath;
    if (process.platform === 'win32') {
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];
        for (const p of chromePaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                break;
            }
        }
    }

    const launchOptions = {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--enable-font-antialiasing',
            '--force-color-profile=srgb',
            '--disable-web-security',
            '--allow-running-insecure-content'
        ]
    };
    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();
        
        let vpWidth = 794;
        let vpHeight = 1123;
        const normPageSize = pageSize.toUpperCase();
        if (normPageSize === 'LEGAL') {
            vpWidth = 816;
            vpHeight = 1346;
        } else if (normPageSize === 'A3') {
            vpWidth = 1123;
            vpHeight = 1587;
        } else if (normPageSize === 'A5') {
            vpWidth = 559;
            vpHeight = 794;
        }

        if (orientation.toLowerCase() === 'landscape') {
            const temp = vpWidth;
            vpWidth = vpHeight;
            vpHeight = temp;
        }

        await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 2 });

        if (authToken && authToken !== 'null') {
            const bearerToken = authToken.startsWith('Bearer ') ? authToken.substring(7) : authToken;
            await page.setExtraHTTPHeaders({
                'Authorization': `Bearer ${bearerToken}`
            });
            await page.evaluateOnNewDocument((token) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify({ username: 'system_pdf', roles: ['ROLE_ADMIN'] }));
            }, bearerToken);
        }

        const finalUrl = authToken ? `${targetUrl}?token=${encodeURIComponent(authToken.replace(/^Bearer\s+/, ''))}` : targetUrl;
        await page.goto(finalUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for data-print-ready attribute set by ExamPrintView
        await page.waitForSelector('body[data-print-ready="true"]', { timeout: 15000 }).catch(() => {
            console.warn("Timeout waiting for data-print-ready, proceeding with PDF export");
        });

        // Ensure all fonts are completely loaded and purge any editor helper badges
        await page.evaluate(async () => {
            if (document.fonts) {
                await document.fonts.ready;
            }

            // Remove editor helper badges & ignore targets from DOM
            document.querySelectorAll('.nexus-editor-page-divider-badge, [data-html2canvas-ignore="true"], .nexus-drag-handle, .nexus-header-set-code-helper').forEach(el => el.remove());
            
            // Clean up TipTap page break elements
            document.querySelectorAll('.page-break').forEach(el => {
                el.style.border = 'none';
                el.style.height = '0px';
                el.style.margin = '0px';
                el.style.padding = '0px';
                el.style.background = 'none';
                el.setAttribute('data-cleaned', 'true');
            });

            // Inject inline style override to kill ::after content on page break
            const style = document.createElement('style');
            style.innerHTML = `
                .page-break::after, .page-break::before, .nexus-editor-page-divider-badge {
                    display: none !important;
                    content: "" !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    border: none !important;
                }
            `;
            document.head.appendChild(style);

            await new Promise(resolve => setTimeout(resolve, 1500));
        });

        await page.emulateMediaType('screen');

        await page.pdf({
            path: outputPath,
            format: pageSize,
            landscape: orientation.toLowerCase() === 'landscape',
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
            preferCSSPageSize: true
        });

        console.log("[Puppeteer] Vector PDF successfully generated:", outputPath);
    } finally {
        await browser.close();
    }
}

generateVectorPdf().catch(err => {
    console.error("[Puppeteer Error]:", err);
    process.exit(1);
});
