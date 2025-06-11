import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function renderPdf(type: 'quote' | 'invoice', data: any): Promise<Buffer> {
  let browser;
  
  try {
    console.log(`🔄 Starting PDF generation for ${type}...`);
    
    // 1) Load template
    const templatePath = path.join(__dirname, '..', 'templates', `${type}.html`);
    console.log(`📂 Template path: ${templatePath}`);
    
    const template = await fs.readFile(templatePath, 'utf-8');
    console.log(`✅ Template loaded successfully (${template.length} characters)`);

    // 2) Render with EJS
    console.log(`🔧 Rendering template with data:`, JSON.stringify(data, null, 2));
    const html = ejs.render(template, data);
    console.log(`✅ HTML rendered successfully (${html.length} characters)`);

    // 3) Launch headless Chrome & generate PDF
    console.log(`🚀 Launching Puppeteer browser...`);
    browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    console.log(`✅ Browser launched successfully`);
    
    const page = await browser.newPage();
    console.log(`📄 Setting page content...`);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log(`✅ Page content set successfully`);
    
    console.log(`🖨️ Generating PDF...`);
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
    console.log(`✅ PDF generated successfully (${pdf.length} bytes)`);
    
    return Buffer.from(pdf);
  } catch (error) {
    console.error('❌ PDF render failed:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to generate ${type} PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      console.log(`🧹 Closing browser...`);
      await browser.close();
    }
  }
}