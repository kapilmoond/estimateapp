import { HsrItem, KeywordsByItem } from '../types';
import { HSR_DATA } from '../data/hsr';

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

export const searchHSR = (keywordsByItem: KeywordsByItem): HsrItem[] => {
  const allFoundItems = new Map<string, HsrItem>();

  // Loop through each project item's set of keywords
  for (const itemKeywords of Object.values(keywordsByItem)) {
    if (itemKeywords.length === 0) {
      continue;
    }

    const lowerCaseKeywords = itemKeywords.map(k => k.toLowerCase().trim()).filter(k => k);
    if (lowerCaseKeywords.length === 0) continue;

    const matchesForItem: { item: HsrItem; matchCount: number }[] = [];

    // First pass: find all potential matches and count keyword hits
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
        matchesForItem.push({ item: hsrItem, matchCount });
      }
    });

    // Sort matches for the current item by the number of keywords matched (descending)
    matchesForItem.sort((a, b) => b.matchCount - a.matchCount);
    
    // Add up to 50 of the top-sorted matches for this item to the overall results pool.
    const perItemLimit = 50;
    let addedCount = 0;
    for (const match of matchesForItem) {
        if (addedCount >= perItemLimit) {
            break;
        }
        if (!allFoundItems.has(match.item['HSR No.'])) {
            allFoundItems.set(match.item['HSR No.'], match.item);
        }
        addedCount++;
    }
  }

  const resultsArray = Array.from(allFoundItems.values());
  
  // Sort final results using natural sort for HSR numbers.
  resultsArray.sort((a, b) => naturalSortComparator(a['HSR No.'], b['HSR No.']));

  // Limit to a reasonable number of total results to not overwhelm the LLM
  return resultsArray.slice(0, 1000); 
};