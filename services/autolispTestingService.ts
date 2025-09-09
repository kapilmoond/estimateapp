/**
 * AutoLISP Testing Service
 * Comprehensive testing of AutoLISP generation and translation
 */

import { AutoLispDrawingGenerator } from './autolispDrawingGenerator';
import { AutoLispToPythonTranslator } from './autolispToPythonTranslator';
import { DrawingSettings } from './drawingSettingsService';

export interface TestCase {
  id: number;
  name: string;
  requirements: string;
  expectedFeatures: string[];
}

export interface TestResult {
  testCase: TestCase;
  autolispCode: string;
  pythonCode: string;
  translationSuccess: boolean;
  errors: string[];
  warnings: string[];
  validationResults: {
    hasDrawingCommands: boolean;
    hasLayers: boolean;
    hasDimensions: boolean;
    hasText: boolean;
    syntaxValid: boolean;
  };
}

export class AutoLispTestingService {
  
  /**
   * Run comprehensive AutoLISP testing suite
   */
  static async runComprehensiveTests(): Promise<TestResult[]> {
    const testCases = this.getTestCases();
    const results: TestResult[] = [];
    
    console.log('🧪 Starting comprehensive AutoLISP testing suite...');
    console.log(`📋 Running ${testCases.length} test cases`);
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Test ${testCase.id}: ${testCase.name}`);
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      if (result.translationSuccess) {
        console.log(`✅ Test ${testCase.id} PASSED`);
      } else {
        console.log(`❌ Test ${testCase.id} FAILED`);
        console.log(`Errors: ${result.errors.join(', ')}`);
      }
    }
    
    this.printTestSummary(results);
    return results;
  }
  
  /**
   * Run a single test case
   */
  private static async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const settings: DrawingSettings = {
      scale: '1:100',
      textHeight: 250,
      dimensionTextHeight: 200,
      lineColor: 7,
      textColor: 7,
      dimensionColor: 5,
      paperSize: 'A3',
      units: 'mm'
    };
    
    try {
      // Step 1: Generate AutoLISP code
      const autolispResult = await AutoLispDrawingGenerator.generateAutoLispCode(
        testCase.requirements,
        settings
      );
      
      if (!autolispResult.success) {
        return {
          testCase,
          autolispCode: '',
          pythonCode: '',
          translationSuccess: false,
          errors: [`AutoLISP generation failed: ${autolispResult.error}`],
          warnings: [],
          validationResults: {
            hasDrawingCommands: false,
            hasLayers: false,
            hasDimensions: false,
            hasText: false,
            syntaxValid: false
          }
        };
      }
      
      // Step 2: Translate to Python
      const translationResult = AutoLispToPythonTranslator.translateAutoLispToPython(
        autolispResult.autolispCode
      );
      
      // Step 3: Validate results
      const validationResults = this.validateGeneratedCode(
        autolispResult.autolispCode,
        translationResult.pythonCode
      );
      
      return {
        testCase,
        autolispCode: autolispResult.autolispCode,
        pythonCode: translationResult.pythonCode,
        translationSuccess: translationResult.success,
        errors: translationResult.errors,
        warnings: translationResult.warnings,
        validationResults
      };
      
    } catch (error) {
      return {
        testCase,
        autolispCode: '',
        pythonCode: '',
        translationSuccess: false,
        errors: [`Test execution failed: ${error}`],
        warnings: [],
        validationResults: {
          hasDrawingCommands: false,
          hasLayers: false,
          hasDimensions: false,
          hasText: false,
          syntaxValid: false
        }
      };
    }
  }
  
  /**
   * Get comprehensive test cases
   */
  private static getTestCases(): TestCase[] {
    return [
      {
        id: 1,
        name: "Simple Foundation Plan",
        requirements: "Draw a rectangular foundation plan 12m x 8m with center dividing wall. Add dimensions and labels.",
        expectedFeatures: ["rectangle", "line", "dimensions", "text"]
      },
      {
        id: 2,
        name: "Circular Structure with Radius",
        requirements: "Create a circular water tank with 5m radius, include center point, radius dimension R5000mm, and title text.",
        expectedFeatures: ["circle", "dimensions", "text", "center_point"]
      },
      {
        id: 3,
        name: "Complex Building Layout",
        requirements: "Design a 3-room building layout 15m x 10m with internal walls creating rooms of 5m x 10m each. Include door openings 1m wide, window openings 1.5m wide, and room labels.",
        expectedFeatures: ["rectangle", "lines", "openings", "text", "dimensions"]
      },
      {
        id: 4,
        name: "Beam Elevation with Reinforcement",
        requirements: "Draw a beam elevation 6m long, 300mm deep, with reinforcement bars Ø16mm at top and bottom. Show stirrups every 200mm. Add all dimensions.",
        expectedFeatures: ["rectangle", "circles", "lines", "dimensions", "reinforcement"]
      },
      {
        id: 5,
        name: "Staircase Plan",
        requirements: "Create a staircase plan with 15 steps, each 250mm tread and 175mm riser. Total run 3.75m, total rise 2.625m. Include handrails and dimensions.",
        expectedFeatures: ["lines", "polylines", "dimensions", "text", "handrails"]
      },
      {
        id: 6,
        name: "Column Layout Grid",
        requirements: "Design a column layout grid 4x3 (4 columns by 3 rows) with 6m spacing in both directions. Show column positions as 400mm x 400mm squares, grid lines, and grid labels A-D and 1-3.",
        expectedFeatures: ["grid", "rectangles", "lines", "text", "labels"]
      },
      {
        id: 7,
        name: "Curved Driveway Design",
        requirements: "Draw a curved driveway entrance with 8m radius arc connecting to straight sections. Include centerline, edge lines, and radius dimension R8000mm.",
        expectedFeatures: ["arc", "lines", "centerlines", "dimensions", "curves"]
      },
      {
        id: 8,
        name: "Detailed Section View",
        requirements: "Create a wall section showing foundation 600mm deep, wall 200mm thick, floor slab 150mm thick, and roof slab 125mm thick. Include material hatching and all dimensions.",
        expectedFeatures: ["rectangles", "hatching", "dimensions", "section", "materials"]
      },
      {
        id: 9,
        name: "Site Plan with Multiple Buildings",
        requirements: "Design a site plan with 3 rectangular buildings: Main building 20m x 15m, Garage 8m x 6m, Storage 5m x 4m. Include property boundary 50m x 40m, access road 4m wide, and building labels.",
        expectedFeatures: ["multiple_rectangles", "boundary", "road", "text", "site_plan"]
      },
      {
        id: 10,
        name: "Reinforcement Detail",
        requirements: "Draw reinforcement detail for a beam-column joint showing main bars Ø20mm, stirrups Ø8mm@150mm c/c, and development length 800mm. Include bend details and all dimensions.",
        expectedFeatures: ["circles", "lines", "dimensions", "reinforcement", "details", "bends"]
      }
    ];
  }
  
  /**
   * Validate generated code
   */
  private static validateGeneratedCode(autolispCode: string, pythonCode: string) {
    const autolispLines = autolispCode.split('\n').filter(line => line.trim() && !line.trim().startsWith(';'));
    const pythonLines = pythonCode.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    return {
      hasDrawingCommands: /\b(line|circle|rectangle|arc|polyline)\b/i.test(autolispCode),
      hasLayers: /\blayer\b/i.test(autolispCode),
      hasDimensions: /\b(dimension|dimlinear)\b/i.test(autolispCode),
      hasText: /\btext\b/i.test(autolispCode),
      syntaxValid: autolispLines.length > 0 && pythonLines.length > 0
    };
  }
  
  /**
   * Print test summary
   */
  private static printTestSummary(results: TestResult[]) {
    const passed = results.filter(r => r.translationSuccess).length;
    const failed = results.length - passed;
    
    console.log('\n📊 TEST SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.translationSuccess).forEach(result => {
        console.log(`- Test ${result.testCase.id}: ${result.testCase.name}`);
        result.errors.forEach(error => console.log(`  → ${error}`));
      });
    }
    
    console.log('\n🔧 COMMON ISSUES FOUND:');
    const allErrors = results.flatMap(r => r.errors);
    const errorCounts = allErrors.reduce((acc, error) => {
      const key = error.split(':')[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([error, count]) => {
        console.log(`- ${error}: ${count} occurrences`);
      });
  }
}
