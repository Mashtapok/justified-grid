import { getRandomInt } from '@/shared/lib/getRandomInt';

export function pickRandomItems<T>(source: ReadonlyArray<T>, count: number): T[] {
  if (source.length === 0 || count <= 0) {
    return [];
  }

  const indices = source.map((_, index) => index);
  const picked: T[] = [];
  const take = Math.min(count, indices.length);

  for (let i = 0; i < take; i++) {
    const slot = getRandomInt(0, indices.length - 1);
    const index = indices[slot]!;
    indices.splice(slot, 1);
    picked.push(source[index]!);
  }

  return picked;
}
