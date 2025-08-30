# Structured Drawing System Documentation

## Overview

The new structured drawing system separates responsibilities between the LLM and the application:
- **LLM**: Provides drawing intelligence (what to draw, where to place it)
- **App**: Generates reliable Python code from structured data

This approach eliminates code generation errors while maintaining AI-powered drawing analysis.

## System Architecture

```
User Input → LLM Analysis → Structured JSON → App Code Generation → Python Code → Local Server → DXF File
```

## 1. LLM Prompt Structure

### Input to LLM
The system sends a comprehensive prompt to the LLM that includes:

```
You are a professional CAD engineer and technical drawing expert. Analyze the following drawing description and provide a complete, detailed drawing specification.

**CRITICAL: You must respond with ONLY a JSON object. NO Python code, NO explanations, NO markdown. Just the JSON specification.**

**DRAWING DESCRIPTION:**
[User's drawing requirements]

**YOUR TASK:**
1. Determine ALL geometric elements needed (lines, circles, arcs, rectangles, etc.)
2. Calculate exact coordinates and dimensions based on engineering standards
3. Specify ALL dimension lines needed to fully document the drawing
4. Determine hatching patterns for materials (if any)
5. Position everything professionally with proper spacing

**REQUIRED OUTPUT FORMAT:**
[JSON structure specification]
```

### Key Prompt Features
- **Role Definition**: Professional CAD engineer
- **Clear Constraints**: JSON only, no code generation
- **Specific Tasks**: Element analysis, coordinate calculation, dimension planning
- **Engineering Standards**: Professional spacing and positioning
- **Output Format**: Strict JSON structure

## 2. Expected JSON Output Structure

### Complete JSON Schema
```json
{
  "title": "Descriptive Drawing Title",
  "scale": 1,
  "units": "mm",
  "drawingSize": {"width": 3000, "height": 2000},
  "elements": [
    {
      "type": "line|circle|arc|rectangle|polyline",
      "coordinates": [[x1, y1], [x2, y2]],
      "properties": {"layer": "CONSTRUCTION", "lineType": "CONTINUOUS"}
    }
  ],
  "dimensions": [
    {
      "type": "linear|aligned|radial|angular",
      "measurePoints": [[x1, y1], [x2, y2]],
      "dimensionLinePosition": [x, y],
      "properties": {
        "layer": "DIMENSIONS",
        "textHeight": 100,
        "arrowSize": 50,
        "label": "auto"
      }
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
      "pattern": "ANSI31",
      "scale": 1.0,
      "angle": 45,
      "properties": {"layer": "HATCHING", "material": "concrete"}
    }
  ],
  "layers": [
    {"name": "CONSTRUCTION", "color": 7, "lineType": "CONTINUOUS"},
    {"name": "DIMENSIONS", "color": 1, "lineType": "CONTINUOUS"},
    {"name": "HATCHING", "color": 2, "lineType": "CONTINUOUS"}
  ]
}
```

### Element Types and Coordinates

#### Line
```json
{
  "type": "line",
  "coordinates": [[startX, startY], [endX, endY]],
  "properties": {"layer": "CONSTRUCTION"}
}
```

#### Circle
```json
{
  "type": "circle",
  "coordinates": [[centerX, centerY], [radius]],
  "properties": {"layer": "CONSTRUCTION"}
}
```

#### Rectangle
```json
{
  "type": "rectangle",
  "coordinates": [[x1, y1], [x2, y2]],
  "properties": {"layer": "CONSTRUCTION"}
}
```

#### Polyline
```json
{
  "type": "polyline",
  "coordinates": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
  "properties": {"layer": "CONSTRUCTION", "closed": true}
}
```

### Dimension Types

#### Linear Dimension
```json
{
  "type": "linear",
  "measurePoints": [[startX, startY], [endX, endY]],
  "dimensionLinePosition": [posX, posY],
  "properties": {"layer": "DIMENSIONS", "textHeight": 100, "arrowSize": 50}
}
```

#### Radial Dimension
```json
{
  "type": "radial",
  "measurePoints": [[centerX, centerY], [pointX, pointY]],
  "dimensionLinePosition": [posX, posY],
  "properties": {"layer": "DIMENSIONS", "textHeight": 100}
}
```

## 3. Data Collection Process

### Step 1: LLM Response Parsing
```typescript
// Extract JSON from LLM response
const jsonMatch = response.match(/\{[\s\S]*\}/);
const jsonStr = jsonMatch[0];
const specification = JSON.parse(jsonStr);
```

