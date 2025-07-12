/**
 * Stable random function for consistent server/client rendering
 * This prevents hydration errors by ensuring the same "random" values
 * are generated on both server and client
 */
export function stableRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) / 2147483647; // Normalize to 0-1
}

/**
 * Shuffle array with stable random for consistent server/client rendering
 */
export function stableShuffle<T>(array: T[], seed: string): T[] {
  return [...array].sort((a, b) => {
    const aSeed = `${seed}-${JSON.stringify(a)}`;
    const bSeed = `${seed}-${JSON.stringify(b)}`;
    return stableRandom(aSeed) - stableRandom(bSeed);
  });
}

/**
 * Select random items from array with stable random
 */
export function stableRandomSelect<T>(array: T[], count: number, seed: string): T[] {
  const shuffled = stableShuffle(array, seed);
  return shuffled.slice(0, count);
} 