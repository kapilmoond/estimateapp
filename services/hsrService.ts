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