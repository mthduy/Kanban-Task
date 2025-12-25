import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  owner: mongoose.Types.ObjectId;
  members?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

WorkspaceSchema.index({ owner: 1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
