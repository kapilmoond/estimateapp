#!/usr/bin/env python3
"""
Simple test Flask app to verify Cloud Run fixes
"""

import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/', methods=['GET'])
def root():
    """Root endpoint for basic connectivity test"""
    return jsonify({
        'message': 'Cloud Run Test Server',
        'status': 'online',
        'port': os.environ.get('PORT', '5000'),
        'host': '0.0.0.0'
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Cloud Run"""
    return jsonify({
        'status': 'healthy',
        'service': 'Cloud Run Test',
        'port': os.environ.get('PORT', '5000')
    }), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting test server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)