import '@testing-library/jest-dom'

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value))
    },
  }
}

const localStorageMissingApi =
  typeof window.localStorage === 'undefined' ||
  typeof window.localStorage.getItem !== 'function' ||
  typeof window.localStorage.setItem !== 'function' ||
  typeof window.localStorage.removeItem !== 'function' ||
  typeof window.localStorage.clear !== 'function'

if (localStorageMissingApi) {
  const memoryStorage = createMemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
    configurable: true,
  })
}
