import mongoose from "mongoose";


export type CreateCardBody = {
  title?: string;
  description?: string;
  position?: number;
  boardId?: string | mongoose.Types.ObjectId;
  /** Optional explicit status. If not provided, server will derive from list title. */
  status?: string;
};

export type UpdateCardBody = {
  title?: string;
  description?: string;
  position?: number;
  listId?: string | mongoose.Types.ObjectId;
  /** If provided, server will update card.status to match the target list's title */
  status?: string;
  completed?: boolean;
  members?: Array<string | mongoose.Types.ObjectId | { _id?: string }>;
  labels?: Array<{ color: string; name: string; _id?: string }>;
  /** ISO string for due date, or null to remove */
  dueDate?: string | null;
};
 export type UpdateCardPayload = Partial<{
    title: string;
    description: string;
    position: number;
    listId: mongoose.Types.ObjectId | string;
    status: string | null;
    completed: boolean;
    members: (mongoose.Types.ObjectId | string)[];
    labels: Array<{ color: string; name: string }>;
    dueDate: Date | null;
}>;