import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function printCurrentReport(containerId = "report-root") {
  try {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with ID "${containerId}" not found`);
    }

    // Add print mode class to hide navigation and improve styling
    element.classList.add("print-mode");
    
    // Wait a bit for any animations to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the element as canvas with high quality
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      removeContainer: false,
      logging: false,
      height: element.scrollHeight,
      width: element.scrollWidth
    });

    // Remove print mode class
    element.classList.remove("print-mode");

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/png");

    // Calculate PDF dimensions (A4 ratio but scaled to fit content)
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Use A4 format but scale to fit content
    const a4Width = 210; // mm
    const a4Height = 297; // mm
    
    let pdfWidth = a4Width;
    let pdfHeight = (imgHeight * a4Width) / imgWidth;
    
    // If height exceeds A4, use landscape or multiple pages
    if (pdfHeight > a4Height) {
      pdfWidth = a4Height; // landscape
      pdfHeight = (imgHeight * a4Height) / imgWidth;
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Report-${timestamp}.pdf`;

    // Save the PDF
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}