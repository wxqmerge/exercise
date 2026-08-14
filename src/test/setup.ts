import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

const mockConfig = { scheduleName: 'test', hikeDays: '3,5' };

const createFetchMock = () => {
  return vi.fn((url, options) => {
    if (typeof url === 'string' && url === '/api/config') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      });
    }
    if (options?.method === 'PUT' || options?.method === 'DELETE' || options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: 'Not found' } }),
    });
  });
};

globalThis.fetch = createFetchMock();

beforeEach(() => {
  globalThis.fetch = createFetchMock();
});

Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    origin: 'http://localhost',
    hostname: 'localhost',
    pathname: '/',
    href: 'http://localhost/',
  },
  writable: true,
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  writable: true,
});

URL.createObjectURL = vi.fn(() => 'blob:http://test.com/mock');
URL.revokeObjectURL = vi.fn();

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn(function () {
    this.observe = vi.fn();
    this.disconnect = vi.fn();
  }),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn(function () {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }),
});

globalThis.__TEST_MOCK_DATA__ = { config: mockConfig };
