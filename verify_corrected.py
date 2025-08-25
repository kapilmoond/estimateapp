#!/usr/bin/env python3
import ezdxf

# Verify the corrected DXF file
doc = ezdxf.readfile('test_line_1m_corrected.dxf')
msp = doc.modelspace()

entities = list(msp)
print(f"Total entities: {len(entities)}")

for entity in entities:
    entity_type = entity.dxftype()
    layer = getattr(entity.dxf, 'layer', 'Unknown')
    print(f"  {entity_type} on layer '{layer}'")

dimensions = [e for e in entities if e.dxftype() == 'DIMENSION']
texts = [e for e in entities if e.dxftype() == 'TEXT']

print(f"\n✅ Dimensions: {len(dimensions)}")
print(f"✅ Text entities: {len(texts)}")

if len(dimensions) > 0 and len(texts) > 0:
    print("\n🎉 SUCCESS: Both dimensions and text are present and working!")
else:
    print("\n❌ ISSUE: Missing dimensions or text")