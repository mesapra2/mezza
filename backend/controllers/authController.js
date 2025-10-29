// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilioService = require('../services/twilioService');
const { generateVerificationCode } = require('../utils/codeGenerator');

// Registra novo usuário e envia SMS de verificação
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validações
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        message: 'Todos os campos são obrigatórios' 
      });
    }

    // Verifica se email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email já cadastrado' 
      });
    }

    // Verifica se telefone já existe
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ 
        message: 'Telefone já cadastrado' 
      });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gera código de verificação
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Cria usuário
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      verificationCode,
      verificationExpires,
      phoneVerified: false,
    });

    await user.save();

    // Envia SMS de verificação
    try {
      await twilioService.sendVerificationSMS(phone, verificationCode);
    } catch (smsError) {
      console.error('Erro ao enviar SMS:', smsError);
      // Não falha o registro se o SMS não for enviado
      // O usuário pode solicitar reenvio
    }

    res.status(201).json({
      message: 'Usuário registrado. Verifique seu telefone.',
      userId: user._id,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ 
      message: 'Erro ao registrar usuário',
      error: error.message 
    });
  }
};

// Verifica código SMS
exports.verifyPhone = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ 
        message: 'UserId e código são obrigatórios' 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ 
        message: 'Telefone já verificado' 
      });
    }

    // Verifica se o código expirou
    if (user.verificationExpires < new Date()) {
      return res.status(400).json({ 
        message: 'Código expirado. Solicite um novo código.' 
      });
    }

    // Verifica se o código está correto
    if (user.verificationCode !== code) {
      return res.status(400).json({ 
        message: 'Código inválido' 
      });
    }

    // Marca telefone como verificado
    user.phoneVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Gera token JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Telefone verificado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar telefone',
      error: error.message 
    });
  }
};

// Reenvia código de verificação
exports.resendCode = async (req, res) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      return res.status(400).json({ 
        message: 'UserId e telefone são obrigatórios' 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ 
        message: 'Telefone já verificado' 
      });
    }

    // Gera novo código
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Envia SMS
    await twilioService.sendVerificationSMS(phone, verificationCode);

    res.json({
      message: 'Código reenviado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao reenviar código:', error);
    res.status(500).json({ 
      message: 'Erro ao reenviar código',
      error: error.message 
    });
  }
};

// Verifica status de verificação do telefone
exports.checkVerification = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    res.json({
      phoneVerified: user.phoneVerified,
      phone: user.phone,
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar status',
      error: error.message 
    });
  }
};