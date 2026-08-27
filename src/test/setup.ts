import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: () => undefined,
  writable: true,
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})
