/**
 * Splits text into words, each as a list of characters, for per-character
 * animation. Words are kept together so lines never break mid-word.
 */
export function splitIntoWords(text: string): string[][] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
}
