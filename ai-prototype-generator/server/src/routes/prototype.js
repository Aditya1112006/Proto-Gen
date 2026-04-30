/**
 * Prototype Routes — /api/prototype
 *
 * Thin wiring layer: HTTP verb + path + middleware → controller function.
 * No business logic lives here.
 */

import express from 'express';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import {
  generate,
  clearSession,
  getSession,
  validatePrompt,
  generateCode,
  getHistory,
  deleteSession,
  ragSearch,
  ragStats,
} from '../controllers/PrototypeController.js';

const router = express.Router();

// Core generation pipeline
router.post('/generate',  optionalAuth, generate);
router.post('/code',      generateCode);
router.post('/clear',     clearSession);
router.post('/validate',  validatePrompt);

// Session management
router.get('/session/:sessionId',    getSession);
router.delete('/session/:sessionId', requireAuth, deleteSession);

// User history (auth-gated)
router.get('/history', requireAuth, getHistory);

// RAG knowledge base (diagnostic)
router.post('/rag-search', ragSearch);
router.get('/rag-stats',   ragStats);

export default router;
