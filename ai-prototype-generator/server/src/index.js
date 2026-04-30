import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import prototypeRoutes from './routes/prototype.js';
import authRoutes from './routes/auth.js';
import exportRoutes from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import connectDB from './config/db.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// ─── CORS ───────────────────────────────────────────────────────────────────
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001'
];

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In production, allow configured origins
    if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
      return callback(null, true);
    }
    return callback(null, true); // Dev mode: allow all
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// Global limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests. Please try again later.', details: 'rate_limited' } }
});

// Auth limiter: stricter — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many auth attempts. Please wait 15 minutes.', details: 'rate_limited' } }
});

// Generation limiter: prevent API abuse
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 generations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Generation limit reached. Please wait a moment.', details: 'rate_limited' } }
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(globalLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/prototype', prototypeRoutes);
app.use('/api/export', exportRoutes);
// Apply extra rate limiting on the generation endpoint to prevent API abuse
app.use('/api/prototype/generate', generateLimiter);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Proto-Gen Server v3.0 running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Auth: JWT (7d expiry)`);
  console.log(`   Rate limiting: enabled`);
  console.log(`   Export: ZIP download enabled via /api/export/zip\n`);
});
