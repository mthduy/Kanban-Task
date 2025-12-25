import mongoose, { Schema } from 'mongoose';

export interface IInvitation extends mongoose.Document {
  board: mongoose.Types.ObjectId;
  invitedEmail: string;
  inviter: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    invitedEmail: { type: String, required: true, lowercase: true, trim: true },
    inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
export default Invitation;