### Step 2: Data Validation
```typescript
// Validate and normalize specification
const normalized = {
  title: spec.title || 'Generated Drawing',
  scale: spec.scale || 100,
  units: spec.units || 'mm',
  elements: spec.elements || [],
  dimensions: spec.dimensions || [],
  layers: spec.layers || defaultLayers
};
```

### Step 3: Error Handling
```typescript
// Fallback for parsing errors
if (!specification) {
  return getDefaultSpecification();
}
```

## 4. Code Generation Process

### App Code Generator Structure
```typescript
class DrawingCodeGenerator {
  static generatePythonCode(spec: any): string {
    const code = [
      this.generateImports(),
      this.generateDocumentSetup(),
      this.generateLayers(spec.layers),
      this.generateDimensionStyle(spec),
      this.generateElements(spec.elements),
      this.generateDimensions(spec.dimensions),
      this.generateHatching(spec.hatching),
      this.generateSave(spec.title)
    ];
    return code.join('\n\n');
  }
}
```

### Code Generation Methods

#### 1. Document Setup
```python
# Generated code:
import ezdxf

doc = ezdxf.new("R2010", setup=True)
msp = doc.modelspace()
```

#### 2. Layer Creation
```python
# Generated code:
doc.layers.add(name="CONSTRUCTION", color=7)
doc.layers.add(name="DIMENSIONS", color=1)
doc.layers.add(name="HATCHING", color=2)
```

#### 3. Dimension Style Configuration
```python
# Generated code:
dimstyle = doc.dimstyles.get("Standard")
dimstyle.dxf.dimtxt = 100        # Text height
dimstyle.dxf.dimasz = 50         # Arrow size
dimstyle.dxf.dimexe = 25         # Extension beyond dimension line
dimstyle.dxf.dimexo = 10         # Extension line offset
dimstyle.dxf.dimgap = 10         # Gap around text
dimstyle.dxf.dimclrt = 1         # Text color (red)
dimstyle.dxf.dimclrd = 1         # Dimension line color (red)
dimstyle.dxf.dimclre = 1         # Extension line color (red)
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text
dimstyle.dxf.dimblk = ""         # Use default arrow blocks
dimstyle.dxf.dimblk1 = ""        # First arrow block
dimstyle.dxf.dimblk2 = ""        # Second arrow block
dimstyle.dxf.dimtsz = 0          # Use arrows (not ticks)
```

#### 4. Element Generation
For each element in the specification:

**Line Generation:**
```typescript
// Input: {"type": "line", "coordinates": [[0, 0], [2000, 0]], "properties": {"layer": "CONSTRUCTION"}}
// Output:
'msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})'
```

**Circle Generation:**
```typescript
// Input: {"type": "circle", "coordinates": [[0, 0], [500]], "properties": {"layer": "CONSTRUCTION"}}
// Output:
'msp.add_circle((0, 0), radius=500, dxfattribs={"layer": "CONSTRUCTION"})'
```

#### 5. Dimension Generation
For each dimension in the specification:

**Linear Dimension:**
```typescript
// Input: {"type": "linear", "measurePoints": [[0, 0], [2000, 0]], "dimensionLinePosition": [1000, -200]}
// Output:
'dim1 = msp.add_linear_dim(\n' +
'    base=(1000, -200),\n' +
'    p1=(0, 0),\n' +
'    p2=(2000, 0),\n' +
'    dimstyle="Standard",\n' +
'    text="<>",\n' +
'    dxfattribs={"layer": "DIMENSIONS"}\n' +
')\n' +
'dim1.render()'
```

## 5. Complete Example

### User Input
```
"Create a drawing of a 2m horizontal line with dimension"
```

### LLM Analysis and Output
```json
{
  "title": "2000mm Horizontal Line",
  "scale": 1,
  "units": "mm",
  "elements": [
    {
      "type": "line",
      "coordinates": [[0, 0], [2000, 0]],
      "properties": {"layer": "CONSTRUCTION"}
    }
  ],
  "dimensions": [
    {
      "type": "linear",
      "measurePoints": [[0, 0], [2000, 0]],
      "dimensionLinePosition": [1000, -200],
      "properties": {"layer": "DIMENSIONS", "textHeight": 100, "arrowSize": 50}
    }
  ],
  "layers": [
    {"name": "CONSTRUCTION", "color": 7},
    {"name": "DIMENSIONS", "color": 1}
  ]
}
```

