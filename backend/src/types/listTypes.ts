import mongoose from "mongoose"; 
export type UpdateListPayload = Partial<{
      title: string;
    }>;