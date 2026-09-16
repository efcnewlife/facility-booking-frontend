import type { CartStorage } from "../timetableCartStorage";

export const createFakeStorage = (initial: Record<string, string> = {}): CartStorage => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};
