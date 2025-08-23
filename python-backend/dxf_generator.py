#!/usr/bin/env python3
"""
Professional DXF Drawing Generator using ezdxf
Replaces SVG system with true CAD-quality DXF files
"""

import ezdxf
from ezdxf import units
from ezdxf.math import Vec3
import json
import sys
import os
import base64
from typing import Dict, List, Any, Tuple
import tempfile
import uuid

class ProfessionalDXFGenerator:
    """Professional DXF drawing generator for construction projects"""
    
    def __init__(self):
        self.doc = None
        self.msp = None
        self.current_layer = "0"
        
    def create_new_drawing(self, title: str, description: str) -> str:
        """Create a new DXF drawing document"""
        # Create new DXF document with R2018 version for maximum compatibility
        self.doc = ezdxf.new('R2018', setup=True)
        self.doc.units = units.M  # Set units to meters for construction
        
        # Get model space
        self.msp = self.doc.modelspace()
        
        # Set up standard layers for construction drawings
        self._setup_construction_layers()
        
        # Add title block and drawing information
        self._add_title_block(title, description)
        
        return "DXF document created successfully"
    
    def _setup_construction_layers(self):
        """Set up standard construction drawing layers"""
        layers = [
            ("DIMENSIONS", 1, "Continuous"),  # Red
            ("TEXT", 2, "Continuous"),        # Yellow  
            ("CENTERLINES", 3, "CENTER"),     # Green
            ("HIDDEN", 4, "HIDDEN"),          # Cyan
            ("CONSTRUCTION", 5, "Continuous"), # Blue
            ("HATCHING", 6, "Continuous"),    # Magenta
            ("GRID", 7, "Continuous"),        # White/Black
            ("STRUCTURAL", 8, "Continuous"),   # Dark Gray
            ("REINFORCEMENT", 9, "Continuous"), # Light Gray
            ("ANNOTATIONS", 10, "Continuous")   # Red
        ]
        
        for name, color, linetype in layers:
            if name not in self.doc.layers:
                layer = self.doc.layers.new(name)
                layer.color = color
                layer.linetype = linetype
    
    def _add_title_block(self, title: str, description: str):
        """Add professional title block to drawing"""
        # Title block dimensions (in drawing units)
        tb_width = 200
        tb_height = 50
        tb_x = 10
        tb_y = 10
        
        # Set layer for title block
        self.current_layer = "TEXT"
        
        # Draw title block border
        self.msp.add_lwpolyline([
            (tb_x, tb_y),
            (tb_x + tb_width, tb_y),
            (tb_x + tb_width, tb_y + tb_height),
            (tb_x, tb_y + tb_height),
            (tb_x, tb_y)
        ], close=True, dxfattribs={'layer': 'CONSTRUCTION'})
        
        # Add title text
        self.msp.add_text(
            title,
            dxfattribs={
                'layer': self.current_layer,
                'height': 8,
                'style': 'Standard'
            }
        ).set_pos((tb_x + 10, tb_y + 35))
        
        # Add description
        self.msp.add_text(
            description,
            dxfattribs={
                'layer': self.current_layer,
                'height': 4,
                'style': 'Standard'
            }
        ).set_pos((tb_x + 10, tb_y + 25))
        
        # Add date and drawing number
        import datetime
        date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        drawing_no = f"DWG-{uuid.uuid4().hex[:8].upper()}"
        
        self.msp.add_text(
            f"Date: {date_str}",
            dxfattribs={
                'layer': self.current_layer,
                'height': 3,
                'style': 'Standard'
            }
        ).set_pos((tb_x + 10, tb_y + 15))
        
        self.msp.add_text(
            f"Drawing No: {drawing_no}",
            dxfattribs={
                'layer': self.current_layer,
                'height': 3,
                'style': 'Standard'
            }
        ).set_pos((tb_x + 10, tb_y + 8))
    
    def add_structural_element(self, element_type: str, specifications: Dict[str, Any]):
        """Add structural elements like beams, columns, foundations"""
        if element_type == "concrete_beam":
            self._draw_concrete_beam(specifications)
        elif element_type == "steel_column":
            self._draw_steel_column(specifications)
        elif element_type == "foundation":
            self._draw_foundation(specifications)
        elif element_type == "wall":
            self._draw_wall(specifications)
        elif element_type == "slab":
            self._draw_slab(specifications)
    
    def _draw_concrete_beam(self, specs: Dict[str, Any]):
        """Draw concrete beam with reinforcement details"""
        # Get dimensions
        length = specs.get('length', 6000)  # mm
        width = specs.get('width', 300)     # mm
        height = specs.get('height', 600)   # mm
        
        # Convert to drawing units (meters)
        length_m = length / 1000
        width_m = width / 1000
        height_m = height / 1000
        
        # Starting position
        x, y = 100, 100
        
        # Draw beam outline (plan view)
        self.current_layer = "STRUCTURAL"
        beam_outline = [
            (x, y),
            (x + length_m, y),
            (x + length_m, y + width_m),
            (x, y + width_m),
            (x, y)
        ]
        
        self.msp.add_lwpolyline(
            beam_outline,
            close=True,
            dxfattribs={'layer': self.current_layer}
        )
        
        # Add reinforcement pattern
        self._add_reinforcement_pattern(x, y, length_m, width_m, specs)
        
        # Add dimensions
        self._add_dimensions(x, y, length_m, width_m, specs)
        
        # Add section view
        self._draw_beam_section(x, y + width_m + 50, width_m, height_m, specs)
    
    def _add_reinforcement_pattern(self, x: float, y: float, length: float, width: float, specs: Dict[str, Any]):
        """Add reinforcement pattern to structural element"""
        self.current_layer = "REINFORCEMENT"
        
        # Main reinforcement bars
        bar_spacing = 0.2  # 200mm spacing
        num_bars = int(length / bar_spacing)
        
        for i in range(num_bars + 1):
            bar_x = x + (i * bar_spacing)
            if bar_x <= x + length:
                # Draw reinforcement bar symbol
                self.msp.add_circle(
                    center=(bar_x, y + width/2),
                    radius=0.01,
                    dxfattribs={'layer': self.current_layer}
                )
    
    def _add_dimensions(self, x: float, y: float, length: float, width: float, specs: Dict[str, Any]):
        """Add professional dimensions to drawing"""
        self.current_layer = "DIMENSIONS"
        
        # Length dimension
        dim_y = y - 0.5
        self.msp.add_linear_dim(
            base=(x, dim_y),
            p1=(x, y),
            p2=(x + length, y),
            dimstyle="Standard",
            dxfattribs={'layer': self.current_layer}
        )
        
        # Width dimension  
        dim_x = x + length + 0.5
        self.msp.add_linear_dim(
            base=(dim_x, y),
            p1=(x + length, y),
            p2=(x + length, y + width),
            dimstyle="Standard",
            dxfattribs={'layer': self.current_layer}
        )
    
    def _draw_beam_section(self, x: float, y: float, width: float, height: float, specs: Dict[str, Any]):
        """Draw beam cross-section view"""
        self.current_layer = "STRUCTURAL"
        
        # Section outline
        section_outline = [
            (x, y),
            (x + width, y),
            (x + width, y + height),
            (x, y + height),
            (x, y)
        ]
        
        self.msp.add_lwpolyline(
            section_outline,
            close=True,
            dxfattribs={'layer': self.current_layer}
        )
        
        # Add section label
        self.msp.add_text(
            "SECTION A-A",
            dxfattribs={
                'layer': 'TEXT',
                'height': 0.05,
                'style': 'Standard'
            }
        ).set_pos((x, y - 0.1))
    
    def save_dxf(self, filename: str = None) -> str:
        """Save DXF file and return file path"""
        if not self.doc:
            raise ValueError("No DXF document created")
        
        if not filename:
            filename = f"drawing_{uuid.uuid4().hex[:8]}.dxf"
        
        # Ensure .dxf extension
        if not filename.endswith('.dxf'):
            filename += '.dxf'
        
        # Save to temporary directory
        temp_dir = tempfile.gettempdir()
        filepath = os.path.join(temp_dir, filename)
        
        try:
            self.doc.saveas(filepath)
            return filepath
        except Exception as e:
            raise Exception(f"Failed to save DXF file: {str(e)}")
    
    def get_dxf_as_base64(self) -> str:
        """Get DXF content as base64 string for web transfer"""
        if not self.doc:
            raise ValueError("No DXF document created")

        # Use StringIO for ezdxf output
        import io
        string_buffer = io.StringIO()
        self.doc.write(string_buffer)
        string_buffer.seek(0)

        # Get content and encode as base64
        dxf_content = string_buffer.getvalue()
        dxf_bytes = dxf_content.encode('utf-8')
        base64_content = base64.b64encode(dxf_bytes).decode('utf-8')

        return base64_content

