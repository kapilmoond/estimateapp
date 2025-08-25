#!/usr/bin/env python3
"""
Test script to verify app.py imports correctly for Cloud Functions deployment
"""

try:
    print("🔧 Testing app.py import for Cloud Functions deployment...")
    
    # Test importing the Flask app
    from app import app
    print("✅ Successfully imported Flask app from app.py")
    
    # Test that it's a Flask app
    from flask import Flask
    if isinstance(app, Flask):
        print("✅ app is a valid Flask application instance")
    else:
        print("❌ app is not a Flask application instance")
        exit(1)
    
    # Test importing the internal generator
    from app import InternalDXFGenerator
    print("✅ Successfully imported InternalDXFGenerator")
    
    # Test basic functionality
    test_data = InternalDXFGenerator.parse_user_description(
        "A simple building 5m x 3m", 
        "Test Building", 
        "Include dimensions"
    )
    
    entities = test_data.get('entities', [])
    entity_types = {}
    for entity in entities:
        etype = entity.get('type', 'UNKNOWN')
        entity_types[etype] = entity_types.get(etype, 0) + 1
    
    print(f"✅ Test generation successful: {entity_types}")
    
    dimensions = entity_types.get('DIMENSION', 0)
    if dimensions > 0:
        print(f"✅ Dimension generation working: {dimensions} dimensions created")
    else:
        print("⚠️ No dimensions generated in test")
    
    print("\n🎉 ALL IMPORT TESTS PASSED!")
    print("✅ Ready for Cloud Functions deployment")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    exit(1)