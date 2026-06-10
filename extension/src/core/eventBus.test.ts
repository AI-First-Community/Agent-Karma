import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./eventBus";
import { AgentKarmaEvent } from "./types";

function evt(type: AgentKarmaEvent["type"] = "session.started"): AgentKarmaEvent {
  return { id: "e1", sessionId: "s1", type, timestamp: "2026-06-10T10:00:00.000Z", data: {} };
}

describe("EventBus", () => {
  it("delivers an emitted event to a subscriber", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on(handler);
    const e = evt();
    bus.emit(e);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(e);
  });

  it("delivers to multiple subscribers", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on(a);
    bus.on(b);
    bus.emit(evt());
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("stops delivering after dispose()", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const sub = bus.on(handler);
    sub.dispose();
    bus.emit(evt());
    expect(handler).not.toHaveBeenCalled();
    expect(bus.size).toBe(0);
  });

  it("a throwing handler does not break the others and emit() never throws", () => {
    const bus = new EventBus();
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    bus.on(bad);
    bus.on(good);
    expect(() => bus.emit(evt())).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("clear() removes all subscribers", () => {
    const bus = new EventBus();
    bus.on(vi.fn());
    bus.on(vi.fn());
    expect(bus.size).toBe(2);
    bus.clear();
    expect(bus.size).toBe(0);
  });
});
