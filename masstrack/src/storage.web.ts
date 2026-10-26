// Web preview only: expo-sqlite on web needs extra WASM setup, so use the browser's localStorage.
export const storage = {
  getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value),
};
