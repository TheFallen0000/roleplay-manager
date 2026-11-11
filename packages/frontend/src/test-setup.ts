import "@testing-library/jest-dom/vitest"

// jsdom does not implement matchMedia, but the shadcn sidebar (and the theme
// provider) read it on mount. Tests only need a non-matching default.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
