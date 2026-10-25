/**
 * A least-recently-used cache bounded by total bytes. Used for product photos, which are immutable by content hash,
 * so a cached copy can never be stale. Entries larger than the whole budget are not cached.
 */
export class ByteLru<V extends { bytes: { length: number } }> {
  private map = new Map<string, V>();
  private total = 0;
  constructor(private readonly maxBytes: number) {}

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v) {
      this.map.delete(key);
      this.map.set(key, v); // most recently used goes last
    }
    return v;
  }

  set(key: string, v: V) {
    const size = v.bytes.length;
    if (size > this.maxBytes) return;
    const old = this.map.get(key);
    if (old) {
      this.total -= old.bytes.length;
      this.map.delete(key);
    }
    this.map.set(key, v);
    this.total += size;
    for (const [k, e] of this.map) {
      if (this.total <= this.maxBytes) break;
      this.map.delete(k);
      this.total -= e.bytes.length;
    }
  }

  get size() {
    return this.map.size;
  }
  get bytes() {
    return this.total;
  }
}
