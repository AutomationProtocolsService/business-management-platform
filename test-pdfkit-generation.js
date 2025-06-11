#!/usr/bin/env node

/**
 * Test script to verify PDFKit PDF generation is working
 * This bypasses authentication to test the core PDF generation functionality
 */

import { PDFService } from './server/services/pdf-service.js';
import fs from 'fs';

async function testPDFGeneration() {
  console.log('Testing PDFKit PDF generation...');
  
  // Test quote PDF generation
  const testQuoteData = {
    id: 1,
    quoteNumber: 'Q-TEST-001',
    issueDate: new Date(),
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    subtotal: 1980.00,
    tax: 198.00,
    total: 2178.00,
    notes: 'Test quote for PDF generation verification',
    terms: 'Standard terms and conditions apply',
    customer: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+44 1234 567890',
      address: '37 Larkfield',
      city: 'Chorley',
      state: 'Lancashire',
      zipCode: 'PR7 5RN'
    },
    project: {
      name: 'Test Project',
      description: 'Test project for PDF generation'
    },
    items: [
      {
        description: 'To supply and install single-phase roller shutter with tubular motor 150NM. Motor to have manual override in case of power failure.',
        quantity: 1,
        unitPrice: 1980.00,
        total: 1980.00
      }
    ]
  };

  try {
    console.log('Generating quote PDF...');
    const quotePdfBuffer = await PDFService.generateQuotePDF(testQuoteData);
    
    if (quotePdfBuffer && quotePdfBuffer.length > 0) {
      fs.writeFileSync('test-quote-pdfkit.pdf', quotePdfBuffer);
      console.log('✅ Quote PDF generated successfully!');
      console.log(`   Size: ${quotePdfBuffer.length} bytes`);
      console.log('   File saved as: test-quote-pdfkit.pdf');
    } else {
      console.log('❌ Quote PDF generation failed - empty buffer');
    }
  } catch (error) {
    console.log('❌ Quote PDF generation failed:', error.message);
  }

  // Test invoice PDF generation
  const testInvoiceData = {
    id: 1,
    invoiceNumber: 'I-TEST-001',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'sent',
    subtotal: 2500.00,
    tax: 250.00,
    total: 2750.00,
    notes: 'Test invoice for PDF generation verification',
    terms: 'Payment due within 30 days',
    customer: {
      name: 'Test Customer Ltd',
      email: 'billing@testcustomer.com',
      phone: '+44 1234 567890',
      address: '123 Business Street',
      city: 'Manchester',
      state: 'Greater Manchester',
      zipCode: 'M1 1AA'
    },
    project: {
      name: 'Test Installation Project',
      description: 'Commercial installation project'
    },
    items: [
      {
        description: 'Professional installation services including site survey, materials, and 2-year warranty coverage',
        quantity: 1,
        unitPrice: 2500.00,
        total: 2500.00
      }
    ]
  };

  try {
    console.log('Generating invoice PDF...');
    const invoicePdfBuffer = await PDFService.generateInvoicePDF(testInvoiceData);
    
    if (invoicePdfBuffer && invoicePdfBuffer.length > 0) {
      fs.writeFileSync('test-invoice-pdfkit.pdf', invoicePdfBuffer);
      console.log('✅ Invoice PDF generated successfully!');
      console.log(`   Size: ${invoicePdfBuffer.length} bytes`);
      console.log('   File saved as: test-invoice-pdfkit.pdf');
    } else {
      console.log('❌ Invoice PDF generation failed - empty buffer');
    }
  } catch (error) {
    console.log('❌ Invoice PDF generation failed:', error.message);
  }

  console.log('\nPDF generation test complete.');
}

testPDFGeneration().catch(console.error);