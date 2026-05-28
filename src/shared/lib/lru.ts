interface CacheEntry<Value> {
  value: Value;
  weight: number;
}

export class WeightedLru<Key, Value> {
  private readonly entries = new Map<Key, CacheEntry<Value>>();
  private totalWeight = 0;

  public constructor(private readonly maxWeight: number) {}

  public get(key: Key): Value | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  public peek(key: Key): Value | undefined {
    return this.entries.get(key)?.value;
  }

  public set(key: Key, value: Value, weight: number): void {
    const previous = this.entries.get(key);
    if (previous !== undefined) {
      this.entries.delete(key);
      this.totalWeight -= previous.weight;
    }

    this.entries.set(key, { value, weight });
    this.totalWeight += weight;

    while (this.totalWeight > this.maxWeight) {
      const oldest = this.entries.entries().next().value as [Key, CacheEntry<Value>] | undefined;
      if (oldest === undefined) {
        return;
      }
      this.entries.delete(oldest[0]);
      this.totalWeight -= oldest[1].weight;
    }
  }
}
