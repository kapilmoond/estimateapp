import requests
import json

# Test the enhanced dimension prompt
backend_url = "https://dxf-generator-nrkslkdoza-uc.a.run.app"

# Simple test request
test_payload = {
    "title": "Test Table with Dimensions",
    "description": "A simple rectangular table 2000mm x 1000mm with legs at corners. Must show ALL dimensions clearly.",
    "user_requirements": "Include dimensions for table length, width, and leg positions"
}

print("🧪 Testing enhanced dimension prompt...")
print(f"Backend URL: {backend_url}")
print(f"Test payload: {json.dumps(test_payload, indent=2)}")

try:
    # Call the API
    response = requests.post(
        f"{backend_url}/parse-ai-drawing",
        json=test_payload,
        timeout=60
    )
    
    print(f"\n✅ Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result.get('success', 'Unknown')}")
        
        # Check if DXF was generated
        if 'dxf_content' in result:
            print("✅ DXF content generated successfully")
            
            # Now check debug data for DIMENSION entities
            debug_url = f"{backend_url}/get-debug-info"
            debug_response = requests.get(debug_url)
            
            if debug_response.status_code == 200:
                debug_data = debug_response.json()
                print(f"\n📊 Debug Analysis:")
                
                # Check parsed data for dimensions
                parsed_data = debug_data.get('parsed_data', {})
                entities = parsed_data.get('entities', [])
                
                dimension_count = sum(1 for entity in entities if entity.get('type') == 'DIMENSION')
                total_entities = len(entities)
                
                print(f"Total entities: {total_entities}")
                print(f"DIMENSION entities: {dimension_count}")
                
                if dimension_count > 0:
                    print("🎉 SUCCESS: AI is now generating DIMENSION entities!")
                    
                    # Show dimension details
                    dimensions = [e for e in entities if e.get('type') == 'DIMENSION']
                    for i, dim in enumerate(dimensions, 1):
                        print(f"  Dimension {i}: base={dim.get('base')}, p1={dim.get('p1')}, p2={dim.get('p2')}")
                else:
                    print("❌ ISSUE: AI still not generating DIMENSION entities")
                    
                    # Show what entities are being generated
                    entity_types = {}
                    for entity in entities:
                        entity_type = entity.get('type', 'UNKNOWN')
                        entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
                    
                    print("Generated entity types:")
                    for etype, count in entity_types.items():
                        print(f"  {etype}: {count}")
                        
            else:
                print(f"❌ Debug endpoint failed: {debug_response.status_code}")
        else:
            print(f"❌ No DXF content in response: {result}")
    else:
        print(f"❌ API call failed: {response.status_code}")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"❌ Error during test: {str(e)}")

print("\n" + "="*60)
print("Test completed. Check the results above to see if DIMENSION entities are now being generated.")