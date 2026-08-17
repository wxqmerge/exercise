import dotenv from 'dotenv';

import express, { Application, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import http from 'http';

import { requireAdminKey } from './middleware/auth.middleware.js';
import { buildVersion } from './utils/version.js';
import { getCurrentDir } from './utils/path.js';
import { readJsonFile } from './utils/fs.js';

const __dirname = getCurrentDir(import.meta.url);
dotenv.config({ path: path.join(__dirname, '../.env') });
const isDev = process.env.NODE_ENV !== 'production';

const { hash: buildHash, ts: buildTs, full: buildFull } = buildVersion();

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.set('X-Build-Version', buildHash);
  res.set('X-Build-Timestamp', buildTs);
  next();
});

app.use((req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    console.log(`[API] ${clientIp} ${req.method.padEnd(4)} ${req.path.padEnd(35)} ${status.toString().padStart(3)} ${duration}ms`);
    return originalEnd.call(res, chunk, encoding, callback);
  };
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, error: { message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(o => o) || ['*'];
app.use(cors({
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? '*' : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-App-Key'],
}));

const APP_KEY = process.env.APP_KEY || '';

app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
  if (!APP_KEY) {
    next();
    return;
  }
  if (req.headers['x-app-key'] !== APP_KEY) {
    res.status(401).json({ success: false, error: { message: 'Invalid key' } });
    return;
  }
  next();
});

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    build: { hash: buildHash, ts: buildTs, full: buildFull },
    timestamp: new Date().toISOString(),
  });
});

const CONFIG_FILE = path.join(__dirname, '../../data/config.json');

const readConfigFile = (): Record<string, unknown> => readJsonFile(CONFIG_FILE);

const isSwapMap = (v: unknown): v is Record<string, Record<string, string>> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.values(v).every(daySwaps => {
    if (!daySwaps || typeof daySwaps !== 'object' || Array.isArray(daySwaps)) return false;
    return Object.values(daySwaps).every(id => typeof id === 'string');
  });
};

