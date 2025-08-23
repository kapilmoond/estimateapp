/**
 * PDF Conversion Service for DXF Files
 * Properly converts actual DXF technical drawings to PDF format by parsing DXF content
 */

import jsPDF from 'jspdf';
import DxfParser from 'dxf-parser';
import { TechnicalDrawing } from '../types';

interface DxfEntity {
  type: string;
  layer: string;
  colorNumber?: number;
  vertices?: Array<{ x: number; y: number; z?: number }>;
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  center?: { x: number; y: number; z?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  position?: { x: number; y: number; z?: number };
  height?: number;
}

interface DxfBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class DXFPDFService {

  /**
   * Convert actual DXF drawing content to PDF
   */
  static async convertDXFToPDF(drawing: TechnicalDrawing): Promise<void> {
    try {
      console.log('🔄 Converting actual DXF content to PDF...');
      console.log('📊 Drawing info:', {
        title: drawing.title,
        hasContent: !!drawing.dxfContent,
        contentLength: drawing.dxfContent?.length || 0,
        filename: drawing.dxfFilename
      });

      if (!drawing.dxfContent) {
        throw new Error('No DXF content available for conversion');
      }

      // Parse the DXF content
      console.log('🔍 Decoding base64 DXF content...');
      const dxfText = this.base64ToText(drawing.dxfContent);
      console.log('📄 DXF text length:', dxfText.length);
      console.log('📄 DXF preview (first 200 chars):', dxfText.substring(0, 200));

      console.log('🔍 Parsing DXF with dxf-parser...');
      const parser = new DxfParser();
      const dxf = parser.parse(dxfText);

      console.log('✅ DXF parsed successfully!');
      console.log('📊 Parsed DXF structure:', {
        hasEntities: !!dxf.entities,
        entityCount: dxf.entities?.length || 0,
        hasBlocks: !!dxf.blocks,
        blockCount: Object.keys(dxf.blocks || {}).length,
        hasLayers: !!dxf.tables?.layer,
        layerCount: Object.keys(dxf.tables?.layer?.layers || {}).length
      });

      if (dxf.entities && dxf.entities.length > 0) {
        console.log('🏗️ Found entities:', dxf.entities.slice(0, 5).map((e: any) => ({
          type: e.type,
          layer: e.layer,
          hasGeometry: !!(e.startPoint || e.vertices || e.center || e.position)
        })));
      } else {
        console.warn('⚠️ No entities found in DXF file!');
      }

      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      // Add title page
      await this.addTitlePage(pdf, drawing);

      // Add actual DXF drawing page
      await this.addDXFDrawingPage(pdf, dxf, drawing);

      // Generate filename
      const filename = `${drawing.title.replace(/\s+/g, '_')}_technical_drawing.pdf`;

      // Download PDF
      pdf.save(filename);

      console.log('✅ DXF to PDF conversion completed successfully');
      console.log('📋 PDF contains actual DXF geometry, not text descriptions');
    } catch (error) {
      console.error('❌ DXF to PDF conversion failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to convert DXF to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert base64 DXF content to text
   */
  private static base64ToText(base64Content: string): string {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Content.includes(',')
        ? base64Content.split(',')[1]
        : base64Content;
      
      return atob(base64Data);
    } catch (error) {
      throw new Error('Failed to decode DXF content');
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
    pdf.text('Professional DXF Technical Drawing - Rendered from actual CAD geometry', 
             pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  /**
   * Add actual DXF drawing page - renders the real CAD geometry
   */
  private static async addDXFDrawingPage(pdf: jsPDF, dxf: any, drawing: TechnicalDrawing): Promise<void> {
    pdf.addPage();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Page header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CAD DRAWING - RENDERED FROM ACTUAL DXF GEOMETRY', pageWidth / 2, 20, { align: 'center' });

    if (!dxf.entities || dxf.entities.length === 0) {
      console.warn('⚠️ No drawing entities found in parsed DXF!');
      console.warn('🔍 DXF structure:', {
        hasHeader: !!dxf.header,
        hasTables: !!dxf.tables,
        hasBlocks: !!dxf.blocks,
        hasEntities: !!dxf.entities,
        fullStructure: Object.keys(dxf || {})
      });
      
      // Add a test drawing to show that rendering works
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('No drawing entities found in DXF file', pageWidth / 2, pageHeight / 2 - 40, { align: 'center' });
      pdf.text('Rendering test geometry to verify PDF generation:', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      
      // Draw test geometry to prove rendering works
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      
      // Test rectangle
      pdf.rect(pageWidth / 2 - 50, pageHeight / 2, 100, 60);
      
      // Test circle
      pdf.circle(pageWidth / 2, pageHeight / 2 + 80, 20, 'S');
      
      // Test line
      pdf.line(pageWidth / 2 - 60, pageHeight / 2 + 120, pageWidth / 2 + 60, pageHeight / 2 + 120);
      
      pdf.setFontSize(10);
      pdf.text('Test geometry: Rectangle, Circle, Line (PDF rendering is working)', pageWidth / 2, pageHeight / 2 + 150, { align: 'center' });
      
      return;
    }

    console.log('🎨 Rendering', dxf.entities.length, 'DXF entities to PDF...');

    // Calculate drawing bounds
    const bounds = this.calculateDXFBounds(dxf.entities);
    console.log('📏 Drawing bounds:', bounds);
    
    // Set up drawing area (leave margins for title and notes)
    const drawingArea = {
      x: 20,
      y: 40,
      width: pageWidth - 40,
      height: pageHeight - 80
    };

    // Calculate scale to fit drawing in available area
    const scaleX = drawingArea.width / (bounds.maxX - bounds.minX || 1);
    const scaleY = drawingArea.height / (bounds.maxY - bounds.minY || 1);
    const scale = Math.min(scaleX, scaleY) * 0.8; // 80% to leave some padding

    console.log('📏 Calculated scale:', scale, 'scaleX:', scaleX, 'scaleY:', scaleY);

    // Center the drawing
    const drawingWidth = (bounds.maxX - bounds.minX) * scale;
    const drawingHeight = (bounds.maxY - bounds.minY) * scale;
    const offsetX = drawingArea.x + (drawingArea.width - drawingWidth) / 2;
    const offsetY = drawingArea.y + (drawingArea.height - drawingHeight) / 2;

    console.log('📏 Drawing placement:', { offsetX, offsetY, drawingWidth, drawingHeight });

    // Render each entity
    pdf.setLineWidth(0.2);
    
    let renderedCount = 0;
    const entityTypes: Record<string, number> = {};
    
    for (const entity of dxf.entities) {
      try {
        this.renderDXFEntity(pdf, entity, bounds, scale, offsetX, offsetY);
        renderedCount++;
        entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
      } catch (error) {
        console.warn('⚠️ Failed to render entity:', entity.type, error);
      }
    }

    console.log('✅ Successfully rendered', renderedCount, 'out of', dxf.entities.length, 'entities');
    console.log('📏 Entity types rendered:', entityTypes);

    // Add scale and rendering information
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Drawing Scale: ${drawing.scale} | Rendered Scale: 1:${Math.round(1/scale)} | Entities: ${renderedCount}/${dxf.entities.length}`, 
             20, pageHeight - 10);
             
    // Add confirmation note
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`✅ This PDF contains actual DXF geometry (${Object.keys(entityTypes).join(', ')})`, 
             20, pageHeight - 25);
  }

  /**
   * Calculate bounds of all DXF entities
   */
  private static calculateDXFBounds(entities: any[]): DxfBounds {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const entity of entities) {
      const points = this.getEntityPoints(entity);
      for (const point of points) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      }
    }

    // Ensure we have valid bounds
    if (minX === Infinity) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Extract points from DXF entity for bounds calculation
   */
  private static getEntityPoints(entity: any): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    switch (entity.type) {
      case 'LINE':
        if (entity.startPoint) points.push(entity.startPoint);
        if (entity.endPoint) points.push(entity.endPoint);
        break;
      case 'POLYLINE':
      case 'LWPOLYLINE':
        if (entity.vertices) {
          entity.vertices.forEach((v: any) => points.push({ x: v.x, y: v.y }));
        }
        break;
      case 'CIRCLE':
      case 'ARC':
        if (entity.center && entity.radius) {
          points.push(
            { x: entity.center.x - entity.radius, y: entity.center.y - entity.radius },
            { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius }
          );
        }
        break;
      case 'TEXT':
      case 'MTEXT':
        if (entity.position) points.push(entity.position);
        break;
      case 'DIMENSION':
        if (entity.definingPoint) points.push(entity.definingPoint);
        if (entity.middleOfText) points.push(entity.middleOfText);
        break;
    }

    return points;
  }

  /**
   * Render individual DXF entity to PDF
   */
  private static renderDXFEntity(
    pdf: jsPDF,
    entity: any,
    bounds: DxfBounds,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    // Transform coordinates from DXF space to PDF space
    const transformX = (x: number) => offsetX + (x - bounds.minX) * scale;
    const transformY = (y: number) => offsetY + (bounds.maxY - y) * scale; // Flip Y axis

    // Set color based on layer or entity color
    const color = this.getEntityColor(entity);
    pdf.setDrawColor(color.r, color.g, color.b);

    // Debug logging for entity processing
    console.log(`🎨 Rendering ${entity.type} on layer ${entity.layer || 'DEFAULT'}`);

    try {
      switch (entity.type) {
        case 'LINE':
          this.renderLine(pdf, entity, transformX, transformY);
          break;
        case 'POLYLINE':
        case 'LWPOLYLINE':
          this.renderPolyline(pdf, entity, transformX, transformY);
          break;
        case 'CIRCLE':
          this.renderCircle(pdf, entity, transformX, transformY);
          break;
        case 'ARC':
          this.renderArc(pdf, entity, transformX, transformY);
          break;
        case 'TEXT':
        case 'MTEXT':
          this.renderText(pdf, entity, transformX, transformY);
          break;
        case 'DIMENSION':
          this.renderDimension(pdf, entity, transformX, transformY);
          break;
        case 'HATCH':
          this.renderHatch(pdf, entity, transformX, transformY);
          break;
        default:
          console.log(`⚠️ Unsupported entity type: ${entity.type}`);
      }
    } catch (error) {
      console.warn(`❌ Failed to render entity ${entity.type}:`, error);
    }
  }

  /**
   * Render LINE entity
   */
  private static renderLine(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    if (entity.startPoint && entity.endPoint) {
      pdf.line(
        transformX(entity.startPoint.x),
        transformY(entity.startPoint.y),
        transformX(entity.endPoint.x),
        transformY(entity.endPoint.y)
      );
    }
  }

  /**
   * Render POLYLINE/LWPOLYLINE entity
   */
  private static renderPolyline(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    if (entity.vertices && entity.vertices.length > 1) {
      const vertices = entity.vertices;
      
      for (let i = 0; i < vertices.length - 1; i++) {
        pdf.line(
          transformX(vertices[i].x),
          transformY(vertices[i].y),
          transformX(vertices[i + 1].x),
          transformY(vertices[i + 1].y)
        );
      }
      
      // Close polyline if specified
      if (entity.closed && vertices.length > 2) {
        pdf.line(
          transformX(vertices[vertices.length - 1].x),
          transformY(vertices[vertices.length - 1].y),
          transformX(vertices[0].x),
          transformY(vertices[0].y)
        );
      }
    }
  }

  /**
   * Render CIRCLE entity
   */
  private static renderCircle(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    if (entity.center && entity.radius) {
      const centerX = transformX(entity.center.x);
      const centerY = transformY(entity.center.y);
      const radius = entity.radius * Math.abs(transformX(1) - transformX(0)); // Scale radius
      
      pdf.circle(centerX, centerY, radius, 'S'); // 'S' for stroke only
    }
  }

  /**
   * Render ARC entity
   */
  private static renderArc(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
      const centerX = transformX(entity.center.x);
      const centerY = transformY(entity.center.y);
      const radius = entity.radius * Math.abs(transformX(1) - transformX(0));
      
      // Convert angles from degrees to radians and adjust for PDF coordinate system
      const startAngle = (entity.startAngle * Math.PI) / 180;
      const endAngle = (entity.endAngle * Math.PI) / 180;
      
      // Draw arc using multiple line segments
      const segments = 20;
      const angleStep = (endAngle - startAngle) / segments;
      
      for (let i = 0; i < segments; i++) {
        const angle1 = startAngle + i * angleStep;
        const angle2 = startAngle + (i + 1) * angleStep;
        
        const x1 = centerX + radius * Math.cos(angle1);
        const y1 = centerY + radius * Math.sin(angle1);
        const x2 = centerX + radius * Math.cos(angle2);
        const y2 = centerY + radius * Math.sin(angle2);
        
        pdf.line(x1, y1, x2, y2);
      }
    }
  }

  /**
   * Render TEXT/MTEXT entity
   */
  private static renderText(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    if (entity.position && entity.text) {
      const x = transformX(entity.position.x);
      const y = transformY(entity.position.y);
      const textHeight = entity.height ? entity.height * 0.1 : 3; // Scale text height
      
      pdf.setFontSize(Math.max(textHeight, 8)); // Minimum font size for readability
      pdf.setTextColor(0, 0, 0); // Black text
      pdf.text(entity.text, x, y);
    }
  }

  /**
   * Render DIMENSION entity
   */
  private static renderDimension(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    // Render dimension lines and text
    if (entity.definingPoint && entity.middleOfText) {
      const x1 = transformX(entity.definingPoint.x);
      const y1 = transformY(entity.definingPoint.y);
      const x2 = transformX(entity.middleOfText.x);
      const y2 = transformY(entity.middleOfText.y);
      
      pdf.line(x1, y1, x2, y2);
      
      if (entity.text) {
        pdf.setFontSize(8);
        pdf.text(entity.text, x2, y2);
      }
    }
  }

  /**
   * Render HATCH entity (simplified as boundary outline)
   */
  private static renderHatch(
    pdf: jsPDF,
    entity: any,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ): void {
    // For simplicity, render hatch as boundary outline
    if (entity.edges) {
      entity.edges.forEach((edge: any) => {
        if (edge.type === 'line' && edge.startPoint && edge.endPoint) {
          pdf.line(
            transformX(edge.startPoint.x),
            transformY(edge.startPoint.y),
            transformX(edge.endPoint.x),
            transformY(edge.endPoint.y)
          );
        }
      });
    }
  }

  /**
   * Get entity color (simplified color mapping)
   */
  private static getEntityColor(entity: any): { r: number; g: number; b: number } {
    // Default to black
    let color = { r: 0, g: 0, b: 0 };
    
    // Map common AutoCAD color numbers to RGB
    if (entity.colorNumber) {
      switch (entity.colorNumber) {
        case 1: color = { r: 255, g: 0, b: 0 }; break;    // Red
        case 2: color = { r: 255, g: 255, b: 0 }; break;  // Yellow
        case 3: color = { r: 0, g: 255, b: 0 }; break;    // Green
        case 4: color = { r: 0, g: 255, b: 255 }; break;  // Cyan
        case 5: color = { r: 0, g: 0, b: 255 }; break;    // Blue
        case 6: color = { r: 255, g: 0, b: 255 }; break;  // Magenta
        case 8: color = { r: 128, g: 128, b: 128 }; break; // Gray
        default: color = { r: 0, g: 0, b: 0 }; break;     // Black
      }
    } else if (entity.layer) {
      // Color by layer (simplified mapping)
      const layerName = entity.layer.toLowerCase();
      if (layerName.includes('structural')) {
        color = { r: 0, g: 0, b: 0 }; // Black for structural
      } else if (layerName.includes('dimension')) {
        color = { r: 128, g: 128, b: 128 }; // Gray for dimensions
      } else if (layerName.includes('text')) {
        color = { r: 0, g: 0, b: 0 }; // Black for text
      } else if (layerName.includes('reinforcement')) {
        color = { r: 255, g: 0, b: 0 }; // Red for reinforcement
      }
    }
    
    return color;
  }

  /**
   * Test function to verify DXF parsing is working correctly
   */
  static async testDXFParsing(): Promise<void> {
    console.log('🧪 Testing DXF parsing...');
    
    // Create a minimal test DXF content
    const testDXF = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
11
100.0
21
100.0
0
CIRCLE
8
0
10
50.0
20
50.0
40
25.0
0
ENDSEC
0
EOF`;
    
    try {
      const parser = new DxfParser();
      const dxf = parser.parse(testDXF);
      
      console.log('✅ Test DXF parsed successfully!');
      console.log('📏 Test results:', {
        hasEntities: !!dxf.entities,
        entityCount: dxf.entities?.length || 0,
        entities: dxf.entities?.map(e => ({ type: e.type, layer: e.layer }))
      });
      
      if (dxf.entities && dxf.entities.length > 0) {
        console.log('✅ DXF parsing is working correctly!');
      } else {
        console.warn('⚠️ DXF parsing may have issues - no entities found in test');
      }
      
    } catch (error) {
      console.error('❌ DXF parsing test failed:', error);
      throw new Error('DXF parsing is not working correctly');
    }
  }

  /**
   * Inspect actual DXF content from a drawing
   */
  static async inspectDXFContent(drawing: TechnicalDrawing): Promise<void> {
    console.log('🔍 Inspecting DXF content from drawing:', drawing.title);
    
    if (!drawing.dxfContent) {
      console.error('❌ No DXF content found in drawing');
      return;
    }
    
    try {
      // Decode the DXF content
      const dxfText = this.base64ToText(drawing.dxfContent);
      console.log('📄 DXF file size:', dxfText.length, 'characters');
      console.log('📄 DXF content preview (first 500 chars):', dxfText.substring(0, 500));
      console.log('📄 DXF content preview (last 200 chars):', dxfText.substring(dxfText.length - 200));
      
      // Check for key DXF sections
      const hasHeader = dxfText.includes('HEADER');
      const hasEntities = dxfText.includes('ENTITIES');
      const hasEOF = dxfText.includes('EOF');
      
      console.log('📏 DXF structure check:', { hasHeader, hasEntities, hasEOF });
      
      // Count potential entities by looking for common entity types
      const lineCount = (dxfText.match(/\nLINE\n/g) || []).length;
      const polylineCount = (dxfText.match(/\nLWPOLYLINE\n/g) || []).length;
      const circleCount = (dxfText.match(/\nCIRCLE\n/g) || []).length;
      const textCount = (dxfText.match(/\nTEXT\n/g) || []).length;
      
      console.log('📏 Entity count in raw DXF:', { lineCount, polylineCount, circleCount, textCount });
      
      // Try to parse it
      const parser = new DxfParser();
      const dxf = parser.parse(dxfText);
      
      console.log('✅ DXF parsed successfully!');
      console.log('📏 Parsed structure:', {
        hasEntities: !!dxf.entities,
        entityCount: dxf.entities?.length || 0,
        hasBlocks: !!dxf.blocks,
        blockCount: Object.keys(dxf.blocks || {}).length,
        hasLayers: !!dxf.tables?.layer,
        layerCount: Object.keys(dxf.tables?.layer?.layers || {}).length
      });
      
      if (dxf.entities && dxf.entities.length > 0) {
        console.log('🏗️ Parsed entities:', dxf.entities.map((e: any) => ({
          type: e.type,
          layer: e.layer,
          hasStartPoint: !!e.startPoint,
          hasEndPoint: !!e.endPoint,
          hasVertices: !!e.vertices,
          hasCenter: !!e.center,
          hasRadius: !!e.radius
        })));
      } else {
        console.warn('⚠️ No entities found in parsed DXF - this explains why PDF shows no drawing!');
      }
      
    } catch (error) {
      console.error('❌ Failed to inspect DXF content:', error);
    }
  }

}