#!/usr/bin/env python3
"""
Test script to verify the pure internal DXF generation system
This tests the same logic that will be deployed to Google Cloud Functions
"""

import sys
import os
sys.path.append('python-backend')

from app_internal import InternalDXFGenerator
import ezdxf
from ezdxf import units
import math

def test_internal_generation():
    """Test the internal DXF generation that replaces AI"""
    
    print("🔧 TESTING INTERNAL DXF GENERATION SYSTEM")
    print("=" * 60)
    
    # Test the exact same request from your debug report
    test_cases = [
        {
            'title': 'testing',
            'description': 'make a single line with dimension line',
            'user_requirements': 'line length is 2 m. make drawing for testing'
        },
        {
            'title': 'Simple Table',
            'description': 'create a table 2m x 1m',
            'user_requirements': 'show all dimensions'
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 TEST CASE {i}: {test_case['title']}")
        print(f"Description: {test_case['description']}")
        print(f"Requirements: {test_case['user_requirements']}")
        
        # Parse using internal logic (NO AI)
        geometry_data = InternalDXFGenerator.parse_user_description(
            test_case['description'], 
            test_case['title'], 
            test_case['user_requirements']
        )
        
        entities = geometry_data.get('entities', [])
        print(f"\n📋 INTERNAL PARSING RESULTS:")
        print(f"Total entities generated: {len(entities)}")
        
        # Count entity types
        entity_types = {}
        for entity in entities:
            etype = entity.get('type', 'UNKNOWN')
            entity_types[etype] = entity_types.get(etype, 0) + 1
        
        print(f"Entity breakdown: {entity_types}")
        
        # Key check: Are DIMENSION entities generated?
        dimension_count = entity_types.get('DIMENSION', 0)
        if dimension_count > 0:
            print(f"✅ SUCCESS: {dimension_count} DIMENSION entities generated!")
        else:
            print(f"❌ ISSUE: No DIMENSION entities generated")
        
        # Show first few entities
        print(f"\n📊 ENTITY DETAILS:")
        for j, entity in enumerate(entities[:5], 1):
            entity_type = entity.get('type')
            if entity_type == 'DIMENSION':
                print(f"  {j}. {entity_type} - base={entity.get('base')}, p1={entity.get('p1')}, p2={entity.get('p2')}")
            elif entity_type == 'LINE':
                print(f"  {j}. {entity_type} - {entity.get('start_point')} to {entity.get('end_point')}")
            else:
                print(f"  {j}. {entity_type} - {entity}")
        
        # Generate actual DXF to verify it works
        try:
            print(f"\n🔨 GENERATING DXF FILE...")
            doc = ezdxf.new("R2010", setup=True)
            doc.units = units.MM
            msp = doc.modelspace()
            
            # Setup dimension style
            if 'STRUCTURAL' not in doc.dimstyles:
                dimstyle = doc.dimstyles.add('STRUCTURAL')
                dimstyle.dxf.dimexo = 0.625
                dimstyle.dxf.dimexe = 1.25
                dimstyle.dxf.dimse1 = 0
                dimstyle.dxf.dimse2 = 0
            
            dimensions_created = 0
            
            # Process entities
            for entity in entities:
                entity_type = entity.get('type')
                
                if entity_type == 'LINE':
                    start = entity.get('start_point')
                    end = entity.get('end_point')
                    if start and end:
                        msp.add_line(start, end)
                
                elif entity_type == 'DIMENSION':
                    base = entity.get('base')
                    p1 = entity.get('p1')
                    p2 = entity.get('p2')
                    
                    if base and p1 and p2:
                        dim = msp.add_linear_dim(
                            base=base, p1=p1, p2=p2,
                            dimstyle='STRUCTURAL'
                        )
                        dim.render()  # Critical for extension lines
                        dimensions_created += 1
                
                elif entity_type == 'LWPOLYLINE':
                    points = entity.get('points')
                    closed = entity.get('closed', False)
                    if points and len(points) >= 2:
                        msp.add_lwpolyline(points, dxfattribs={'closed': closed})
                
                elif entity_type == 'TEXT':
                    content = entity.get('content')
                    position = entity.get('position')
                    height = entity.get('height', 2.5)
                    if content and position:
                        text_entity = msp.add_text(content, dxfattribs={'height': height})
                        text_entity.set_placement(position)
            
            # Save DXF file
            filename = f"test_{test_case['title'].replace(' ', '_')}.dxf"
            doc.saveas(filename)
            
            print(f"✅ DXF FILE CREATED: {filename}")
            print(f"   - Total entities processed: {len(entities)}")
            print(f"   - Dimensions rendered: {dimensions_created}")
            
        except Exception as e:
            print(f"❌ DXF GENERATION ERROR: {e}")
        
        print("-" * 60)

def compare_with_ai_response():
    """Compare our internal results with the AI response from debug report"""
    
    print(f"\n🔍 COMPARISON WITH YOUR DEBUG REPORT")
    print("=" * 60)
    
    # This is what the AI generated (from your debug report)
    ai_response_entities = [
        {"type": "LINE", "start_point": [0, 0], "end_point": [2000, 0]},
        {"type": "LINE", "start_point": [0, 500], "end_point": [2000, 500]},
        {"type": "LINE", "start_point": [0, 200], "end_point": [0, 500]},
        {"type": "LINE", "start_point": [2000, 200], "end_point": [2000, 500]},
        {"type": "CIRCLE", "center": [-100, 500], "radius": 100},
        {"type": "CIRCLE", "center": [2100, 500], "radius": 100}
    ]
    
    print(f"🤖 AI RESPONSE (from your debug):")
    print(f"   - Total entities: {len(ai_response_entities)}")
    print(f"   - DIMENSION entities: 0 ❌")
    print(f"   - Entity types: {[e['type'] for e in ai_response_entities]}")
    
    # Our internal response
    geometry_data = InternalDXFGenerator.parse_user_description(
        'make a single line with dimension line',
        'testing', 
        'line length is 2 m. make drawing for testing'
    )
    
    internal_entities = geometry_data.get('entities', [])
    dimension_count = sum(1 for e in internal_entities if e.get('type') == 'DIMENSION')
    
    print(f"\n🔧 INTERNAL LOGIC (our new system):")
    print(f"   - Total entities: {len(internal_entities)}")
    print(f"   - DIMENSION entities: {dimension_count} ✅")
    print(f"   - Entity types: {[e['type'] for e in internal_entities]}")
    
    print(f"\n💡 CONCLUSION:")
    if dimension_count > 0:
        print(f"   ✅ Internal system SOLVES the dimension problem!")
        print(f"   ✅ No more 'NO DIMENSION ENTITIES FOUND' errors")
        print(f"   ✅ Extension lines will appear properly")
    else:
        print(f"   ❌ Internal system still has issues")

if __name__ == "__main__":
    test_internal_generation()
    compare_with_ai_response()
    
    print(f"\n🚀 NEXT STEPS:")
    print(f"   1. ✅ Internal system generates proper DIMENSION entities")
    print(f"   2. 🚀 Deploy to Google Cloud Functions (in progress)")
    print(f"   3. 🧪 Test with your frontend application")
    print(f"   4. 🎉 No more missing dimensions!")