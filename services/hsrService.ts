import { HsrItem, KeywordsByItem } from '../types';
import { HSR_DATA } from '../data/hsr';

export const searchHSR = (keywordsByItem: KeywordsByItem, precision: number = 20): HsrItem[] => {
  const allFoundItems: HsrItem[] = [];
  const foundItemIds = new Set<string>();

  for (const itemKeywords of Object.values(keywordsByItem)) {
    if (itemKeywords.length === 0) {
      continue;
    }

    const lowerCaseKeywords = itemKeywords.map(k => k.toLowerCase().trim()).filter(k => k);
    if(lowerCaseKeywords.length === 0) continue;
    
    // Ensure at least one keyword must match, even for low precision values.
    const matchThreshold = Math.max(1, Math.ceil(lowerCaseKeywords.length * (precision / 100)));
    
    const searchResults = HSR_DATA.filter(hsrItem => {
      const description = hsrItem.Description.toLowerCase();
      let matchCount = 0;
      for (const keyword of lowerCaseKeywords) {
          if (description.includes(keyword)) {
              matchCount++;
          }
      }
      return matchCount >= matchThreshold;
    });

    for (const foundItem of searchResults) {
        if (!foundItemIds.has(foundItem['HSR No.'])) {
            allFoundItems.push(foundItem);
            foundItemIds.add(foundItem['HSR No.']);
        }
    }
  }

  // Sort results to have some consistency, e.g., by HSR No.
  allFoundItems.sort((a, b) => a['HSR No.'].localeCompare(b['HSR No.']));

  // Limit to a reasonable number of results to not overwhelm the LLM
  return allFoundItems.slice(0, 200); 
};
