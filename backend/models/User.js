// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
  },
  phone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    unique: true,
    match: [/^\+55\d{11}$/, 'Telefone brasileiro inválido'],
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    select: false, // Não retorna por padrão em queries
  },
  verificationExpires: {
    type: Date,
    select: false,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'partner', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  socialAccounts: {
    google: {
      id: String,
      email: String,
    },
    facebook: {
      id: String,
      email: String,
    },
    apple: {
      id: String,
      email: String,
    },
  },
}, {
  timestamps: true, // Adiciona createdAt e updatedAt
});

// Índices para melhor performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ phoneVerified: 1 });

// Método para verificar se o código de verificação ainda é válido
userSchema.methods.isVerificationCodeValid = function() {
  return this.verificationExpires && this.verificationExpires > new Date();
};

// Método para limpar dados sensíveis antes de retornar
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationCode;
  delete user.verificationExpires;
  return user;
};

// Hook para garantir que telefone não verificado não permita acesso completo
userSchema.pre('save', function(next) {
  // Se o telefone mudou, marca como não verificado
  if (this.isModified('phone') && !this.isNew) {
    this.phoneVerified = false;
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;