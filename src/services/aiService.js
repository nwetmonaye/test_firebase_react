import {
  isGeminiConfigured,
  suggestItemFromDescription,
  summarizeItemList,
} from '../gemini';

export { isGeminiConfigured };

export function suggestProductFromIdea(idea) {
  return suggestItemFromDescription(idea);
}

export function summarizeProducts(entries) {
  return summarizeItemList(entries);
}
