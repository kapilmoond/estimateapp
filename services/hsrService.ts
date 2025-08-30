import { HsrItem, KeywordsByItem } from '../types';
import { HSR_DATA } from '../data/hsr';
import { KeywordSet, HSRSearchResult } from './keywordGenerationService';

const naturalSortComparator = (a: string, b: string): number => {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const len = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < len; i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
    }
    return 0;
};

export interface HSRSearchOptions {
  maxResultsPerSet: number;
  includePartialMatches: boolean;
  prioritizeExactMatches: boolean;
  includeHSRNumbers: boolean;
}

export interface HSRSearchStats {
  totalSearched: number;
  totalMatched: number;
  duplicatesRemoved: number;
  finalResults: number;
  searchTime: number;
}

export const searchHSR = (keywordsByItem: KeywordsByItem): HsrItem[] => {
  const allFoundItems = new Map<string, HsrItem>();
  const perItemLimit = 50; // Limit per item from scope to keep results relevant

  // Loop through each project item's set of keywords
  for (const itemKeywords of Object.values(keywordsByItem)) {
    if (itemKeywords.length === 0) {
      continue;
    }

    const lowerCaseKeywords = itemKeywords.map(k => k.toLowerCase().trim()).filter(k => k);
    if (lowerCaseKeywords.length === 0) continue;

    const matchesByCount: Map<number, HsrItem[]> = new Map();

    // First pass: find all potential matches and group them by match count
    HSR_DATA.forEach(hsrItem => {
      const description = hsrItem.Description.toLowerCase();
      const hsrNo = hsrItem['HSR No.'].toLowerCase();
      let matchCount = 0;

      for (const keyword of lowerCaseKeywords) {
        if (hsrNo.includes(keyword) || description.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        if (!matchesByCount.has(matchCount)) {
          matchesByCount.set(matchCount, []);
        }
        matchesByCount.get(matchCount)!.push(hsrItem);
      }
    });
    
    // Tiered selection
    let addedCountForItem = 0;
    const sortedCounts = Array.from(matchesByCount.keys()).sort((a, b) => b - a);

    for (const count of sortedCounts) {
        if (addedCountForItem >= perItemLimit) break;

        const itemsInTier = matchesByCount.get(count)!;
        // Shuffle to get a variety if a tier has many items
        for (let i = itemsInTier.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemsInTier[i], itemsInTier[j]] = [itemsInTier[j], itemsInTier[i]];
        }

        for (const item of itemsInTier) {
            if (addedCountForItem >= perItemLimit) break;
            if (!allFoundItems.has(item['HSR No.'])) {
                allFoundItems.set(item['HSR No.'], item);
                addedCountForItem++;
            }
        }
    }
  }

  const resultsArray = Array.from(allFoundItems.values());
  
  // Sort final results using natural sort for HSR numbers.
  resultsArray.sort((a, b) => naturalSortComparator(a['HSR No.'], b['HSR No.']));

  // Limit to a reasonable number of total results
  return resultsArray.slice(0, 1000);
};

/**
 * Enhanced HSR search with professional keyword matching
 */
export const searchHSREnhanced = (
  keywordSets: KeywordSet[],
  options: HSRSearchOptions = {
    maxResultsPerSet: 50,
    includePartialMatches: true,
    prioritizeExactMatches: true,
    includeHSRNumbers: true
  }
): { results: HsrItem[]; stats: HSRSearchStats } => {
  const startTime = Date.now();
  const allFoundItems = new Map<string, HSRSearchResult>();
  let totalSearched = 0;
  let totalMatched = 0;

  // Process each keyword set (one per subcomponent item)
  for (const keywordSet of keywordSets) {
    const setResults = searchHSRForKeywordSet(keywordSet, options);
    totalSearched += HSR_DATA.length;
    totalMatched += setResults.length;

    // Add results to global map (removes duplicates by HSR No.)
    setResults.forEach(result => {
      const existing = allFoundItems.get(result.hsrNo);
      if (!existing || result.matchScore > existing.matchScore) {
        allFoundItems.set(result.hsrNo, result);
      }
    });
  }

  // Convert to HsrItem array and sort
  const finalResults = Array.from(allFoundItems.values())
    .sort((a, b) => {
      // Sort by match score first, then by HSR number
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return naturalSortComparator(a.hsrNo, b.hsrNo);
    })
    .map(result => ({
      'HSR No.': result.hsrNo,
      'Description': result.description,
      'Unit': result.unit,
      'Current Rate': result.currentRate
    }));

  const stats: HSRSearchStats = {
    totalSearched,
    totalMatched,
    duplicatesRemoved: totalMatched - allFoundItems.size,
    finalResults: finalResults.length,
    searchTime: Date.now() - startTime
  };

  return { results: finalResults, stats };
};

