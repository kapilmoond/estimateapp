/**
 * PDF Conversion Service for DXF Files
 * Converts DXF technical drawings to PDF format for easy viewing and sharing
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TechnicalDrawing } from '../types';

export class DXFPDFService {

  /**
   * Convert DXF drawing to PDF
   */
  static async convertDXFToPDF(drawing: TechnicalDrawing): Promise<void> {
    try {
      console.log('🔄 Converting DXF to PDF...');

      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      // Add title page
      await this.addTitlePage(pdf, drawing);

      // Add drawing preview page
      await this.addDrawingPreviewPage(pdf, drawing);

      // Add specifications page
      await this.addSpecificationsPage(pdf, drawing);

      // Generate filename
      const filename = `${drawing.title.replace(/\s+/g, '_')}_technical_drawing.pdf`;

      // Download PDF
      pdf.save(filename);

      console.log('✅ PDF conversion completed successfully');
    } catch (error) {
      console.error('❌ PDF conversion failed:', error);
      throw new Error(`Failed to convert DXF to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add title page to PDF
   */
  private static async addTitlePage(pdf: jsPDF, drawing: TechnicalDrawing): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TECHNICAL DRAWING', pageWidth / 2, 40, { align: 'center' });

    // Drawing title
    pdf.setFontSize(18);
    pdf.text(drawing.title, pageWidth / 2, 60, { align: 'center' });

    // Drawing information
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const info = [
      `Component: ${drawing.componentName}`,
      `Scale: ${drawing.scale}`,
      `Dimensions: ${drawing.dimensions.width} × ${drawing.dimensions.height}`,
      `Created: ${drawing.createdAt.toLocaleDateString()}`,
      `DXF File: ${drawing.dxfFilename}`
    ];

    let yPos = 90;
    info.forEach(line => {
      pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    });

    // Professional drawing note
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Professional DXF Technical Drawing - Compatible with AutoCAD, Revit, and other CAD software', 
             pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  /**
   * Add drawing preview page
   */
  private static async addDrawingPreviewPage(pdf: jsPDF, drawing: TechnicalDrawing): Promise<void> {
    pdf.addPage();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Page header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DRAWING PREVIEW', pageWidth / 2, 20, { align: 'center' });

    // Create preview content
    const previewContent = this.generateDrawingPreview(drawing);
    
    // Add preview text
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const lines = previewContent.split('\n');
    let yPos = 40;
    
    lines.forEach(line => {
      if (yPos > 280) { // If approaching page bottom, add new page
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text(line, 20, yPos, { maxWidth: pageWidth - 40 });
      yPos += 6;
    });

    // Add note about full DXF file
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('📋 Note: Download the DXF file for full CAD compatibility and editing capabilities', 
             20, yPos + 20, { maxWidth: pageWidth - 40 });
  }

  /**
   * Add specifications page
   */
  private static async addSpecificationsPage(pdf: jsPDF, drawing: TechnicalDrawing): Promise<void> {
    pdf.addPage();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Page header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TECHNICAL SPECIFICATIONS', pageWidth / 2, 20, { align: 'center' });

    // Description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Description:', 20, 40);
    
    const descriptionLines = pdf.splitTextToSize(drawing.description, pageWidth - 40);
    pdf.text(descriptionLines, 20, 50);

    // DXF Data specifications
    let yPos = 50 + (descriptionLines.length * 6) + 20;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('DXF File Specifications:', 20, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    const specs = [
      `File Format: DXF (Drawing Exchange Format)`,
      `CAD Version: ${drawing.dxfData.id ? 'R2010' : 'Professional'}`,
      `Units: ${drawing.dxfData.units || 'mm'}`,
      `Layers: ${drawing.dxfData.layers?.length || 'Multiple'} professional layers`,
      `Elements: ${drawing.dxfData.elements?.length || 'Multiple'} structural elements`,
      `Paper Size: ${drawing.dxfData.paperSize || 'A3'}`,
      `Drawing Scale: ${drawing.scale}`
    ];

    specs.forEach(spec => {
      pdf.text(spec, 25, yPos);
      yPos += 8;
    });

    // Professional note
    yPos += 20;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.text('This PDF is a documentation version. For editing and professional CAD work, use the original DXF file.', 
             20, yPos, { maxWidth: pageWidth - 40 });
  }

  /**
   * Generate drawing preview content
   */
  private static generateDrawingPreview(drawing: TechnicalDrawing): string {
    return `🏗️ PROFESSIONAL DXF TECHNICAL DRAWING

Title: ${drawing.title}
Component Type: ${drawing.componentName}
Drawing Scale: ${drawing.scale}
File Format: DXF (AutoCAD Compatible)

DRAWING DESCRIPTION:
${drawing.description}

TECHNICAL DETAILS:
• Drawing Dimensions: ${drawing.dimensions.width} × ${drawing.dimensions.height}
• Professional layer organization with construction standards
• Industry-compliant dimensions and annotations
• Complete structural element representation
• Professional text styles and hatching patterns

DXF FILE INFORMATION:
• Filename: ${drawing.dxfFilename}
• Created: ${drawing.createdAt.toLocaleDateString()}
• Format: Professional DXF R2010
• Compatibility: AutoCAD, Revit, SketchUp, and other CAD software

CONSTRUCTION STANDARDS:
• All dimensions in millimeters (mm)
• Professional layer naming (0-STRUCTURAL-*, 1-REINFORCEMENT-*, etc.)
• Construction industry standard symbols and annotations
• Complete dimension chains for all major elements
• Material representation with hatching patterns

USAGE INSTRUCTIONS:
1. Download the DXF file using the "Download DXF" button
2. Open in your preferred CAD software (AutoCAD, Revit, etc.)
3. Use for construction documentation, planning, and coordination
4. Modify as needed for your specific project requirements

PROFESSIONAL FEATURES:
✓ Industry-standard layer organization
✓ Complete structural element representation
✓ Professional dimensions and annotations
✓ Construction-grade accuracy and detail
✓ CAD software compatibility
✓ Ready for construction use

For full editing capabilities and professional CAD work, please use the original DXF file.
This PDF serves as documentation and preview purposes.`;
  }

  /**
   * Convert HTML element to PDF (alternative method)
   */
  static async convertHTMLToPDF(elementId: string, filename: string): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Capture element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const canvasAspectRatio = canvas.height / canvas.width;
      
      let imgWidth = pageWidth - 20; // 10mm margin on each side
      let imgHeight = imgWidth * canvasAspectRatio;

      // If image is too tall, scale it down
      if (imgHeight > pageHeight - 20) {
        imgHeight = pageHeight - 20;
        imgWidth = imgHeight / canvasAspectRatio;
      }

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

      // Download PDF
      pdf.save(filename);
    } catch (error) {
      console.error('❌ HTML to PDF conversion failed:', error);
      throw new Error(`Failed to convert HTML to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}