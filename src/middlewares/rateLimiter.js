import rateLimit from 'express-rate-limit';
import { DEMO_MODE } from '../utils/db.js'

// Helper: no-op middleware
const noop = (_req, _res, next) => next()

// Global rate limiter
const globalLimiter = DEMO_MODE ? noop : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for voting
const voteLimiter = DEMO_MODE ? noop : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 vote attempts per windowMs
  message: 'Too many voting attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter for login/register
const authLimiter = DEMO_MODE ? noop : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export {
  globalLimiter,
  voteLimiter,
  authLimiter
};
