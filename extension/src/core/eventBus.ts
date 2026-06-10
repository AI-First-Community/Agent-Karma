import { AgentKarmaEvent } from "./types";

export type EventHandler = (event: AgentKarmaEvent) => void;

export interface Subscription {
  dispose(): void;
}

/**
 * Minimal typed pub/sub for AgentKarmaEvent.
 *
 * - No vscode dependency → unit-testable.
 * - A faulty handler must never break delivery to the others, and emit() never
 *   throws (fail-safe: a collector throwing must not crash the host).
 */
export class EventBus {
  private readonly handlers = new Set<EventHandler>();

  on(handler: EventHandler): Subscription {
    this.handlers.add(handler);
    return { dispose: () => this.handlers.delete(handler) };
  }

  emit(event: AgentKarmaEvent): void {
    // Iterate a copy so a handler may (un)subscribe during emit without surprises.
    for (const handler of [...this.handlers]) {
      try {
        handler(event);
      } catch {
        /* one handler's failure must not stop the others */
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  get size(): number {
    return this.handlers.size;
  }
}
