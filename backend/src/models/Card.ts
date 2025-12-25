import mongoose, { Schema, Types } from 'mongoose';
import type { Document } from 'mongoose';
import type { IList } from './List.js';
import type { IBoard } from './Board.js';
import type { IUser } from './User.js';

export interface ICard extends Document {
  title: string;
  description?: string;
  listId: Types.ObjectId | IList;
  boardId: Types.ObjectId | IBoard;
  status?: string;
  labels: Array<{
    _id?: Types.ObjectId;
    color: string;
    name: string;
  }>;
  comments?: Array<{
    _id?: Types.ObjectId;
    author?: Types.ObjectId | IUser;
    text: string;
    createdAt?: Date;
  }>;
  activities?: Array<{
    _id?: Types.ObjectId;
    type: 'label' | 'member' | 'update' | 'complete' | 'incomplete' | 'created';
    user?: Types.ObjectId | IUser;
    text: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }>;
  attachments?: Array<{
    _id?: Types.ObjectId;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedBy?: Types.ObjectId | IUser;
    fileUrl: string;
    createdAt?: Date;
  }>;
  dueDate?: Date;
  members: Types.ObjectId[] | IUser[];
  createdBy?: Types.ObjectId | IUser;
  completed: boolean;
  _destroy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<ICard>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    labels: [{
      color: { type: String, required: true },
      name: { type: String, required: true, trim: true }
    }],
    comments: [{
      author: { type: Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    activities: [{
      type: { 
        type: String, 
        enum: ['label', 'member', 'update', 'complete', 'incomplete', 'created'],
        required: true 
      },
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true, trim: true },
      metadata: { type: Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now }
    }],
    attachments: [{
      fileName: { type: String, required: true, trim: true },
      fileSize: { type: Number, required: true },
      fileType: { type: String, required: true, trim: true },
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      fileUrl: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    dueDate: { type: Date },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Status is derived from the list title (e.g., "To Do", "In Progress", "Done")
    status: { type: String, trim: true },
    // position: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completed: { type: Boolean, default: false },
    _destroy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
// Fast lookup of cards in a board/list and ordering by position
cardSchema.index({ boardId: 1 });
cardSchema.index({ listId: 1 });
cardSchema.index({ members: 1 });
cardSchema.index({ createdAt: 1 });
cardSchema.index({ status: 1 });
cardSchema.index({ dueDate: 1 });
cardSchema.index({ 'labels.name': 1 });

export const Card = mongoose.model<ICard>('Card', cardSchema);
