import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type:
    | 'workspace_invite'
    | 'workspace_remove'
    | 'workspace_deleted'
    | 'board_invitation'
    | 'board_member_added'
    | 'board_member_removed'
    | 'board_member_left'
    | 'board_deleted'
    | 'card_assigned'
    | 'card_moved'
    | 'card_deleted'
    | 'card_comment'
    | 'board_shared'
    | 'list_created'
    | 'list_updated'
    | 'list_deleted'
    | 'card_renamed'
    | 'card_due_reminder';
  message: string;
  relatedWorkspace?: mongoose.Types.ObjectId;
  relatedBoard?: mongoose.Types.ObjectId;
  relatedCard?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'workspace_invite',
        'workspace_remove',
        'workspace_deleted',
        'board_invitation',
        'board_member_added',
        'board_member_removed',
        'board_member_left',
        'board_deleted',
        'card_assigned',
        'card_moved',
        'card_deleted',
        'card_comment',
        'board_shared',
        'list_created',
        'list_updated',
        'list_deleted',
        'card_renamed',
        'card_due_reminder',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedWorkspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    relatedBoard: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
    },
    relatedCard: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