/**
 * Search HSR for a single keyword set
 */
const searchHSRForKeywordSet = (
  keywordSet: KeywordSet,
  options: HSRSearchOptions
): HSRSearchResult[] => {
  const results: HSRSearchResult[] = [];
  const keywords = keywordSet.keywords.map(k => k.toLowerCase().trim());
  const hsrNumbers = keywordSet.hsrNumbers || [];

  HSR_DATA.forEach(hsrItem => {
    const description = hsrItem.Description.toLowerCase();
    const hsrNo = hsrItem['HSR No.'].toLowerCase();

    let matchScore = 0;
    const matchedKeywords: string[] = [];

    // Check keyword matches
    keywords.forEach(keyword => {
      if (description.includes(keyword) || hsrNo.includes(keyword)) {
        matchScore++;
        matchedKeywords.push(keyword);
      }
    });

    // Check HSR number matches (higher priority)
    if (options.includeHSRNumbers && hsrNumbers.length > 0) {
      hsrNumbers.forEach(hsrNum => {
        if (hsrItem['HSR No.'] === hsrNum) {
          matchScore += 10; // High priority for exact HSR matches
          matchedKeywords.push(`HSR:${hsrNum}`);
        }
      });
    }

    // Only include if there are matches
    if (matchScore > 0) {
      results.push({
        hsrNo: hsrItem['HSR No.'],
        description: hsrItem.Description,
        unit: hsrItem.Unit,
        currentRate: hsrItem['Current Rate'],
        matchScore,
        matchedKeywords
      });
    }
  });

  // Sort by match score and take top results
  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.maxResultsPerSet);
};

/**
 * Manual keyword search for user-specified keywords
 */
export const searchHSRManual = (
  manualKeywords: string[],
  maxResults: number = 100
): HsrItem[] => {
  const keywords = manualKeywords.map(k => k.toLowerCase().trim()).filter(k => k.length > 0);
  if (keywords.length === 0) return [];

  const results: { item: HsrItem; matchCount: number }[] = [];

  HSR_DATA.forEach(hsrItem => {
    const description = hsrItem.Description.toLowerCase();
    const hsrNo = hsrItem['HSR No.'].toLowerCase();

    let matchCount = 0;
    keywords.forEach(keyword => {
      if (description.includes(keyword) || hsrNo.includes(keyword)) {
        matchCount++;
      }
    });

    if (matchCount > 0) {
      results.push({ item: hsrItem, matchCount });
    }
  });

  // Sort by match count and return top results
  return results
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, maxResults)
    .map(result => result.item);
};

/**
 * Combine existing HSR results with manual search results
 */
export const combineHSRResults = (
  existingResults: HsrItem[],
  manualResults: HsrItem[]
): HsrItem[] => {
  const combined = new Map<string, HsrItem>();

  // Add existing results
  existingResults.forEach(item => {
    combined.set(item['HSR No.'], item);
  });

  // Add manual results (won't duplicate)
  manualResults.forEach(item => {
    combined.set(item['HSR No.'], item);
  });

  // Convert back to array and sort
  const finalResults = Array.from(combined.values());
  finalResults.sort((a, b) => naturalSortComparator(a['HSR No.'], b['HSR No.']));

  return finalResults;
};