import { describe, expect, it } from "vitest";

import { type Session, sessionStorage } from "../session.js";

describe("Session Management", () => {
  it("should maintain session isolation between concurrent contexts", async () => {
    const session1: Session = { id: "session-1" };
    const session2: Session = { id: "session-2" };

    const results: Session[] = [];

    // Run two sessions concurrently
    await Promise.all([
      sessionStorage.run(session1, async () => {
        // Wait a bit to ensure overlap
        await new Promise((resolve) => setTimeout(resolve, 10));
        const stored = sessionStorage.getStore();
        if (stored) {
          results.push(stored);
        }
      }),
      sessionStorage.run(session2, async () => {
        const stored = sessionStorage.getStore();
        if (stored) {
          results.push(stored);
        }
      }),
    ]);

    // Both sessions should have completed and stored their data
    expect(results).toHaveLength(2);
    // Each session should have its own data
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(["session-1", "session-2"]);
  });

  it("should return undefined when accessed outside of run context", async () => {
    const store = sessionStorage.getStore();
    expect(store).toBeUndefined();
  });

  it("should provide correct session data within run context", async () => {
    const session: Session = {
      id: "test-session-123",
    };

    await sessionStorage.run(session, async () => {
      const stored = sessionStorage.getStore();
      expect(stored).toBeDefined();
      expect(stored?.id).toBe("test-session-123");
    });
  });

  it("should properly clean up session data after run context completes", async () => {
    const session: Session = { id: "cleanup-456" };

    await sessionStorage.run(session, async () => {
      expect(sessionStorage.getStore()).toBeDefined();
    });

    // After the run completes, store should be undefined
    expect(sessionStorage.getStore()).toBeUndefined();
  });

  it("should handle nested session contexts correctly", async () => {
    const session1: Session = { id: "outer-1" };
    const session2: Session = { id: "inner-2" };

    await sessionStorage.run(session1, async () => {
      expect(sessionStorage.getStore()?.id).toBe("outer-1");

      await sessionStorage.run(session2, async () => {
        // Inner context should override outer
        expect(sessionStorage.getStore()?.id).toBe("inner-2");
      });

      // After inner context exits, outer context should be restored
      expect(sessionStorage.getStore()?.id).toBe("outer-1");
    });
  });
});
