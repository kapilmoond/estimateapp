import { LLMService } from './llmService';

export interface KeywordSet {
  itemDescription: string;
  keywords: string[];
  hsrNumbers?: string[]; // If user specifies HSR numbers
  generatedAt: number;
}

export interface HSRSearchResult {
  hsrNo: string;
  description: string;
  unit: string;
  currentRate: string;
  matchScore: number;
  matchedKeywords: string[];
}

export interface KeywordGenerationResult {
  keywordSets: KeywordSet[];
  totalKeywords: number;
  generatedAt: number;
}

export class KeywordGenerationService {
  /**
   * Generate keywords for subcomponent items with regeneration support
   */
  static async generateKeywords(
    subcomponentItems: string[],
    userInstructions?: string,
    previousKeywords?: KeywordGenerationResult
  ): Promise<KeywordGenerationResult> {
    const keywordSets: KeywordSet[] = [];
    
    for (const item of subcomponentItems) {
      const keywords = await this.generateKeywordsForItem(item, userInstructions, previousKeywords);
      keywordSets.push({
        itemDescription: item,
        keywords,
        hsrNumbers: this.extractHSRNumbers(userInstructions || ''),
        generatedAt: Date.now()
      });
    }
    
    return {
      keywordSets,
      totalKeywords: keywordSets.reduce((total, set) => total + set.keywords.length, 0),
      generatedAt: Date.now()
    };
  }

  /**
   * Generate keywords for a single item following the specified rules
   */
  private static async generateKeywordsForItem(
    itemDescription: string,
    userInstructions?: string,
    previousKeywords?: KeywordGenerationResult
  ): Promise<string[]> {
    const prompt = this.createKeywordPrompt(itemDescription, userInstructions, previousKeywords);
    
    try {
      const response = await LLMService.generateResponse([{ role: 'user', text: prompt }], '');
      return this.parseKeywordsFromResponse(response);
    } catch (error) {
      console.error('Error generating keywords:', error);
      // Fallback to basic keyword extraction
      return this.extractBasicKeywords(itemDescription);
    }
  }

  /**
   * Create comprehensive keyword generation prompt
   */
  private static createKeywordPrompt(
    itemDescription: string,
    userInstructions?: string,
    previousKeywords?: KeywordGenerationResult
  ): string {
    let prompt = `Generate EXACTLY 5 single-word keywords for the following construction item. Follow these CRITICAL rules:

**ITEM TO ANALYZE:**
"${itemDescription}"

**KEYWORD GENERATION RULES:**
1. **SINGLE WORDS ONLY** - Each keyword must be ONE word, no phrases
2. **WORK-FOCUSED** - Keywords should describe the WORK/ACTIVITY, not objects or locations
3. **PRIORITY ORDER** - Most important work-related keyword first
4. **TECHNICAL TERMS** - Include technical specifications as separate keywords
5. **SYNONYMS/EXPANSIONS** - Include expanded forms of abbreviations

**EXAMPLES:**

**Example 1:** "Brickwork for the foundation of a room with mortar 1:6"
Keywords: brickwork, foundation, mortar, 1:6, masonry
(NOT: room, building, construction)

**Example 2:** "Supplying and fixing of RCC pipe of 600mm dia"
Keywords: pipe, RCC, 600, reinforced, concrete
(NOT: supplying, fixing, diameter)

**Example 3:** "Plastering with cement mortar 1:4 on walls"
Keywords: plastering, cement, mortar, 1:4, walls

**CRITICAL REQUIREMENTS:**
- Exactly 5 keywords
- All single words
- Focus on work type, materials, specifications
- Include ratios/measurements as separate keywords
- Include expanded abbreviations (RCC → reinforced, cement, concrete)
- NO location words (room, building, site)
- NO action words (supplying, fixing, providing)`;

    if (userInstructions) {
      prompt += `\n\n**USER INSTRUCTIONS:**
${userInstructions}

**SPECIAL HANDLING:**
- If user mentions HSR numbers (like 7.21.2, 6.9), include them as keywords
- If user specifies particular materials/methods, prioritize those keywords`;
    }

    if (previousKeywords) {
      prompt += `\n\n**REGENERATION REQUEST:**
This is a regeneration of previously generated keywords. The user wants to modify the keywords based on new instructions.

**PREVIOUS KEYWORDS:**
${previousKeywords.keywordSets.map(set => 
  `${set.itemDescription}: ${set.keywords.join(', ')}`
).join('\n')}

Generate NEW keywords following the user's modification instructions.`;
    }

    prompt += `\n\n**OUTPUT FORMAT:**
Respond with ONLY the 5 keywords separated by commas, nothing else.
Example: brickwork,foundation,mortar,1:6,masonry

Generate keywords for: "${itemDescription}"`;

    return prompt;
  }

