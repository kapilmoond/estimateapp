#!/usr/bin/env python3
"""
Inspect the generated DXF file to verify dimension entities
"""

import ezdxf

def inspect_dxf_file(filename):
    """Inspect a DXF file to see what entities are present"""
    
    print(f"🔍 Inspecting DXF file: {filename}")
    
    try:
        # Load the DXF file
        doc = ezdxf.readfile(filename)
        msp = doc.modelspace()
        
        # Count entities by type
        entity_count = {}
        dimension_entities = []
        
        for entity in msp:
            entity_type = entity.dxftype()
            entity_count[entity_type] = entity_count.get(entity_type, 0) + 1
            
            if entity_type == 'DIMENSION':
                dimension_entities.append(entity)
        
        print(f"\n📊 Entity Summary:")
        for entity_type, count in sorted(entity_count.items()):
            print(f"  {entity_type}: {count}")
        
        print(f"\n📐 Dimension Details:")
        if dimension_entities:
            print(f"Found {len(dimension_entities)} DIMENSION entities:")
            for i, dim in enumerate(dimension_entities, 1):
                print(f"  Dimension {i}:")
                print(f"    Type: {dim.dxf.dimtype if hasattr(dim.dxf, 'dimtype') else 'Unknown'}")
                print(f"    Layer: {dim.dxf.layer}")
                print(f"    Style: {dim.dxf.dimstyle if hasattr(dim.dxf, 'dimstyle') else 'Unknown'}")
                
                # Try to get dimension points
                if hasattr(dim.dxf, 'defpoint'):
                    print(f"    Base point: {dim.dxf.defpoint}")
                if hasattr(dim.dxf, 'defpoint2'):
                    print(f"    Point 1: {dim.dxf.defpoint2}")
                if hasattr(dim.dxf, 'defpoint3'):
                    print(f"    Point 2: {dim.dxf.defpoint3}")
                    
                print()
        else:
            print("❌ No DIMENSION entities found in the file!")
        
        dimension_found = len(dimension_entities) > 0
        
        # Check blocks for dimension geometry
        print(f"\n🧱 Block Summary:")
        try:
            if doc.blocks:
                for block_name in doc.blocks.names():
                    if block_name.startswith('*D') or 'DIM' in block_name.upper():
                        block = doc.blocks[block_name]
                        entities_in_block = list(block)
                        if entities_in_block:
                            print(f"  {block_name}: {len(entities_in_block)} entities")
                            block_entity_types = {}
                            for entity in entities_in_block:
                                etype = entity.dxftype()
                                block_entity_types[etype] = block_entity_types.get(etype, 0) + 1
                            print(f"    Contains: {block_entity_types}")
        except Exception as e:
            print(f"  ⚠️ Block inspection error: {e}")
        
        return dimension_found
        
    except Exception as e:
        print(f"🔴 Error inspecting DXF file: {e}")
        return False

if __name__ == "__main__":
    success = inspect_dxf_file("test_dimensions.dxf")
    print(f"\n{'='*60}")
    if success:
        print("✅ DXF file contains DIMENSION entities!")
    else:
        print("❌ DXF file does not contain DIMENSION entities!")
    print(f"{'='*60}")