#!/usr/bin/env python3
"""
Test script to verify dimension creation in DXF generation
"""

import sys
import os

# Add the python-backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-backend'))

from app import InternalDXFGenerator
import ezdxf
from ezdxf import units
import math

def test_dimension_creation():
    """Test the dimension creation functionality directly"""
    
    print("🧪 Testing dimension creation functionality...")
    
    # Test 1: Generate a simple table with dimensions
    print("\n=== TEST 1: Simple Table with Dimensions ===")
    
    title = "Test Table"
    description = "A rectangular table 2000mm x 1000mm"
    user_requirements = "Include length and width dimensions"
    
    # Parse the description
    geometry_data = InternalDXFGenerator.parse_user_description(description, title, user_requirements)
    
    entities = geometry_data.get('entities', [])
    print(f"Generated {len(entities)} entities:")
    
    entity_types = {}
    dimensions_found = 0
    
    for entity in entities:
        entity_type = entity.get('type', 'UNKNOWN')
        entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
        
        if entity_type == 'DIMENSION':
            dimensions_found += 1
            print(f"  📐 DIMENSION: base={entity.get('base')}, p1={entity.get('p1')}, p2={entity.get('p2')}")
    
    print(f"Entity types: {entity_types}")
    print(f"Dimensions found: {dimensions_found}")
    
    if dimensions_found > 0:
        print("✅ SUCCESS: Dimension entities are being generated!")
    else:
        print("❌ FAILURE: No dimension entities found!")
        return False
    
    # Test 2: Create actual DXF file
    print("\n=== TEST 2: Create DXF File with Dimensions ===")
    
    try:
        # Create DXF document
        doc = ezdxf.new("R2010", setup=True)
        doc.units = units.MM
        msp = doc.modelspace()
        
        # Setup dimension style
        if 'STRUCTURAL' in doc.dimstyles:
            del doc.dimstyles['STRUCTURAL']
            
        dimstyle = doc.dimstyles.add('STRUCTURAL')
        dimstyle.dxf.dimexo = 1.25
        dimstyle.dxf.dimexe = 2.5
        dimstyle.dxf.dimse1 = 0
        dimstyle.dxf.dimse2 = 0
        dimstyle.dxf.dimtxt = 3.5
        dimstyle.dxf.dimgap = 1.0
        dimstyle.dxf.dimtad = 1
        dimstyle.dxf.dimasz = 3.0
        dimstyle.dxf.dimblk = "_ARCHTICK"
        
        # Create layers
        layers = {
            "0-STRUCTURAL": {"color": 1},
            "2-DIMENSIONS-LINEAR": {"color": 256}
        }
        
        for layer_name, props in layers.items():
            if layer_name not in doc.layers:
                layer = doc.layers.add(layer_name)
                layer.color = props["color"]
        
        dimensions_created = 0
        
        # Process entities
        for entity in entities:
            entity_type = entity.get('type')
            layer = entity.get('layer', '0')
            
            if entity_type == 'LWPOLYLINE':
                points = entity.get('points')
                closed = entity.get('closed', False)
                if points:
                    msp.add_lwpolyline(points, dxfattribs={'layer': layer, 'closed': closed})
                    print(f"  ✅ Created LWPOLYLINE with {len(points)} points")
            
            elif entity_type == 'DIMENSION':
                base = entity.get('base')
                p1 = entity.get('p1')
                p2 = entity.get('p2')
                
                if base and p1 and p2:
                    try:
                        # Convert to tuples
                        base_point = tuple(base[:2])
                        point1 = tuple(p1[:2])
                        point2 = tuple(p2[:2])
                        
                        distance = math.sqrt((point2[0] - point1[0])**2 + (point2[1] - point1[1])**2)
                        
                        print(f"  📐 Creating dimension: {distance:.0f}mm")
                        print(f"     Base: {base_point}, P1: {point1}, P2: {point2}")
                        
                        # Create dimension
                        dim = msp.add_linear_dim(
                            base=base_point,
                            p1=point1,
                            p2=point2,
                            dimstyle='STRUCTURAL',
                            dxfattribs={'layer': layer}
                        )
                        
                        # Render the dimension
                        dim.render()
                        
                        # Verify creation
                        if hasattr(dim, 'get_geometry_block'):
                            geom_block = dim.get_geometry_block()
                            if geom_block:
                                block_entities = list(geom_block)
                                print(f"     ✅ Dimension rendered: {len(block_entities)} entities in block")
                                dimensions_created += 1
                            else:
                                print(f"     ⚠️ Dimension created but no geometry block")
                        else:
                            print(f"     ⚠️ Dimension created but no get_geometry_block method")
                            dimensions_created += 1
                        
                    except Exception as e:
                        print(f"     🔴 Error creating dimension: {e}")
        
        print(f"\n📊 RESULTS:")
        print(f"Dimensions attempted: {dimensions_found}")
        print(f"Dimensions successfully created: {dimensions_created}")
        
        # Save test DXF file
        output_file = "test_dimensions.dxf"
        doc.saveas(output_file)
        print(f"✅ Test DXF file saved as: {output_file}")
        
        if dimensions_created > 0:
            print("🎉 SUCCESS: Dimensions are being created and rendered!")
            return True
        else:
            print("❌ FAILURE: Dimensions are not being rendered in DXF!")
            return False
        
    except Exception as e:
        print(f"🔴 ERROR during DXF creation: {e}")
        return False

if __name__ == "__main__":
    success = test_dimension_creation()
    print(f"\n{'='*60}")
    if success:
        print("🎉 DIMENSION CREATION TEST PASSED!")
    else:
        print("❌ DIMENSION CREATION TEST FAILED!")
    print(f"{'='*60}")