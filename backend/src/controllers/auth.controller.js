const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/jwt.utils');
const { sendSuccess, sendError, sendCreated } = require('../utils/response.utils');
const logger = require('../config/logger');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 'Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store hashed refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });

    setRefreshCookie(res, refreshToken);

    logger.info(`New user registered: ${email}`);
    return sendCreated(res, { user, accessToken }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login and return tokens
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });

    setRefreshCookie(res, refreshToken);

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    logger.info(`User logged in: ${email}`);
    return sendSuccess(res, { user: safeUser, accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Issue new access token using refresh token cookie
 * @access  Public
 */
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return sendError(res, 'Refresh token not found', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.refreshToken) {
      return sendError(res, 'Session expired, please log in again', 401);
    }

    const tokenMatch = await bcrypt.compare(token, user.refreshToken);
    if (!tokenMatch) {
      return sendError(res, 'Refresh token mismatch', 401);
    }

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(newRefreshToken, 10) },
    });

    setRefreshCookie(res, newRefreshToken);

    return sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate refresh token
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
    clearRefreshCookie(res);
    logger.info(`User logged out: ${req.user.email}`);
    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged-in user
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return sendSuccess(res, { user }, 'User fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, getMe };
