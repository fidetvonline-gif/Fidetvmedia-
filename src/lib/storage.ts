// Safe Storage Utility
// Bypasses browser iframe SecurityError when localStorage or sessionStorage is restricted.

const memoryLocalStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return memoryLocalStorage[key] ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      memoryLocalStorage[key] = String(value);
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryLocalStorage[key];
    }
  },
  clear(): void {
    try {
      window.localStorage.clear();
    } catch (e) {
      Object.keys(memoryLocalStorage).forEach(key => delete memoryLocalStorage[key]);
    }
  }
};

const memorySessionStorage: Record<string, string> = {};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return memorySessionStorage[key] ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      memorySessionStorage[key] = String(value);
    }
  },
  removeItem(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      delete memorySessionStorage[key];
    }
  },
  clear(): void {
    try {
      window.sessionStorage.clear();
    } catch (e) {
      Object.keys(memorySessionStorage).forEach(key => delete memorySessionStorage[key]);
    }
  }
};
