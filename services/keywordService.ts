import { KeywordsByItem } from '../types';

/**
 * Extracts HSR (Haryana Schedule of Rates) numbers from a given text.
 * HSR numbers are expected in formats like '4.1', '4.12.1', etc.
 * @param text The text to search for HSR numbers.
 * @returns An array of unique HSR numbers found in the text.
 */
export const extractHsrNumbersFromText = (text: string): string[] => {
  const hsrRegex = /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b/g;
  const matches = text.match(hsrRegex);
  return matches ? [...new Set(matches)] : [];
};
