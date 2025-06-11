import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import ejs from 'ejs';

export async function renderPdf(type: 'quote' | 'invoice', data: any): Promise<Buffer> {
  let browser;
  
  try {
    // 1) Load template
    const templatePath = path.join(__dirname, '..', 'templates', `${type}.html`);
    const template = await fs.readFile(templatePath, 'utf-8');

    // 2) Render with EJS
    const html = ejs.render(template, data);

    // 3) Launch headless Chrome & generate PDF
    browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '0.75in', 
        bottom: '0.75in', 
        left: '0.75in', 
        right: '0.75in' 
      }
    });
    
    return Buffer.from(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate ${type} PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}