  /**
   * Parse keywords from LLM response
   */
  private static parseKeywordsFromResponse(response: string): string[] {
    // Clean the response and extract keywords
    const cleaned = response.trim().toLowerCase();
    
    // Split by comma and clean each keyword
    const keywords = cleaned.split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .slice(0, 5); // Ensure exactly 5 keywords
    
    // If we don't have 5 keywords, pad with basic extraction
    if (keywords.length < 5) {
      const additional = this.extractBasicKeywords(response);
      keywords.push(...additional.slice(0, 5 - keywords.length));
    }
    
    return keywords.slice(0, 5);
  }

  /**
   * Extract basic keywords as fallback
   */
  private static extractBasicKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s:]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
    
    // Remove duplicates and take first 5
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Check if word is a stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'for', 'with', 'from', 'into', 'during', 'including',
      'supplying', 'providing', 'fixing', 'laying', 'placing', 'installing',
      'room', 'building', 'site', 'area', 'location', 'place'
    ];
    return stopWords.includes(word);
  }

  /**
   * Extract HSR numbers from user instructions
   */
  private static extractHSRNumbers(instructions: string): string[] {
    const hsrPattern = /\b\d+\.\d+(?:\.\d+)?\b/g;
    const matches = instructions.match(hsrPattern) || [];
    return matches;
  }

  /**
   * Regenerate keywords with user instructions
   */
  static async regenerateKeywords(
    previousResult: KeywordGenerationResult,
    regenerationInstructions: string
  ): Promise<KeywordGenerationResult> {
    const items = previousResult.keywordSets.map(set => set.itemDescription);
    return this.generateKeywords(items, regenerationInstructions, previousResult);
  }

  /**
   * Add manual keywords to existing result
   */
  static addManualKeywords(
    existingResult: KeywordGenerationResult,
    itemIndex: number,
    manualKeywords: string[]
  ): KeywordGenerationResult {
    const updatedSets = [...existingResult.keywordSets];
    
    if (itemIndex >= 0 && itemIndex < updatedSets.length) {
      // Clean manual keywords (single words only)
      const cleanedKeywords = manualKeywords
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0 && !keyword.includes(' '));
      
      updatedSets[itemIndex] = {
        ...updatedSets[itemIndex],
        keywords: [...new Set([...updatedSets[itemIndex].keywords, ...cleanedKeywords])]
      };
    }
    
    return {
      ...existingResult,
      keywordSets: updatedSets,
      totalKeywords: updatedSets.reduce((total, set) => total + set.keywords.length, 0)
    };
  }

  /**
   * Validate keywords according to rules
   */
  static validateKeywords(keywords: string[]): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Check single word rule
    const multiWordKeywords = keywords.filter(keyword => keyword.includes(' '));
    if (multiWordKeywords.length > 0) {
      errors.push(`Multi-word keywords found: ${multiWordKeywords.join(', ')}`);
      suggestions.push('Use single words only. Split phrases into individual keywords.');
    }
    
    // Check minimum count
    if (keywords.length < 5) {
      errors.push(`Only ${keywords.length} keywords provided. Need exactly 5.`);
      suggestions.push('Add more work-related keywords like materials, methods, or specifications.');
    }
    
    // Check for stop words
    const stopWords = keywords.filter(keyword => this.isStopWord(keyword));
    if (stopWords.length > 0) {
      errors.push(`Stop words found: ${stopWords.join(', ')}`);
      suggestions.push('Focus on work types, materials, and technical specifications instead.');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Get keyword statistics
   */
  static getKeywordStatistics(result: KeywordGenerationResult): {
    totalItems: number;
    totalKeywords: number;
    averageKeywordsPerItem: number;
    mostCommonKeywords: { keyword: string; count: number }[];
    keywordsByCategory: {
      materials: string[];
      work: string[];
      specifications: string[];
      measurements: string[];
    };
  } {
    const allKeywords = result.keywordSets.flatMap(set => set.keywords);
    const keywordCounts = new Map<string, number>();
    
    allKeywords.forEach(keyword => {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    });
    
    const mostCommon = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
    
    // Categorize keywords (basic categorization)
    const materials = allKeywords.filter(k => 
      ['cement', 'concrete', 'steel', 'brick', 'mortar', 'rcc', 'reinforced'].includes(k)
    );
    const work = allKeywords.filter(k => 
      ['brickwork', 'plastering', 'excavation', 'laying', 'masonry', 'concreting'].includes(k)
    );
    const specifications = allKeywords.filter(k => 
      k.includes(':') || ['grade', 'class', 'type'].includes(k)
    );
    const measurements = allKeywords.filter(k => 
      /^\d+/.test(k) || ['mm', 'cm', 'm', 'dia', 'thick'].includes(k)
    );
    
    return {
      totalItems: result.keywordSets.length,
      totalKeywords: allKeywords.length,
      averageKeywordsPerItem: allKeywords.length / result.keywordSets.length,
      mostCommonKeywords: mostCommon,
      keywordsByCategory: {
        materials: [...new Set(materials)],
        work: [...new Set(work)],
        specifications: [...new Set(specifications)],
        measurements: [...new Set(measurements)]
      }
    };
  }
}
