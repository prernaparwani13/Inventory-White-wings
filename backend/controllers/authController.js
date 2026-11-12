import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logActivity } from '../utils/auditLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'inventory_super_secret_key_123';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Check if it's the first user, default to Admin
    const userCount = await prisma.user.count();
    const assignedRole = userCount === 0 ? 'Admin' : (role || 'Staff');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: assignedRole,
      },
    });

    if (user) {
      await logActivity({
        userId: user.id,
        userName: user.name,
        action: 'USER_REGISTER',
        details: `Registered user: ${user.email} with role ${user.role}`,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          _id: user.id,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user.id),
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (user && isMatch) {
      await logActivity({
        userId: user.id,
        userName: user.name,
        action: 'USER_LOGIN',
        details: `User logged in: ${user.email}`,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          _id: user.id,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user.id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user) {
      res.json({
        success: true,
        data: {
          ...user,
          _id: user.id,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map(u => ({
      ...u,
      _id: u.id,
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
