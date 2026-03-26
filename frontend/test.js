import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 5000 });
  const content = await page.content();
  console.log('CONTENT HTML:', content.substring(0, 1000));
  const rootContent = await page.$eval('#root', el => el.innerHTML);
  console.log('ROOT CONTENT:', rootContent);
} catch(e) {
  console.log('Nav error:', e.message);
}
await browser.close();
