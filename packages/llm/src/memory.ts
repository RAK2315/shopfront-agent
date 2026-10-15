import type { BudgetGuard, LlmCache, LlmRoute, ReplayStore } from './types';

/** In-process cache/replay. The app wires DB-backed versions (agent_runs); these serve tests and scripts. */
export class MemoryStore implements LlmCache, ReplayStore {
  readonly map = new Map<string, unknown>();
  async get(key: string) {
    return this.map.get(key);
  }
  async set(key: string, value: unknown) {
    this.map.set(key, structuredClone(value));
  }
}

/** Simple free-tier guard: N calls per UTC day overall and M per client per hour. */
export class MemoryBudget implements BudgetGuard {
  private day = '';
  private dayCount = 0;
  private readonly perClient = new Map<string, number[]>();

  constructor(
    private readonly maxPerDay: number,
    private readonly maxPerClientPerHour: number,
    private readonly now: () => number = Date.now,
  ) {}

  async tryConsume(_route: LlmRoute, clientKey?: string): Promise<boolean> {
    const t = this.now();
    const day = new Date(t).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.dayCount = 0;
    }
    if (this.dayCount >= this.maxPerDay) return false;
    if (clientKey) {
      const recent = (this.perClient.get(clientKey) ?? []).filter((x) => t - x < 3_600_000);
      if (recent.length >= this.maxPerClientPerHour) return false;
      recent.push(t);
      this.perClient.set(clientKey, recent);
    }
    this.dayCount++;
    return true;
  }
}