const buildConfig = (overrides: Record<string, unknown>) => {
  const envMode = process.env.DAY_MODE === 'numbered' ? 'numbered' : 'odd-even';
  const dayMode = overrides.dayMode === 'numbered' || overrides.dayMode === 'odd-even'
    ? overrides.dayMode
    : envMode;
  const envCount = Math.max(1, parseInt(process.env.DAY_COUNT || '3', 10) || 3);
  const fileCount = parseInt(String(overrides.dayCount ?? ''), 10);
  const dayCount = Number.isInteger(fileCount) && fileCount >= 1 && fileCount <= 10
    ? fileCount
    : envCount;
  const days = dayMode === 'numbered'
    ? Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`)
    : ['Odd', 'Even'];
  const exerciseSwaps = isSwapMap(overrides.exerciseSwaps) ? overrides.exerciseSwaps : {};
  const workoutType = typeof overrides.workoutType === 'string' && overrides.workoutType
    ? overrides.workoutType
    : 'dumbbells';
  return { dayMode, dayCount, days, exerciseSwaps, workoutType };
};

app.get('/api/config', (_req, res) => {
  res.json(buildConfig(readConfigFile()));
});

app.put('/api/config', (req, res) => {
  const body = req.body || {};
  const current = buildConfig(readConfigFile());
  if (body.dayMode !== undefined && body.dayMode !== 'odd-even' && body.dayMode !== 'numbered') {
    res.status(400).json({ success: false, error: { message: 'dayMode must be "odd-even" or "numbered"' } });
    return;
  }
  if (body.dayCount !== undefined) {
    const count = Number(body.dayCount);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      res.status(400).json({ success: false, error: { message: 'dayCount must be an integer between 1 and 10' } });
      return;
    }
  }
  if (body.exerciseSwaps !== undefined && !isSwapMap(body.exerciseSwaps)) {
    res.status(400).json({ success: false, error: { message: 'exerciseSwaps must be an object of day → { exerciseId: replacementId }' } });
    return;
  }
  if (body.workoutType !== undefined && (typeof body.workoutType !== 'string' || !body.workoutType)) {
    res.status(400).json({ success: false, error: { message: 'workoutType must be a non-empty string' } });
    return;
  }
  // Omitted fields keep their current values.
  const dayMode = body.dayMode ?? current.dayMode;
  const dayCount = body.dayCount !== undefined ? Number(body.dayCount) : current.dayCount;
  const exerciseSwaps = body.exerciseSwaps !== undefined ? body.exerciseSwaps : current.exerciseSwaps;
  const workoutType = body.workoutType !== undefined ? body.workoutType : current.workoutType;
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ dayMode, dayCount, exerciseSwaps, workoutType }, null, 2));
  } catch {
    res.status(500).json({ success: false, error: { message: 'Could not save config' } });
    return;
  }
  res.json(buildConfig({ dayMode, dayCount, exerciseSwaps, workoutType }));
});

app.get('/api/admin/ping', requireAdminKey, (_req, res) => {
  res.json({ success: true, message: 'admin auth ok' });
});

const ENTRIES_FILE = path.join(__dirname, '../../data/entries.json');

const readEntriesFile = (): Record<string, any> => readJsonFile(ENTRIES_FILE);

const isValueArray = (v: unknown) =>
  Array.isArray(v) && v.length <= 3 && v.every(x => typeof x === 'string' || typeof x === 'number');

app.get('/api/entries', (_req, res) => {
  res.json(readEntriesFile());
});

app.put('/api/entries', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ success: false, error: { message: 'entries must be an object' } });
    return;
  }
  const next: Record<string, any> = {};
  for (const [type, days] of Object.entries(body)) {
    if (!days || typeof days !== 'object' || Array.isArray(days)) {
      res.status(400).json({ success: false, error: { message: `Invalid entries for type ${type}` } });
      return;
    }
    next[type] = {};
    for (const [day, exercises] of Object.entries(days as Record<string, any>)) {
      if (!exercises || typeof exercises !== 'object' || Array.isArray(exercises)) {
        res.status(400).json({ success: false, error: { message: `Invalid entries for ${type} ${day}` } });
        return;
      }
      next[type][day] = {};
      for (const [exId, entry] of Object.entries(exercises as Record<string, any>)) {
        if (!validExerciseId(exId)) {
          res.status(400).json({ success: false, error: { message: `Invalid exercise id: ${exId}` } });
          return;
        }
        if (!entry || typeof entry !== 'object' || !isValueArray(entry.reps) || !isValueArray(entry.weights)) {
          res.status(400).json({ success: false, error: { message: `Invalid entry for ${exId}` } });
          return;
        }
        next[type][day][exId] = {
          reps: entry.reps.map(String).slice(0, 3),
          weights: entry.weights.map(String).slice(0, 3),
        };
      }
    }
  }
  try {
    fs.mkdirSync(path.dirname(ENTRIES_FILE), { recursive: true });
    fs.writeFileSync(ENTRIES_FILE, JSON.stringify(next, null, 2));
  } catch {
    res.status(500).json({ success: false, error: { message: 'Could not save entries' } });
    return;
  }
  res.json({ success: true });
});

const IMAGE_DIR = path.join(__dirname, '../../data/images');
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

app.use('/api/images', express.static(IMAGE_DIR));

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};
const IMAGE_URL_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const validExerciseId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-z0-9-]+$/.test(id);

const listImageFiles = (): { id: string; file: string }[] => {
  const files: { id: string; file: string }[] = [];
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    const dot = file.lastIndexOf('.');
    if (dot <= 0) continue;
    files.push({ id: file.substring(0, dot), file });
  }
  return files;
};

app.get('/api/images', (_req, res) => {
  const images: Record<string, string> = {};
  for (const { id, file } of listImageFiles()) {
    images[id] = `/api/images/${encodeURIComponent(file)}`;
  }
  res.json(images);
});

app.post('/api/images/save', async (req, res) => {
  const { exerciseId, url } = req.body || {};
  if (!validExerciseId(exerciseId)) {
    res.status(400).json({ success: false, error: { message: 'Invalid exercise id' } });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    res.status(400).json({ success: false, error: { message: 'Invalid URL' } });
    return;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ success: false, error: { message: 'Only http/https URLs are allowed' } });
    return;
  }
  try {
    const resp = await fetch(parsed, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      res.status(502).json({ success: false, error: { message: `Download failed (HTTP ${resp.status})` } });
      return;
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(413).json({ success: false, error: { message: 'Image too large (max 10 MB)' } });
      return;
    }
    const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim();
    const urlExt = parsed.pathname.split('.').pop()?.toLowerCase() || '';
    const ext = IMAGE_EXT_BY_TYPE[contentType] || (IMAGE_URL_EXTS.has(urlExt) ? urlExt : 'jpg');
    const file = `${exerciseId}.${ext}`;
    fs.writeFileSync(path.join(IMAGE_DIR, file), buffer);
    res.json({ success: true, url: `/api/images/${encodeURIComponent(file)}` });
  } catch {
    res.status(502).json({ success: false, error: { message: 'Download failed' } });
  }
});

app.post('/api/images/upload', (req, res) => {
  const { exerciseId, dataUrl } = req.body || {};
  if (!validExerciseId(exerciseId)) {
    res.status(400).json({ success: false, error: { message: 'Invalid exercise id' } });
    return;
  }
  if (typeof dataUrl !== 'string') {
    res.status(400).json({ success: false, error: { message: 'Missing image data' } });
    return;
  }
  const match = /^data:image\/(jpeg|png|gif|webp|bmp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ success: false, error: { message: 'Unsupported image type' } });
    return;
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
    res.status(413).json({ success: false, error: { message: 'Image too large (max 10 MB)' } });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const file = `${exerciseId}.${ext}`;
  fs.writeFileSync(path.join(IMAGE_DIR, file), buffer);
  res.json({ success: true, url: `/api/images/${encodeURIComponent(file)}` });
});

app.get('/api/export', (_req, res) => {
  const images: Record<string, { filename: string; mimeType: string; data: string }> = {};
  for (const { id, file } of listImageFiles()) {
    const ext = file.substring(file.lastIndexOf('.') + 1).toLowerCase();
    if (!IMAGE_URL_EXTS.has(ext)) continue;
    images[id] = {
      filename: file,
      mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
      data: fs.readFileSync(path.join(IMAGE_DIR, file)).toString('base64'),
    };
  }
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), images });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="exercise-backup.json"');
  res.send(payload);
});

app.post('/api/import', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || body.version !== 1 || !body.images || typeof body.images !== 'object') {
    res.status(400).json({ success: false, error: { message: 'Invalid backup file' } });
    return;
  }
  const imported: string[] = [];
  const errors: string[] = [];
  for (const [id, entry] of Object.entries(body.images as Record<string, any>)) {
    if (!validExerciseId(id)) {
      errors.push(`Invalid exercise id: ${id}`);
      continue;
    }
    if (!entry || typeof entry.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(entry.data)) {
      errors.push(`Bad image data for ${id}`);
      continue;
    }
    const buffer = Buffer.from(entry.data, 'base64');
    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      errors.push(`Image too large: ${id}`);
      continue;
    }
    const ext = typeof entry.filename === 'string' ? entry.filename.split('.').pop()?.toLowerCase() : undefined;
    const safeExt = ext && IMAGE_URL_EXTS.has(ext) ? ext : 'jpg';
    fs.writeFileSync(path.join(IMAGE_DIR, `${id}.${safeExt}`), buffer);
    imported.push(id);
  }
  res.json({ success: true, imported, errors });
});

app.delete('/api/images/:file', (req, res) => {
  const file = req.params.file;
  if (!/^[\w][\w.-]*$/.test(file) || file.includes('..')) {
    res.status(400).json({ success: false, error: { message: 'Invalid file name' } });
    return;
  }
  const target = path.join(IMAGE_DIR, file);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    fs.unlinkSync(target);
  }
  res.json({ success: true });
});

if (isDev) {
  app.use((_req, _res, next) => {
    const req = _req as http.IncomingMessage;
    const res = _res as http.ServerResponse;
    const url = req.url || '/';
    if (url.startsWith('/api') || url.startsWith('/health')) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: { message: 'Not found' } }));
      return;
    }
    const proxyReq = http.request(
      { hostname: 'localhost', port: 5173, path: req.url || '/', method: req.method, headers: { ...req.headers, host: 'localhost:5173' } },
      proxyRes => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error] Vite server unreachable:', err.message);
      res.statusCode = 502;
      res.end('Bad Gateway: Vite dev server is not responding.');
    });

    req.pipe(proxyReq);
  });
} else {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

const server = http.createServer(app);
const isMainModule = process.argv[1] && (path.basename(process.argv[1]).endsWith('index.ts') || path.basename(process.argv[1]).endsWith('index.js'));
if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  EXERCISE APP SERVER`);
    console.log(`========================================\n`);
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Build: ${buildFull}`);
    console.log(`✓ CORS Origins: ${process.env.CORS_ORIGINS || '*'}`);
    console.log(`✓ App Key: ${process.env.APP_KEY ? 'Enabled' : 'Disabled (no key required)'}`);
    console.log(`✓ Admin API Key: ${process.env.ADMIN_API_KEY ? 'Enabled' : '⚠️  NOT SET'}`);
    console.log(`========================================\n`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[SHUTDOWN] Forced exit after timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
