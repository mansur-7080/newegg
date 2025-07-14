const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT Secret (production da environment variable bo'lishi kerak)
const JWT_SECRET = process.env.JWT_SECRET || 'ultramarket-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Password hash qilish
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Password tekshirish
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT token yaratish
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// JWT token tekshirish
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token yo\'q, kirish rad etildi'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token noto\'g\'ri'
    });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin huquqi kerak'
    });
  }
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
const validatePassword = (password) => {
  // Kamida 6 belgi
  return password && password.length >= 6;
};

// User input validation
const validateUserInput = (userData) => {
  const { email, password, firstName, lastName } = userData;
  const errors = [];

  if (!email || !validateEmail(email)) {
    errors.push('Email noto\'g\'ri formatda');
  }

  if (!password || !validatePassword(password)) {
    errors.push('Parol kamida 6 belgidan iborat bo\'lishi kerak');
  }

  if (!firstName || firstName.trim().length < 2) {
    errors.push('Ism kamida 2 belgidan iborat bo\'lishi kerak');
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.push('Familiya kamida 2 belgidan iborat bo\'lishi kerak');
  }

  return errors;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdmin,
  validateEmail,
  validatePassword,
  validateUserInput
};