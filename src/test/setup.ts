import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

const DEFAULT_CONFIG = { dayMode: 'numbered', dayCount: 3, days: ['Day 1', 'Day 2', 'Day 3'] };

const mockData = {
  config: { ...DEFAULT_CONFIG },
  configStatus: 200,
  keyRequired: true,
  images: {},
  imagesSaveResult: { ok: true },
};

const createFetchMock = () => {
  return vi.fn((url, options) => {
    if (typeof url === 'string' && url === '/api/config' && options?.method !== 'PUT') {
      if (mockData.configStatus !== 200) {
        return Promise.resolve({
          ok: false,
          status: mockData.configStatus,
          json: () => Promise.resolve({ success: false, error: { message: 'Invalid key' } }),
        });
      }
      const sentKey = options?.headers?.['X-App-Key'] || '';
      if (mockData.keyRequired && !sentKey) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: 'Invalid key' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData.config),
      });
    }
    if (typeof url === 'string' && url === '/api/images') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData.images),
      });
    }
    if (typeof url === 'string' && url === '/api/images/save' && options?.method === 'POST') {
      const body = JSON.parse(options.body);
      const result = mockData.imagesSaveResult;
      const savedUrl = `/api/images/${body.exerciseId}.jpg`;
      if (result.ok) {
        mockData.images = { ...mockData.images, [body.exerciseId]: savedUrl };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, url: savedUrl }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ success: false, error: { message: 'Download failed' } }),
      });
    }
    if (typeof url === 'string' && url === '/api/export') {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob([JSON.stringify({ version: 1, images: {} })])),
      });
    }
    if (typeof url === 'string' && url === '/api/import' && options?.method === 'POST') {
      const body = JSON.parse(options.body);
      if (body.version !== 1 || !body.images) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'Invalid backup file' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, imported: Object.keys(body.images), errors: [] }),
      });
    }
    if (typeof url === 'string' && url === '/api/images/upload' && options?.method === 'POST') {
      const body = JSON.parse(options.body);
      const mime = (body.dataUrl.match(/^data:image\/(\w+);/) || [])[1] || 'jpg';
      const ext = mime === 'jpeg' ? 'jpg' : mime;
      const savedUrl = `/api/images/${body.exerciseId}.${ext}`;
      mockData.images = { ...mockData.images, [body.exerciseId]: savedUrl };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, url: savedUrl }),
      });
    }
    if (typeof url === 'string' && url.startsWith('/api/images/') && options?.method === 'DELETE') {
      const file = decodeURIComponent(url.substring('/api/images/'.length));
      const id = file.substring(0, file.lastIndexOf('.'));
      const next = { ...mockData.images };
      delete next[id];
      mockData.images = next;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
    if (typeof url === 'string' && url === '/api/config' && options?.method === 'PUT') {
      const body = JSON.parse(options.body);
      if (body.dayMode !== 'odd-even' && body.dayMode !== 'numbered') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'dayMode must be "odd-even" or "numbered"' } }),
        });
      }
      const count = Number(body.dayCount);
      if (!Number.isInteger(count) || count < 1 || count > 10) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'dayCount must be an integer between 1 and 10' } }),
        });
      }
      mockData.config = {
        dayMode: body.dayMode,
        dayCount: count,
        days: body.dayMode === 'numbered'
          ? Array.from({ length: count }, (_, i) => `Day ${i + 1}`)
          : ['Odd', 'Even'],
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData.config),
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
  mockData.config = { ...DEFAULT_CONFIG };
  mockData.configStatus = 200;
  mockData.keyRequired = true;
  mockData.images = {};
  mockData.imagesSaveResult = { ok: true };
  URL.createObjectURL = vi.fn(() => 'blob:http://test.com/mock');
  URL.revokeObjectURL = vi.fn();
  localStorage.clear();
  localStorage.setItem('exercise-key', 'test-key');
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

globalThis.__TEST_MOCK_DATA__ = mockData;
