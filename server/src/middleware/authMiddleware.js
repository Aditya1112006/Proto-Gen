import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware: requireAuth
 * Verifies JWT. Rejects if missing or invalid.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please login.', details: 'unauthorized' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User no longer exists.', details: 'unauthorized' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token.', details: 'unauthorized' }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired. Please login again.', details: 'token_expired' }
      });
    }
    next(error);
  }
};

/**
 * Middleware: optionalAuth
 * Tries to verify JWT but doesn't reject if missing.
 * Attaches user to req if available, otherwise req.user = null.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    req.user = user || null;
    next();
  } catch {
    // Token invalid or expired — treat as guest
    req.user = null;
    next();
  }
};
