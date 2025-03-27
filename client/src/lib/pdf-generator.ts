import { Quote, Invoice, Customer, QuoteItem, InvoiceItem } from "@shared/schema";

// Types for PDF generation
export interface PdfGenerationOptions {
  filename?: string;
  showLogo?: boolean;
  useColor?: boolean;
}

// Template types
export type PdfTemplateType = 'quote' | 'invoice';

// Data for PDF generation
export interface QuotePdfData {
  quote: Quote;
  items: QuoteItem[];
  customer?: Customer | null;
}

export interface InvoicePdfData {
  invoice: Invoice;
  items: InvoiceItem[];
  customer?: Customer | null;
}

export type PdfData = QuotePdfData | InvoicePdfData;

/**
 * Generate a PDF for a quote or invoice
 * This is a client-side wrapper for the server-side PDF generation endpoint
 */
export async function generatePdf(
  type: PdfTemplateType,
  data: PdfData,
  options?: PdfGenerationOptions
): Promise<string> {
  // In a real-world application, this would call the PDF generation API
  // For this demo, we'll use the server's PDF generation endpoint
  
  const endpointUrl = type === 'quote' 
    ? `/api/quotes/${(data as QuotePdfData).quote.id}/pdf`
    : `/api/invoices/${(data as InvoicePdfData).invoice.id}/pdf`;
  
  // Generate a download name
  const documentNumber = type === 'quote' 
    ? (data as QuotePdfData).quote.quoteNumber
    : (data as InvoicePdfData).invoice.invoiceNumber;
  
  const filename = options?.filename || `${type}-${documentNumber}.pdf`;
  
  try {
    // Fetch the PDF from the server
    window.open(endpointUrl, '_blank');
    
    // Return the filename that was used
    return filename;
  } catch (error) {
    console.error(`Error generating ${type} PDF:`, error);
    throw new Error(`Failed to generate ${type} PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send a document via email
 */
export async function emailDocument(
  type: PdfTemplateType,
  id: number,
  emailAddress?: string,
  emailSubject?: string,
  emailBody?: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/${type}s/${id}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailAddress,
        subject: emailSubject,
        body: emailBody
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error emailing ${type}:`, error);
    throw new Error(`Failed to email ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert a quote to an invoice
 */
export async function convertQuoteToInvoice(quoteId: number): Promise<Invoice> {
  try {
    const response = await fetch(`/api/quotes/${quoteId}/convert-to-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error converting quote to invoice:`, error);
    throw new Error(`Failed to convert quote to invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
