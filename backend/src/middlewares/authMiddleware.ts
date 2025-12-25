import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protectedRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        message: 'Access token not found!',
      });
    }

    // Xác nhận token hợp lệ (synchronous verify)
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(403).json({
          message: 'Access token expired!',
        });
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({
          message: 'Access token invalid!',
        });
      }
      throw err; // Re-throw unexpected errors
    }

    // Validate decoded token structure
    if (!decoded || typeof decoded === 'string') {
      return res.status(403).json({
        message: 'Invalid token structure!',
      });
    }

    const { userId } = decoded as jwt.JwtPayload & { userId?: string };

    if (!userId) {
      return res.status(403).json({
        message: 'Token does not contain userId!',
      });
    }

    // Tìm user
    const user = await User.findById(userId).select('-hashedPassword');
    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying JWT in authMiddleware:', error);
    return res.status(500).json({
      message: 'Server error, please try again later!',
    });
  }
};
