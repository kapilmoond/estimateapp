import React, { useState, useEffect } from 'react';

interface DebugData {
  prompt_sent: string;
  ai_response_raw: string;
  ai_response_cleaned: string;
  parsed_data: any;
  backend_logs: string;
  timestamp: string;
}

interface DebugInterfaceProps {
  drawing?: any; // TechnicalDrawing with debugInfo
}

export const DebugInterface: React.FC<DebugInterfaceProps> = ({ drawing }) => {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugSource, setDebugSource] = useState<'drawing' | 'localStorage' | 'none'>('none');

  useEffect(() => {
    loadDebugData();
  }, [drawing]);

  const loadDebugData = () => {
    let data: DebugData | null = null;
    let source: 'drawing' | 'localStorage' | 'none' = 'none';

    // First try to get debug data from the drawing object
    if (drawing && drawing.debugInfo) {
      data = drawing.debugInfo;
      source = 'drawing';
    } else {
      // Try localStorage for the most recent debug data
      const lastSuccess = localStorage.getItem('dxf_debug_last_success');
      const lastError = localStorage.getItem('dxf_debug_last_error');
      
      if (lastSuccess) {
        try {
          data = JSON.parse(lastSuccess);
          source = 'localStorage';
        } catch (e) {
          console.warn('Could not parse debug data from localStorage:', e);
        }
      } else if (lastError) {
        try {
          data = JSON.parse(lastError);
          source = 'localStorage';
        } catch (e) {
          console.warn('Could not parse error debug data from localStorage:', e);
        }
      }
    }

    setDebugData(data);
    setDebugSource(source);
  };

  const formatDebugOutput = (): string => {
    if (!debugData) {
      return 'No debug data available. Generate a drawing to see debug information.';
    }

    const sections = [];

    sections.push('='.repeat(80));
    sections.push('🔍 DXF GENERATION DEBUG REPORT');
    sections.push('='.repeat(80));
    sections.push(`Generated at: ${debugData.timestamp}`);
    sections.push(`Data source: ${debugSource}`);
    sections.push('');

    // 1. Request Payload Section
    sections.push('📤 1. REQUEST PAYLOAD SENT TO BACKEND');
    sections.push('-'.repeat(50));
    if (debugData.prompt_sent) {
      try {
        const parsed = JSON.parse(debugData.prompt_sent);
        sections.push(`Title: ${parsed.title || 'N/A'}`);
        sections.push(`Description: ${parsed.description || 'N/A'}`);
        sections.push(`User Requirements: ${parsed.user_requirements || 'N/A'}`);
      } catch (e) {
        sections.push(debugData.prompt_sent);
      }
    } else {
      sections.push('No request payload data captured');
    }
    sections.push('');

    // 2. AI Response Section (Raw)
    sections.push('🤖 2. RAW AI RESPONSE (FIRST)');
    sections.push('-'.repeat(50));
    if (debugData.ai_response_raw) {
      sections.push(debugData.ai_response_raw);
    } else {
      sections.push('No raw AI response captured');
    }
    sections.push('');

    // 3. AI Response Section (Cleaned)
    sections.push('🧹 3. CLEANED AI RESPONSE (JSON PARSING READY)');
    sections.push('-'.repeat(50));
    if (debugData.ai_response_cleaned) {
      sections.push(debugData.ai_response_cleaned);
    } else {
      sections.push('No cleaned AI response captured');
    }
    sections.push('');

    // 4. Parsed Data Section
    sections.push('📊 4. PARSED GEOMETRY DATA SENT TO EZDXF');
    sections.push('-'.repeat(50));
    if (debugData.parsed_data) {
      sections.push(JSON.stringify(debugData.parsed_data, null, 2));
    } else {
      sections.push('No parsed data captured');
    }
    sections.push('');

    // 5. Backend Processing Section
    sections.push('⚙️ 5. BACKEND PROCESSING LOGS');
    sections.push('-'.repeat(50));
    if (debugData.backend_logs) {
      if (typeof debugData.backend_logs === 'object') {
        sections.push(JSON.stringify(debugData.backend_logs, null, 2));
      } else {
        sections.push(debugData.backend_logs);
      }
    } else {
      sections.push('No backend processing logs captured');
    }
    sections.push('');

    // 6. Analysis Section
    sections.push('🔬 6. DIMENSION ANALYSIS');
    sections.push('-'.repeat(50));
    
    if (debugData.parsed_data && debugData.parsed_data.entities) {
      const entities = debugData.parsed_data.entities;
      const dimensions = entities.filter((e: any) => e.type === 'DIMENSION');
      
      sections.push(`Total entities in AI response: ${entities.length}`);
      sections.push(`Dimension entities found: ${dimensions.length}`);
      
      if (dimensions.length > 0) {
        sections.push('');
        sections.push('Dimension details:');
        dimensions.forEach((dim: any, index: number) => {
          sections.push(`  Dimension ${index + 1}:`);
          sections.push(`    Type: ${dim.dim_type || 'LINEAR'}`);
          sections.push(`    Base: [${dim.base ? dim.base.join(', ') : 'N/A'}]`);
          sections.push(`    P1: [${dim.p1 ? dim.p1.join(', ') : 'N/A'}]`);
          sections.push(`    P2: [${dim.p2 ? dim.p2.join(', ') : 'N/A'}]`);
          sections.push(`    Layer: ${dim.layer || 'N/A'}`);
        });
      } else {
        sections.push('❌ NO DIMENSION ENTITIES FOUND IN AI RESPONSE');
        sections.push('This is likely why dimensions are not appearing in your drawing.');
      }
    } else {
      sections.push('Cannot analyze - no parsed data available');
    }
    sections.push('');

    // 7. Recommendations
    sections.push('💡 7. RECOMMENDATIONS');
    sections.push('-'.repeat(50));
    
    if (debugData.parsed_data && debugData.parsed_data.entities) {
      const dimensions = debugData.parsed_data.entities.filter((e: any) => e.type === 'DIMENSION');
      
      if (dimensions.length === 0) {
        sections.push('❌ ISSUE: AI is not generating DIMENSION entities');
        sections.push('');
        sections.push('Possible solutions:');
        sections.push('1. The AI prompt needs to be more explicit about requiring dimensions');
        sections.push('2. The AI model may need better examples of dimension JSON structure');
        sections.push('3. Consider using a different AI model or provider');
        sections.push('4. Check if the AI is receiving the full prompt with dimension requirements');
      } else {
        sections.push('✅ AI is generating dimension entities correctly');
        sections.push('');
        sections.push('If dimensions still not visible, check:');
        sections.push('1. Backend dimension processing logs above');
        sections.push('2. DXF dimension style configuration');
        sections.push('3. Extension line settings (dimexo, dimexe, dimse1, dimse2)');
        sections.push('4. Whether .render() is being called on dimensions');
      }
    }

    sections.push('');
    sections.push('='.repeat(80));
    sections.push('END DEBUG REPORT');
    sections.push('='.repeat(80));

    return sections.join('\\n');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatDebugOutput());
      alert('Debug information copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formatDebugOutput();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Debug information copied to clipboard!');
    }
  };

  const clearDebugData = () => {
    localStorage.removeItem('dxf_debug_last_success');
    localStorage.removeItem('dxf_debug_last_error');
    setDebugData(null);
    setDebugSource('none');
  };

  return (
    <div className="debug-interface" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            padding: '8px 16px',
            backgroundColor: showDebug ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showDebug ? '🔒 Hide Debug Info' : '🔍 Show Debug Info'}
        </button>
        
        <button
          onClick={loadDebugData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Debug Data
        </button>
        
        <button
          onClick={copyToClipboard}
          disabled={!debugData}
          style={{
            padding: '8px 16px',
            backgroundColor: debugData ? '#ffc107' : '#6c757d',
            color: debugData ? 'black' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: debugData ? 'pointer' : 'not-allowed'
          }}
        >
          📋 Copy Debug Info
        </button>
        
        <button
          onClick={clearDebugData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Debug Data
        </button>
      </div>

      {debugData && (
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
          Debug data available from: {debugSource} | Generated: {debugData.timestamp}
        </div>
      )}

      {showDebug && (
        <div>
          <h4>🔍 LLM Response & Backend Processing Debug Information</h4>
          <textarea
            value={formatDebugOutput()}
            readOnly
            style={{
              width: '100%',
              height: '600px',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa'
            }}
          />
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            <p><strong>Instructions:</strong></p>
            <p>1. Generate a drawing to populate debug information</p>
            <p>2. Use "Copy Debug Info" to copy the complete report</p>
            <p>3. Review the "DIMENSION ANALYSIS" section to see if AI is generating dimensions</p>
            <p>4. Check "BACKEND PROCESSING LOGS" for ezdxf dimension creation details</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInterface;