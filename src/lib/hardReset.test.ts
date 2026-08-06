import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hardReset } from "./hardReset";

describe("hardReset", () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
  const originalCaches = Object.getOwnPropertyDescriptor(window, "caches");
  const originalLocation = Object.getOwnPropertyDescriptor(window, "location")!;
  let reloadFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadFn = vi.fn();
    // jsdom's window.location.reload isn't directly spy-able (non-configurable),
    // but the `location` property on `window` itself is — replace the whole
    // object with a copy that has a mock reload.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadFn },
    });
  });

  afterEach(() => {
    if (originalServiceWorker) Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
    if (originalCaches) Object.defineProperty(window, "caches", originalCaches);
    Object.defineProperty(window, "location", originalLocation);
  });

  it("unregisters every service worker and deletes every cache before reloading", async () => {
    const unregister1 = vi.fn().mockResolvedValue(true);
    const unregister2 = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister: unregister1 }, { unregister: unregister2 }]) },
    });
    const deleteCache = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys: vi.fn().mockResolvedValue(["workbox-precache-v1"]), delete: deleteCache },
    });

    await hardReset();

    expect(unregister1).toHaveBeenCalledOnce();
    expect(unregister2).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith("workbox-precache-v1");
    expect(reloadFn).toHaveBeenCalledOnce();
  });

  it("still reloads when there is no service worker or caches API", async () => {
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
    Object.defineProperty(window, "caches", { configurable: true, value: undefined });

    await hardReset();

    expect(reloadFn).toHaveBeenCalledOnce();
  });
});
