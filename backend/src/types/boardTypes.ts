import mongoose from 'mongoose';

export type CreateBoardBody = {
  title?: string;
  description?: string;
  members?: string | Array<string | { _id?: string }> ;
  workspace?: string | { _id?: string };
};

export type UpdateBoardBody = {
  title?: string;
  description?: string;
  members?: string | Array<string | { _id?: string }> ;
};

export interface CreateBoardInput {
    title?: string | undefined;
    description?: string | undefined;
    owner: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    workspace: mongoose.Types.ObjectId;
}

export interface WorkspaceLeanDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  owner: mongoose.Types.ObjectId;
  members?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}