// backend/routes/dashboardRoutes.js
// Exemplo de como proteger rotas que requerem telefone verificado

const express = require('express');
const router = express.Router();
const { protect, requirePhoneVerification } = require('../middleware/authMiddleware');

// Rota que requer apenas autenticação (token JWT)
router.get('/profile', protect, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        phoneVerified: req.user.phoneVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao buscar perfil',
      error: error.message 
    });
  }
});

// Rota que requer autenticação E telefone verificado
router.get('/dashboard', protect, requirePhoneVerification, async (req, res) => {
  try {
    // Aqui você só chega se o usuário estiver autenticado
    // E se o telefone estiver verificado
    res.json({
      message: 'Bem-vindo ao Dashboard!',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
      // Dados do dashboard...
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao buscar dashboard',
      error: error.message 
    });
  }
});

// Rota para listar eventos (requer telefone verificado)
router.get('/events', protect, requirePhoneVerification, async (req, res) => {
  try {
    // Buscar eventos do banco de dados
    // const events = await Event.find({ active: true });
    
    res.json({
      events: [],
      message: 'Lista de eventos disponíveis',
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao buscar eventos',
      error: error.message 
    });
  }
});

// Rota para criar reserva (requer telefone verificado)
router.post('/reservations', protect, requirePhoneVerification, async (req, res) => {
  try {
    const { eventId, guests } = req.body;
    
    // Criar reserva
    // const reservation = await Reservation.create({
    //   userId: req.user._id,
    //   eventId,
    //   guests,
    // });
    
    res.status(201).json({
      message: 'Reserva criada com sucesso!',
      // reservation,
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao criar reserva',
      error: error.message 
    });
  }
});

module.exports = router;