### App-Generated Python Code
```python
import ezdxf

doc = ezdxf.new("R2010", setup=True)
msp = doc.modelspace()

doc.layers.add(name="CONSTRUCTION", color=7)
doc.layers.add(name="DIMENSIONS", color=1)

dimstyle = doc.dimstyles.get("Standard")
dimstyle.dxf.dimtxt = 100
dimstyle.dxf.dimasz = 50
dimstyle.dxf.dimexe = 25
dimstyle.dxf.dimexo = 10
dimstyle.dxf.dimgap = 10
dimstyle.dxf.dimclrt = 1
dimstyle.dxf.dimclrd = 1
dimstyle.dxf.dimclre = 1
dimstyle.dxf.dimtad = 1
dimstyle.dxf.dimjust = 0
dimstyle.dxf.dimblk = ""
dimstyle.dxf.dimblk1 = ""
dimstyle.dxf.dimblk2 = ""
dimstyle.dxf.dimtsz = 0

msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})

dim1 = msp.add_linear_dim(
    base=(1000, -200),
    p1=(0, 0),
    p2=(2000, 0),
    dimstyle="Standard",
    text="<>",
    dxfattribs={"layer": "DIMENSIONS"}
)
dim1.render()

doc.saveas("2000mm_horizontal_line.dxf")
```

## 6. Key Advantages

### Reliability
- **No LLM Code Errors**: App generates all Python code
- **Guaranteed Syntax**: String concatenation prevents template literal issues
- **Proven Methods**: Only tested ezdxf functionality
- **Error Prevention**: No forbidden parameters (dimpost, dimunit, etc.)

### Intelligence
- **Professional Analysis**: LLM determines optimal drawing layout
- **Coordinate Calculation**: Proper positioning and spacing
- **Complete Documentation**: All necessary dimensions included
- **Material Awareness**: Appropriate hatching patterns

### Maintainability
- **Clear Separation**: LLM handles intelligence, app handles code
- **Structured Data**: JSON format is easy to validate and debug
- **Extensible**: Easy to add new element types or features
- **Debuggable**: Clear visibility into each step of the process

## 7. Error Handling

### LLM Response Issues
- **Invalid JSON**: Falls back to default specification
- **Missing Fields**: Fills in with sensible defaults
- **Malformed Data**: Validates and normalizes all inputs

### Code Generation Issues
- **Template Literals**: Eliminated by using string concatenation
- **Syntax Errors**: Prevented by app-controlled code generation
- **Runtime Errors**: Avoided by using only proven ezdxf methods

## 8. Advanced Examples

### Complex Drawing: Rectangle with Concrete Hatching
**User Input:** "Draw a concrete foundation 3m x 1.5m with dimensions and concrete hatching"

**LLM Output:**
```json
{
  "title": "Concrete Foundation 3000x1500",
  "scale": 100,
  "units": "mm",
  "elements": [
    {
      "type": "rectangle",
      "coordinates": [[0, 0], [3000, 1500]],
      "properties": {"layer": "CONSTRUCTION"}
    }
  ],
  "dimensions": [
    {
      "type": "linear",
      "measurePoints": [[0, 0], [3000, 0]],
      "dimensionLinePosition": [1500, -300],
      "properties": {"layer": "DIMENSIONS", "textHeight": 150, "arrowSize": 75}
    },
    {
      "type": "linear",
      "measurePoints": [[0, 0], [0, 1500]],
      "dimensionLinePosition": [-300, 750],
      "properties": {"layer": "DIMENSIONS", "textHeight": 150, "arrowSize": 75}
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[0, 0], [3000, 0], [3000, 1500], [0, 1500]],
      "pattern": "ANSI31",
      "scale": 2.0,
      "angle": 45,
      "properties": {"layer": "HATCHING", "material": "concrete"}
    }
  ],
  "layers": [
    {"name": "CONSTRUCTION", "color": 7},
    {"name": "DIMENSIONS", "color": 1},
    {"name": "HATCHING", "color": 2}
  ]
}
```

### Circular Element: Steel Pipe Cross-Section
**User Input:** "Draw a steel pipe cross-section, outer diameter 200mm, inner diameter 150mm"

