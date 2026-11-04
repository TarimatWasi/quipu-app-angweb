// Bounded exception to FE-ANG-HTTP-02 (no browser storage), allowed by eslint.config.js only under
// core/mock/: this code exists only in the `mock` build (QP-ANGWEB-ENV-01) and the prueba de build
// proves it never reaches production. What is kept is the demo role and scenario chosen in the
// panel, so they survive a reload of the tab: never a token, a session cookie or personal data.
// sessionStorage, not localStorage: it dies with the tab.

/** The only keys the simulated BFF keeps. */
export type MockSettingKey = 'quipu-mock:role' | 'quipu-mock:scenario' | 'quipu-mock:password';

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    // A browser that blocks storage: the panel still works, only without surviving a reload.
    return null;
  }
}

export function readMockSetting(key: MockSettingKey): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Saves `value`, or forgets the key when it is null; false when the storage refused it. */
export function writeMockSetting(key: MockSettingKey, value: string | null): boolean {
  const store = storage();
  if (store === null) {
    return false;
  }
  try {
    if (value === null) {
      store.removeItem(key);
    } else {
      store.setItem(key, value);
    }
    return true;
  } catch {
    // Full or blocked storage: the choice lasts only while the page is open.
    return false;
  }
}
