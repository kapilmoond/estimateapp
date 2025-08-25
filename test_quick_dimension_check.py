#!/usr/bin/env python3
"""
Quick test to verify dimension creation logic before cloud deployment
"""

import sys
import os

# Add the python-backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-backend'))

from app import InternalDXFGenerator
import ezdxf

def test_dimension_creation_quick():
    """Quick test to verify dimension creation"""
    print("🔧 Quick Dimension Creation Test")
    print("=" * 50)
    
    # Simple test case
    title = "Test Building"
    description = "A simple building 6m x 4m"
    user_requirements = "Show dimensions"
    
    # Test internal generation
    geometry_data = InternalDXFGenerator.parse_user_description(description, title, user_requirements)
    entities = geometry_data.get('entities', [])
    
    # Count dimensions
    dimensions = [e for e in entities if e.get('type') == 'DIMENSION']
    
    print(f"📊 Generated {len(entities)} total entities")
    print(f"📐 Generated {len(dimensions)} dimension entities")
    
    if len(dimensions) > 0:
        print("✅ SUCCESS: Internal logic creates DIMENSION entities")
        
        # Show first dimension details
        first_dim = dimensions[0]
        print(f"📋 First dimension details:")
        print(f"   Type: {first_dim.get('type')}")
        print(f"   Dim Type: {first_dim.get('dim_type')}")
        print(f"   Base: {first_dim.get('base')}")
        print(f"   P1: {first_dim.get('p1')}")
        print(f"   P2: {first_dim.get('p2')}")
        print(f"   Layer: {first_dim.get('layer')}")
        
        # Test actual DXF creation
        print("\n🏗️ Testing DXF file creation...")
        
        try:
            doc = ezdxf.new("R2010", setup=True)
            msp = doc.modelspace()
            
            # Simple dimension style
            dimstyle = doc.dimstyles.add('TEST')
            dimstyle.dxf.dimexo = 1.25
            dimstyle.dxf.dimexe = 2.5
            dimstyle.dxf.dimse1 = 0
            dimstyle.dxf.dimse2 = 0
            dimstyle.dxf.dimtxt = 3.5
            
            # Create one dimension
            base = first_dim.get('base')
            p1 = first_dim.get('p1')
            p2 = first_dim.get('p2')
            
            if base and p1 and p2:
                dim = msp.add_linear_dim(
                    base=tuple(base[:2]),
                    p1=tuple(p1[:2]),
                    p2=tuple(p2[:2]),
                    dimstyle='TEST'
                )
                dim.render()
                
                # Save test file
                doc.saveas("test_quick_dim.dxf")
                
                # Verify
                verify_doc = ezdxf.readfile("test_quick_dim.dxf")
                verify_msp = verify_doc.modelspace()
                dim_count = sum(1 for entity in verify_msp if entity.dxftype() == 'DIMENSION')
                
                print(f"✅ DXF created with {dim_count} DIMENSION entities")
                return True
            else:
                print("❌ Invalid dimension data")
                return False
                
        except Exception as e:
            print(f"❌ DXF creation failed: {e}")
            return False
    else:
        print("❌ FAILURE: No dimension entities generated")
        return False

if __name__ == "__main__":
    success = test_dimension_creation_quick()
    print("\n" + "=" * 50)
    if success:
        print("🎉 DIMENSION CREATION IS WORKING LOCALLY!")
        print("   Ready for cloud deployment")
    else:
        print("❌ DIMENSION CREATION IS NOT WORKING")
        print("   Need to debug further")
    print("=" * 50)