**LLM Output:**
```json
{
  "title": "Steel Pipe Cross Section",
  "scale": 1,
  "units": "mm",
  "elements": [
    {
      "type": "circle",
      "coordinates": [[0, 0], [100]],
      "properties": {"layer": "CONSTRUCTION"}
    },
    {
      "type": "circle",
      "coordinates": [[0, 0], [75]],
      "properties": {"layer": "CONSTRUCTION"}
    }
  ],
  "dimensions": [
    {
      "type": "radial",
      "measurePoints": [[0, 0], [100, 0]],
      "dimensionLinePosition": [50, 50],
      "properties": {"layer": "DIMENSIONS", "textHeight": 80}
    },
    {
      "type": "radial",
      "measurePoints": [[0, 0], [75, 0]],
      "dimensionLinePosition": [37, 37],
      "properties": {"layer": "DIMENSIONS", "textHeight": 80}
    }
  ]
}
```

## 9. Debugging and Troubleshooting

### Common LLM Response Issues

#### Issue: LLM Returns Python Code Instead of JSON
**Problem:** LLM ignores instructions and generates Python code
**Solution:** Enhanced prompt with multiple constraints:
```
**CRITICAL REQUIREMENTS:**
1. Respond with ONLY the JSON object
2. NO Python code generation
3. NO explanations or text
4. NO markdown formatting
5. Just the structured JSON specification

**FORBIDDEN:**
- Do NOT generate Python code
- Do NOT include import statements
- Do NOT include ezdxf code
- Do NOT add explanations
```

#### Issue: Invalid JSON Format
**Problem:** LLM returns malformed JSON
**Detection:** JSON.parse() throws error
**Solution:** Regex extraction and validation:
```typescript
const jsonMatch = response.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No JSON found in response');
}
```

#### Issue: Missing Required Fields
**Problem:** JSON lacks essential properties
**Solution:** Validation and defaults:
```typescript
const normalized = {
  title: spec.title || 'Generated Drawing',
  scale: spec.scale || 100,
  units: spec.units || 'mm',
  elements: Array.isArray(spec.elements) ? spec.elements : [],
  dimensions: Array.isArray(spec.dimensions) ? spec.dimensions : []
};
```

### Code Generation Debugging

#### Issue: Template Literal Errors
**Problem:** Build fails with "Unterminated string literal"
**Solution:** Use string concatenation only:
```typescript
// Wrong (causes build errors):
return `msp.add_line((${x1}, ${y1}), (${x2}, ${y2}))`;

// Correct (reliable):
return 'msp.add_line((' + x1 + ', ' + y1 + '), (' + x2 + ', ' + y2 + '))';
```

#### Issue: Missing Dimension Arrows
**Problem:** Dimensions appear without arrows
**Solution:** Proper arrow configuration:
```python
dimstyle.dxf.dimblk = ""         # Use default arrow blocks
dimstyle.dxf.dimblk1 = ""        # First arrow block
dimstyle.dxf.dimblk2 = ""        # Second arrow block
dimstyle.dxf.dimtsz = 0          # Use arrows (not ticks)
```

#### Issue: Invisible Dimension Text
**Problem:** Dimension numbers don't appear
**Solution:** Proper text height and positioning:
```python
dimstyle.dxf.dimtxt = 100        # Text height
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text
```

## 10. System Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│   LLM Analysis   │───▶│ Structured JSON │
│ "2m line with   │    │ - Analyze req.   │    │ {title, elements│
│  dimensions"    │    │ - Calculate pos. │    │  dimensions}    │
└─────────────────┘    │ - Plan layout    │    └─────────────────┘
                       └──────────────────┘             │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DXF Output    │◀───│  Local Server    │◀───│ App Code Gen.   │
│ Professional    │    │ - Execute Python │    │ - Generate code │
│ CAD Drawing     │    │ - Create DXF     │    │ - Ensure syntax │
└─────────────────┘    │ - Convert to PNG │    │ - Add arrows    │
                       └──────────────────┘    └─────────────────┘
```

## 11. Performance Considerations

### LLM Response Time
- **Typical**: 2-5 seconds for simple drawings
- **Complex**: 5-10 seconds for detailed specifications
- **Optimization**: Structured prompts reduce processing time

### Code Generation Speed
- **Instant**: App code generation is immediate
- **Reliable**: No retry loops needed
- **Scalable**: Handles complex drawings efficiently

### Local Server Execution
- **Fast**: Python execution typically under 1 second
- **Reliable**: No network dependencies
- **Professional**: Full ezdxf library access

This structured approach ensures reliable, professional-quality technical drawings while maintaining the intelligence and flexibility of AI-powered analysis.
