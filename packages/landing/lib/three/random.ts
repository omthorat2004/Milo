/**
 * Seeded linear-congruential generator.
 *
 * The scene needs scattered-but-stable layouts: identical on every reload and
 * between server and client, without shipping a random-number dependency.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
