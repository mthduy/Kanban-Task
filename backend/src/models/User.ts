import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  hashedPassword: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  avatarId?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    avatarId: {
      type: String,
    },
    phone: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);
// Indexes
// username and email should be unique and searched frequently
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
export default User;
