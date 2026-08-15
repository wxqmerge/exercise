import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

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

const __dirname = getCurrentDir(import.meta.url);
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use('/api', apiLimiter);
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

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    build: { hash: buildHash, ts: buildTs, full: buildFull },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (_req, res) => {
  const dayMode = process.env.DAY_MODE === 'numbered' ? 'numbered' : 'odd-even';
  const days = dayMode === 'numbered'
    ? Array.from(
        { length: Math.max(1, parseInt(process.env.DAY_COUNT || '3', 10) || 3) },
        (_, i) => `Day ${i + 1}`,
      )
    : ['Odd', 'Even'];
  res.json({ dayMode, days });
});

app.get('/api/admin/ping', requireAdminKey, (_req, res) => {
  res.json({ success: true, message: 'admin auth ok' });
});

const IMAGE_DIR = path.join(__dirname, '../../data/images');
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};
const IMAGE_URL_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);

app.get('/api/images', (_req, res) => {
  const images: Record<string, string> = {};
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    const dot = file.lastIndexOf('.');
    if (dot <= 0) continue;
    const id = file.substring(0, dot);
    images[id] = `/api/images/${encodeURIComponent(file)}`;
  }
  res.json(images);
});

app.post('/api/images/save', async (req, res) => {
  const { exerciseId, url } = req.body || {};
  if (typeof exerciseId !== 'string' || !/^[a-z0-9-]+$/.test(exerciseId)) {
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
  if (typeof exerciseId !== 'string' || !/^[a-z0-9-]+$/.test(exerciseId)) {
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

app.use('/api/images', express.static(IMAGE_DIR));

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
