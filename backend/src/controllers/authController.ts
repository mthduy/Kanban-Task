import bcrypt from 'bcrypt';
import type { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({ message: 'All required fields must be filled!' });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.username === username
            ? 'Username already exists'
            : 'Email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`,
    });

    return res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Registration error:', error);
    return next(error);
  }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'All required fields must be filled!' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password!' });
    }

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res.status(401).json({ message: 'Invalid username or password!' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_TOKEN_TTL,
    });

    return res.status(200).json({
      message: `User ${user.displayName} logged in successfully!`,
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(400).json({ message: 'Token not found!' });
    }

    //Delete refresh token from database
    await Session.deleteOne({ refreshToken: token });

    //Delete cookie on client side
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    return res.sendStatus(204);
  } catch (error) {
    console.error('Error in logout:', error);
    return next(error);
  }
};


export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Token does not exist.' });
    }

    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    if (session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired.' });
    }

    const user = await User.findById(session.userId).select('email');
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      return res.status(404).json({ message: 'User not found.' });
    }

    const accessToken = jwt.sign(
      { userId: session.userId, email: user.email },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Error in refreshToken:', error);
    return next(error);
  }
};
