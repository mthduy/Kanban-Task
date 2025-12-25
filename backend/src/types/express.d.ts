import type { IUser } from '../models/User';
import type mongoose from 'mongoose';
import type { BoardRole } from './boardRoles';

declare global {
  namespace Express {
    interface Request {
      // user may be a mongoose document IUser or a lightweight object containing at least _id
      user?: IUser & { _id?: string | mongoose.Types.ObjectId };
      
      // Board permission info (set by requireBoardPermission middleware)
      boardInfo?: {
        board: any;
        role: BoardRole;
      };
    }
  }
}

export {};
