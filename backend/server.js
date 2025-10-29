// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'https://app.mesapra2.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Mesapra2 Backend rodando!',
    timestamp: new Date().toISOString()
  });
});

// Importa as rotas
const smsRoutes = require('./routes/smsRoutes');

// Usa as rotas
app.use('/sms', smsRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Rota não encontrada',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Twilio configurado: ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '❌'}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});