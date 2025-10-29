// backend/routes/smsRoutes.js
const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Envia código de verificação
router.post('/send-code', smsController.sendVerificationCode);

// Verifica código
router.post('/verify-code', smsController.verifyCode);

// Reenvia código
router.post('/resend-code', smsController.resendCode);

module.exports = router;