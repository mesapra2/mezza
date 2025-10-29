// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware para proteger rotas que requerem autenticação
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verifica se o token está no header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Não autorizado. Token não fornecido.' 
      });
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Conta desativada' 
      });
    }

    // Adiciona o usuário à requisição
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expirado' 
      });
    }

    res.status(500).json({ 
      message: 'Erro na autenticação',
      error: error.message 
    });
  }
};

/**
 * Middleware para verificar se o telefone foi verificado
 * Use após o middleware protect
 */
exports.requirePhoneVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado' 
      });
    }

    if (!req.user.phoneVerified) {
      return res.status(403).json({ 
        message: 'Telefone não verificado. Complete a verificação para continuar.',
        requiresPhoneVerification: true,
        userId: req.user._id,
        phone: req.user.phone,
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar telefone:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar telefone',
      error: error.message 
    });
  }
};

/**
 * Middleware para verificar se o usuário tem permissão específica
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Não autorizado' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Você não tem permissão para acessar este recurso' 
      });
    }

    next();
  };
};