import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IUser } from './User.js';

export interface IBoard extends Document {
  title: string;
  description?: string;
  background?: string;
  owner: Types.ObjectId | IUser;
  members: Types.ObjectId[] | IUser[];
  workspace: Types.ObjectId | string;
  _destroy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const boardSchema = new Schema<IBoard>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    background: { type: String, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    _destroy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1 });
boardSchema.index({ members: 1 });
boardSchema.index({ title: 1 });


export const Board = mongoose.model<IBoard>('Board', boardSchema);
