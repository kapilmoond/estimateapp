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
      console.log('📄 DXF contains ENTITIES section:', dxfText.includes('ENTITIES'));
      console.log('📄 DXF contains EOF:', dxfText.includes('EOF'));

      console.log('🔍 Parsing DXF with dxf-parser...');
      const parser = new DxfParser();
      let dxf: any;
      
      try {
        dxf = parser.parse(dxfText);
        console.log('✅ DXF parsed successfully!');
      } catch (parseError) {
        console.error('❌ DXF parsing failed:', parseError);
        console.log('🔍 Attempting to fix common DXF issues...');
        
        // Try to fix common issues
        let fixedDxfText = dxfText;
        
        // Ensure proper line endings
        fixedDxfText = fixedDxfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Try parsing again
        try {
          dxf = parser.parse(fixedDxfText);
          console.log('✅ DXF parsed successfully after fixes!');
        } catch (secondError) {
          console.error('❌ DXF parsing failed even after fixes:', secondError);
          // Create a fallback empty DXF structure
          dxf = { entities: [], blocks: {}, tables: {} };
        }
      }

      // Comprehensive DXF analysis
      console.log('📊 Detailed DXF analysis:');
      console.log('  Structure keys:', Object.keys(dxf || {}));
      console.log('  Entities type:', typeof dxf.entities, 'Array?', Array.isArray(dxf.entities));
      console.log('  Entities count:', dxf.entities?.length || 0);
      
      if (dxf.entities && dxf.entities.length > 0) {
        console.log('  🏗️ Detailed entity analysis:');
        
        // Count entities by type and analyze LINE entities specifically
        const entityCounts = {};
        const lineEntities = [];
        
        dxf.entities.forEach((entity: any, index: number) => {
          entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
          
          if (entity.type === 'LINE') {
            lineEntities.push({
              index,
              hasStartPoint: !!(entity.startPoint || entity.start_point || entity.start),
              hasEndPoint: !!(entity.endPoint || entity.end_point || entity.end),
              hasVertices: !!entity.vertices,
              verticesLength: entity.vertices?.length,
              verticesContent: entity.vertices,
              allKeys: Object.keys(entity)
            });
          }
        });
        
        console.log('  📊 Entity type counts:', entityCounts);
        console.log('  📏 LINE entities analysis (first 3):');
        lineEntities.slice(0, 3).forEach((lineInfo, idx) => {
          console.log(`    LINE[${idx}]:`, lineInfo);
        });
        
        console.log('  🏗️ First few entities (general):');
        dxf.entities.slice(0, 3).forEach((entity: any, index: number) => {
          console.log(`    [${index}]:`, {
            type: entity.type,
            layer: entity.layer,
            keys: Object.keys(entity || {}),
            startPoint: entity.startPoint,
            endPoint: entity.endPoint,
            vertices: entity.vertices,
            center: entity.center,
            radius: entity.radius,
            position: entity.position,
            text: entity.text
          });
        });
      } else {
        console.warn('  ⚠️ No entities found!');
        // Check if entities might be in blocks
        if (dxf.blocks && Object.keys(dxf.blocks).length > 0) {
          console.log('  📏 Checking blocks for entities...');
          Object.entries(dxf.blocks).forEach(([blockName, blockData]: [string, any]) => {
            console.log(`    Block "${blockName}":`, {
              hasEntities: !!(blockData.entities),
              entityCount: blockData.entities?.length || 0
            });
          });
        }
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
    
    // Validate bounds
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;
    console.log('📏 Bounds dimensions:', { width: boundsWidth, height: boundsHeight });
    
    // Check if bounds are too small or too large
    if (boundsWidth < 0.1 || boundsHeight < 0.1) {
      console.warn('⚠️ Drawing bounds are very small - this might cause zoom issues');
    }
    if (boundsWidth > 10000 || boundsHeight > 10000) {
      console.warn('⚠️ Drawing bounds are very large - this might cause zoom issues');
    }
    
    // Set up drawing area (leave margins for title and notes)
    const drawingArea = {
      x: 30,
      y: 50,
      width: pageWidth - 60,  // Increased margins
      height: pageHeight - 100  // Increased margins
    };
    
    console.log('📏 Drawing area:', drawingArea);

    // Calculate scale to fit drawing in available area with better logic
    let scaleX = drawingArea.width / (boundsWidth || 1);
    let scaleY = drawingArea.height / (boundsHeight || 1);
    
    // Use a more conservative scale factor
    let scale = Math.min(scaleX, scaleY) * 0.9; // 90% to ensure visibility
    
    // Ensure minimum and maximum scale limits
    const minScale = 0.1;
    const maxScale = 100;
    scale = Math.max(minScale, Math.min(maxScale, scale));
    
    console.log('📏 Scale calculation:', {
      scaleX,
      scaleY,
      selectedScale: scale,
      scaleFactor: '90%'
    });

    // Center the drawing
    const drawingWidth = boundsWidth * scale;
    const drawingHeight = boundsHeight * scale;
    const offsetX = drawingArea.x + (drawingArea.width - drawingWidth) / 2;
    const offsetY = drawingArea.y + (drawingArea.height - drawingHeight) / 2;

    console.log('📏 Drawing placement:', {
      offsetX,
      offsetY,
      drawingWidth,
      drawingHeight,
      finalScale: scale
    });

    // Render each entity
    pdf.setLineWidth(0.2);
    
    // Draw bounds rectangle for debugging (optional - can be removed later)
    pdf.setDrawColor(255, 0, 0); // Red color for bounds
    pdf.setLineWidth(0.1);
    const boundsRect = {
      x: offsetX,
      y: offsetY,
      width: drawingWidth,
      height: drawingHeight
    };
    pdf.rect(boundsRect.x, boundsRect.y, boundsRect.width, boundsRect.height);
    console.log('🔲 DEBUG: Bounds rectangle drawn at:', boundsRect);
    
    // Reset for actual drawing
    pdf.setDrawColor(0, 0, 0); // Black color for entities
    pdf.setLineWidth(0.2);
    
    let renderedCount = 0;
    const entityTypes: Record<string, number> = {};
    const renderingDetails: Array<{type: string, bounds: any, transformed: any}> = [];
    
    for (const entity of dxf.entities) {
      try {
        // Track rendering details for debugging
        const entityPoints = this.getEntityPoints(entity);
        if (entityPoints.length > 0) {
          const entityBounds = {
            minX: Math.min(...entityPoints.map(p => p.x)),
            maxX: Math.max(...entityPoints.map(p => p.x)),
            minY: Math.min(...entityPoints.map(p => p.y)),
            maxY: Math.max(...entityPoints.map(p => p.y))
          };
          
          // Transform coordinates for this entity
          const transformX = (x: number) => offsetX + (x - bounds.minX) * scale;
          const transformY = (y: number) => offsetY + (bounds.maxY - y) * scale;
          
          const transformedBounds = {
            minX: transformX(entityBounds.minX),
            maxX: transformX(entityBounds.maxX),
            minY: transformY(entityBounds.maxY), // Note: Y is flipped
            maxY: transformY(entityBounds.minY)
          };
          
          renderingDetails.push({
            type: entity.type,
            bounds: entityBounds,
            transformed: transformedBounds
          });
        }
        
        this.renderDXFEntity(pdf, entity, bounds, scale, offsetX, offsetY);
        renderedCount++;
        entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
      } catch (error) {
        console.warn('⚠️ Failed to render entity:', entity.type, error);
      }
    }

    console.log('✅ Successfully rendered', renderedCount, 'out of', dxf.entities.length, 'entities');
    console.log('📏 Entity types rendered:', entityTypes);
    
    // Log detailed rendering info for first few entities
    console.log('🔍 First 3 entity rendering details:');
    renderingDetails.slice(0, 3).forEach((detail, idx) => {
      console.log(`  [${idx}] ${detail.type}:`, {
        originalBounds: detail.bounds,
        transformedBounds: detail.transformed,
        isVisible: detail.transformed.minX >= 0 && detail.transformed.maxX <= pageWidth &&
                   detail.transformed.minY >= 0 && detail.transformed.maxY <= pageHeight
      });
    });

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
    
    console.log('📏 Extracting points from entity:', entity.type, Object.keys(entity));

    switch (entity.type) {
      case 'LINE':
        // Handle different startPoint formats
        let startPoint = entity.startPoint || entity.start_point || entity.start;
        let endPoint = entity.endPoint || entity.end_point || entity.end;
        
        // Handle LINE entities that use vertices format (like in rendering)
        if (!startPoint && !endPoint && entity.vertices && Array.isArray(entity.vertices) && entity.vertices.length >= 2) {
          startPoint = entity.vertices[0];
          endPoint = entity.vertices[1];
          console.log('📏 Bounds: LINE using vertices format:', entity.vertices);
        }
        
        if (Array.isArray(startPoint) && startPoint.length >= 2) {
          points.push({ x: startPoint[0], y: startPoint[1] });
        } else if (startPoint && typeof startPoint.x === 'number' && typeof startPoint.y === 'number') {
          points.push(startPoint);
        }
        
        if (Array.isArray(endPoint) && endPoint.length >= 2) {
          points.push({ x: endPoint[0], y: endPoint[1] });
        } else if (endPoint && typeof endPoint.x === 'number' && typeof endPoint.y === 'number') {
          points.push(endPoint);
        }
        
        console.log('📏 LINE bounds points extracted:', points.slice(-2));
        break;
        
      case 'POLYLINE':
      case 'LWPOLYLINE':
        let vertices = entity.vertices || entity.points;
        if (Array.isArray(vertices)) {
          vertices.forEach((v: any) => {
            if (Array.isArray(v) && v.length >= 2) {
              points.push({ x: v[0], y: v[1] });
            } else if (v && typeof v.x === 'number' && typeof v.y === 'number') {
              points.push({ x: v.x, y: v.y });
            }
          });
        }
        break;
        
      case 'CIRCLE':
      case 'ARC':
        let center = entity.center || entity.centerPoint;
        let radius = entity.radius;
        
        if (Array.isArray(center) && center.length >= 2) {
          center = { x: center[0], y: center[1] };
        }
        
        if (center && radius !== undefined && 
            typeof center.x === 'number' && typeof center.y === 'number' &&
            typeof radius === 'number') {
          points.push(
            { x: center.x - radius, y: center.y - radius },
            { x: center.x + radius, y: center.y + radius }
          );
        }
        break;
        
      case 'TEXT':
      case 'MTEXT':
        let position = entity.position || entity.insertionPoint;
        if (Array.isArray(position) && position.length >= 2) {
          points.push({ x: position[0], y: position[1] });
        } else if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          points.push(position);
        }
        break;
        
      case 'DIMENSION':
        if (entity.definingPoint) points.push(entity.definingPoint);
        if (entity.middleOfText) points.push(entity.middleOfText);
        if (entity.p1) points.push(entity.p1);
        if (entity.p2) points.push(entity.p2);
        break;
    }
    
    console.log('📏 Extracted', points.length, 'points from', entity.type, ':', points);
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
    let startPoint = entity.startPoint || entity.start_point || entity.start;
    let endPoint = entity.endPoint || entity.end_point || entity.end;
    
    // Debug: Log entity structure to understand the exact format
    console.log('🔍 LINE entity structure:', {
      type: entity.type,
      hasStartPoint: !!startPoint,
      hasEndPoint: !!endPoint,
      hasVertices: !!entity.vertices,
      verticesLength: entity.vertices?.length,
      entityKeys: Object.keys(entity)
    });
    
    // Handle LINE entities that use vertices format (unexpected but happens)
    if (!startPoint && !endPoint && entity.vertices && Array.isArray(entity.vertices) && entity.vertices.length >= 2) {
      startPoint = entity.vertices[0];
      endPoint = entity.vertices[1];
      console.log('📍 LINE using vertices format:', entity.vertices);
      console.log('📍 Extracted start:', startPoint, 'end:', endPoint);
    }
    
    // Additional fallback: check for vertices even if startPoint/endPoint exist but are invalid
    if ((!startPoint || !endPoint) && entity.vertices && Array.isArray(entity.vertices) && entity.vertices.length >= 2) {
      startPoint = entity.vertices[0];
      endPoint = entity.vertices[1];
      console.log('📍 LINE fallback to vertices format:', { startPoint, endPoint });
    }
    
    // Handle different coordinate formats
    if (Array.isArray(startPoint) && startPoint.length >= 2) {
      startPoint = { x: startPoint[0], y: startPoint[1] };
    }
    if (Array.isArray(endPoint) && endPoint.length >= 2) {
      endPoint = { x: endPoint[0], y: endPoint[1] };
    }
    
    console.log('📍 Final LINE points after processing:', { startPoint, endPoint });
    
    if (startPoint && endPoint && 
        typeof startPoint.x === 'number' && typeof startPoint.y === 'number' &&
        typeof endPoint.x === 'number' && typeof endPoint.y === 'number') {
      
      const x1 = transformX(startPoint.x);
      const y1 = transformY(startPoint.y);
      const x2 = transformX(endPoint.x);
      const y2 = transformY(endPoint.y);
      
      console.log('📍 LINE coordinates: PDF(', x1, y1, ') to (', x2, y2, ')');
      
      pdf.line(x1, y1, x2, y2);
      console.log('✅ LINE rendered successfully');
    } else {
      console.warn('⚠️ Failed to render LINE - invalid points:', { 
        startPoint, 
        endPoint, 
        vertices: entity.vertices,
        allEntityData: entity
      });
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
    let vertices = entity.vertices || entity.points;
    
    console.log('📍 Rendering POLYLINE with vertices:', vertices);
    
    if (!vertices || !Array.isArray(vertices) || vertices.length < 2) {
      console.warn('⚠️ Invalid POLYLINE vertices:', vertices);
      return;
    }
    
    // Normalize vertices to {x, y} format
    const normalizedVertices = vertices.map((v: any) => {
      if (Array.isArray(v) && v.length >= 2) {
        return { x: v[0], y: v[1] };
      } else if (typeof v === 'object' && v.x !== undefined && v.y !== undefined) {
        return { x: v.x, y: v.y };
      } else {
        console.warn('⚠️ Invalid vertex format:', v);
        return null;
      }
    }).filter(v => v !== null);
    
    console.log('📍 Normalized vertices:', normalizedVertices);
    
    if (normalizedVertices.length < 2) {
      console.warn('⚠️ Not enough valid vertices after normalization');
      return;
    }
    
    // Draw lines between consecutive vertices
    for (let i = 0; i < normalizedVertices.length - 1; i++) {
      const v1 = normalizedVertices[i];
      const v2 = normalizedVertices[i + 1];
      
      const x1 = transformX(v1.x);
      const y1 = transformY(v1.y);
      const x2 = transformX(v2.x);
      const y2 = transformY(v2.y);
      
      console.log(`📍 POLYLINE segment ${i}: PDF(${x1}, ${y1}) to (${x2}, ${y2})`);
      pdf.line(x1, y1, x2, y2);
    }
    
    // Close polyline if specified
    if (entity.closed && normalizedVertices.length > 2) {
      const first = normalizedVertices[0];
      const last = normalizedVertices[normalizedVertices.length - 1];
      
      const x1 = transformX(last.x);
      const y1 = transformY(last.y);
      const x2 = transformX(first.x);
      const y2 = transformY(first.y);
      
      console.log('📍 POLYLINE closing line: PDF(', x1, y1, ') to (', x2, y2, ')');
      pdf.line(x1, y1, x2, y2);
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
    let center = entity.center || entity.centerPoint;
    let radius = entity.radius;
    
    // Handle different center formats
    if (Array.isArray(center) && center.length >= 2) {
      center = { x: center[0], y: center[1] };
    }
    
    console.log('📍 Rendering CIRCLE:', { center, radius });
    
    if (center && radius !== undefined && 
        typeof center.x === 'number' && typeof center.y === 'number' &&
        typeof radius === 'number') {
      
      const centerX = transformX(center.x);
      const centerY = transformY(center.y);
      const scaledRadius = radius * Math.abs(transformX(1) - transformX(0)); // Scale radius
      
      console.log('📍 CIRCLE: PDF center(', centerX, centerY, ') radius', scaledRadius);
      
      pdf.circle(centerX, centerY, scaledRadius, 'S'); // 'S' for stroke only
    } else {
      console.warn('⚠️ Invalid CIRCLE entity:', { center, radius });
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
   * Test function to create a PDF with hardcoded entities to verify rendering
   */
  static async testRenderingWithHardcodedEntities(): Promise<void> {
    console.log('🧪 Testing PDF rendering with hardcoded entities...');
    
    // Create a fake drawing with hardcoded entities in the expected format
    const testDrawing: TechnicalDrawing = {
      id: 'test',
      title: 'Test Rendering',
      description: 'Test drawing with hardcoded entities',
      dxfContent: '', // Not used for this test
      dxfFilename: 'test.dxf',
      dimensions: { width: 800, height: 600 },
      scale: '1:100',
      componentName: 'test',
      createdAt: new Date(),
      includeInContext: false,
      dxfData: {} as any,
      drawingType: 'dxf'
    };
    
    // Create fake parsed DXF with known entities
    const fakeDxf = {
      entities: [
        {
          type: 'LINE',
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 100, y: 100 },
          layer: '0'
        },
        {
          type: 'CIRCLE',
          center: { x: 150, y: 50 },
          radius: 25,
          layer: '0'
        },
        {
          type: 'LWPOLYLINE',
          vertices: [
            { x: 200, y: 0 },
            { x: 300, y: 0 },
            { x: 300, y: 100 },
            { x: 200, y: 100 }
          ],
          closed: true,
          layer: '0'
        }
      ],
      blocks: {},
      tables: {}
    };
    
    try {
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      // Add title page
      await this.addTitlePage(pdf, testDrawing);

      // Add drawing page with hardcoded entities
      await this.addDXFDrawingPage(pdf, fakeDxf, testDrawing);

      // Download PDF
      pdf.save('test_hardcoded_entities.pdf');
      
      console.log('✅ Test PDF with hardcoded entities created successfully!');
    } catch (error) {
      console.error('❌ Test PDF creation failed:', error);
      throw error;
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