import type { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import User, { type IUser } from '../models/User.js';



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
  secure: true, // always use HTTPS
});


//check user
export const authMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error in authMe:', error);
    return next(error);
  }
};

// Find user by email
export const findUserByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('_id username email displayName avatarUrl')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error finding user by email:', error);
    return next(error);
  }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { displayName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('_id username email displayName avatarUrl')
      .limit(20)
      .lean();

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return next(error);
  }
};

// export const test = async (req: Request, res: Response) => {
//   return res.sendStatus(204);
// };

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as IUser | undefined;
    if (!user) 
      return res.status(404).json({ message: 'User not found' });

    const { displayName, email, phone, avatarUrl } = req.body;
    const allowedFields: Partial<Pick<IUser, 'displayName' | 'email' | 'phone' | 'avatarUrl'>> = {};

    if (typeof displayName === 'string') 
      allowedFields.displayName = displayName;
    if (typeof email === 'string') 
      allowedFields.email = email;
    if (typeof phone === 'string') 
      allowedFields.phone = phone;
    if (typeof avatarUrl === 'string') 
      allowedFields.avatarUrl = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(
      user._id, 
      { $set: allowedFields }, 
      { new: true } // return the updated document

    ).select('-hashedPassword'); // don't return password to client

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return next(error);

  }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ensure Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary env vars missing');
      return res.status(500).json({ message: 'Cloudinary not configured on server' });
    }
  const user = req.user as IUser | undefined;
  if (!user) 
    return res.status(404).json({ message: 'User not found' });

    if (!req.file || !req.file.buffer)
      return res.status(400).json({ message: 'No file uploaded' });

    const buffer = req.file.buffer;

    try {
      //delete previous avatar if exists
      if (user.avatarId) {
        await cloudinary.uploader.destroy(user.avatarId).catch(() => {});
      }
    } catch (e) {
      console.error('Error deleting previous avatar:', e);
    }

    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
         folder: 'avatars', 
         resource_type: 'image' 
        }, (error, result) => {
        if (error) 
          return reject(error);
        resolve(result as { secure_url?: string; public_id?: string });
      });
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });

    const avatarUrl = uploadResult?.secure_url;
    const avatarId = uploadResult?.public_id;

    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: { avatarUrl, avatarId } }, { new: true }).select('-hashedPassword');

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return next(error);
  }
};