def generate_construction_drawing(drawing_request: Dict[str, Any]) -> Dict[str, Any]:
    """Main function to generate construction drawing from AI specifications"""
    try:
        generator = ProfessionalDXFGenerator()
        
        # Extract drawing information
        title = drawing_request.get('title', 'Construction Drawing')
        description = drawing_request.get('description', 'Professional construction drawing')
        elements = drawing_request.get('elements', [])
        
        # Create new drawing
        generator.create_new_drawing(title, description)
        
        # Add structural elements
        for element in elements:
            element_type = element.get('type')
            specifications = element.get('specifications', {})
            generator.add_structural_element(element_type, specifications)
        
        # Get DXF as base64 for web transfer
        dxf_base64 = generator.get_dxf_as_base64()
        
        return {
            'success': True,
            'dxf_content': dxf_base64,
            'filename': f"{title.replace(' ', '_')}.dxf",
            'message': 'Professional DXF drawing generated successfully'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to generate DXF drawing'
        }

if __name__ == "__main__":
    # Command line interface for testing
    if len(sys.argv) > 1:
        # Read JSON input from command line
        try:
            drawing_request = json.loads(sys.argv[1])
            result = generate_construction_drawing(drawing_request)
            print(json.dumps(result))
        except json.JSONDecodeError:
            print(json.dumps({
                'success': False,
                'error': 'Invalid JSON input',
                'message': 'Please provide valid JSON drawing request'
            }))
    else:
        # Example usage
        example_request = {
            'title': 'Concrete Beam Detail',
            'description': 'Reinforced concrete beam with dimensions and reinforcement details',
            'elements': [
                {
                    'type': 'concrete_beam',
                    'specifications': {
                        'length': 6000,  # mm
                        'width': 300,    # mm
                        'height': 600,   # mm
                        'reinforcement': '4-T20 + 2-T16'
                    }
                }
            ]
        }
        
        result = generate_construction_drawing(example_request)
        print(json.dumps(result, indent=2))
