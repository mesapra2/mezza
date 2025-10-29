// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rotas públicas
router.post('/register', authController.register);
router.post('/verify-phone', authController.verifyPhone);
router.post('/resend-code', authController.resendCode);
router.get('/check-verification/:userId', authController.checkVerification);

// Rotas protegidas (requerem autenticação)
// Adicione aqui rotas que precisam de token JWT

module.exports = router;