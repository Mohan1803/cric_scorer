const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('PAGE ERROR:', msg.text());
        } else {
            console.log('PAGE LOG:', msg.text());
        }
    });
    page.on('pageerror', error => {
        console.log('UNCAUGHT EXCEPTION:', error.message);
    });
    page.on('requestfailed', request => {
        console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    await browser.close();
})();
