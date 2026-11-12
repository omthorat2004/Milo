import { describe, expect, it } from "vitest";

import {
  clearResetCooldown,
  loadResetCooldown,
  saveResetCooldown,
  secondsLeft,
} from "@/lib/reset-cooldown";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("reset cooldown storage", () => {
  it("restores the email and the remaining seconds", () => {
    const storage = fakeStorage();
    saveResetCooldown("a@b.com", 60, 1_000, storage);

    const restored = loadResetCooldown(21_000, storage);
    expect(restored?.email).toBe("a@b.com");
    expect(secondsLeft(restored!.until, 21_000)).toBe(40);
  });

  it("still restores the reset step after the cooldown has ended", () => {
    const storage = fakeStorage();
    saveResetCooldown("a@b.com", 60, 0, storage);

    const restored = loadResetCooldown(120_000, storage);
    expect(restored?.email).toBe("a@b.com");
    expect(secondsLeft(restored!.until, 120_000)).toBe(0);
  });

  it("forgets an entry well past its window", () => {
    const storage = fakeStorage();
    saveResetCooldown("a@b.com", 60, 0, storage);

    expect(loadResetCooldown(60_000 + 16 * 60 * 1000, storage)).toBeNull();
    expect(storage.getItem("milo:forgot-password")).toBeNull();
  });

  it("ignores malformed values", () => {
    const storage = fakeStorage();
    storage.setItem("milo:forgot-password", "{not json");
    expect(loadResetCooldown(0, storage)).toBeNull();

    storage.setItem("milo:forgot-password", JSON.stringify({ email: 1 }));
    expect(loadResetCooldown(0, storage)).toBeNull();
  });

  it("clears on demand and tolerates missing storage", () => {
    const storage = fakeStorage();
    saveResetCooldown("a@b.com", 60, 0, storage);
    clearResetCooldown(storage);
    expect(loadResetCooldown(0, storage)).toBeNull();

    expect(() => saveResetCooldown("a@b.com", 60, 0, null)).not.toThrow();
    expect(loadResetCooldown(0, null)).toBeNull();
  });
});
