import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

const DEFAULT_CONFIG = { dayMode: 'numbered', dayCount: 3, days: ['Day 1', 'Day 2', 'Day 3'], exerciseSwaps: {}, workoutType: 'dumbbells' };

const isSwapMap = (v) =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v).every(d =>
    !!d && typeof d === 'object' && !Array.isArray(d) &&
    Object.values(d).every(x => typeof x === 'string'));

const mockData = {
  config: { ...DEFAULT_CONFIG },
  configStatus: 200,
  keyRequired: true,
  images: {},
  imagesSaveResult: { ok: true },
  entries: undefined,
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
    if (typeof url === 'string' && url === '/api/entries') {
      if (options?.method === 'PUT') {
        const body = JSON.parse(options.body || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ success: false, error: { message: 'entries must be an object' } }),
          });
        }
        mockData.entries = { ...body };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData.entries || {}),
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
      const current = mockData.config;
      if (body.dayMode !== undefined && body.dayMode !== 'odd-even' && body.dayMode !== 'numbered') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'dayMode must be "odd-even" or "numbered"' } }),
        });
      }
      if (body.dayCount !== undefined) {
        const count = Number(body.dayCount);
        if (!Number.isInteger(count) || count < 1 || count > 10) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ success: false, error: { message: 'dayCount must be an integer between 1 and 10' } }),
          });
        }
      }
      if (body.exerciseSwaps !== undefined && !isSwapMap(body.exerciseSwaps)) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'exerciseSwaps must be an object of day → { exerciseId: replacementId }' } }),
        });
      }
      if (body.workoutType !== undefined && (typeof body.workoutType !== 'string' || !body.workoutType)) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ success: false, error: { message: 'workoutType must be a non-empty string' } }),
        });
      }
      // Omitted fields keep their current values.
      const dayMode = body.dayMode ?? current.dayMode;
      const dayCount = body.dayCount !== undefined ? Number(body.dayCount) : current.dayCount;
      const swaps = body.exerciseSwaps !== undefined
        ? body.exerciseSwaps
        : (isSwapMap(current.exerciseSwaps) ? current.exerciseSwaps : {});
      const workoutType = body.workoutType !== undefined ? body.workoutType : current.workoutType;
      mockData.config = {
        dayMode,
        dayCount,
        days: dayMode === 'numbered'
          ? Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`)
          : ['Odd', 'Even'],
        exerciseSwaps: swaps,
        workoutType,
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
  mockData.entries = undefined;
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

globalThis.__TEST_MOCK_DATA__ = mockData;
