import type { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Board } from '../models/Board.js';
import { Workspace } from '../models/Workspace.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { createNotification } from './notificationController.js';

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const inviteMemberToBoard = async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    const { email } = req.body;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });
    if (!email || typeof email !== 'string' || !email.includes('@')) 
      return res.status(400).json({ message: 'Email không hợp lệ' });
    if (!mongoose.isValidObjectId(boardId)) 
      return res.status(400).json({ message: 'Board ID không hợp lệ' });

    const board = await Board.findById(boardId).populate('owner', 'displayName username email');
    if (!board) 
      return res.status(404).json({ message: 'Không tìm thấy board' });

    const ownerId = typeof board.owner === 'object' && board.owner?._id ? board.owner._id.toString() : board.owner?.toString();
    const isOwner = ownerId === userId.toString();
    
    // CHỈ OWNER mới được mời member (kiểm tra chặt)
    if (!isOwner) 
      return res.status(403).json({ message: 'Chỉ chủ sở hữu board mới có quyền mời thành viên' });

    const invitedEmail = email.toLowerCase().trim();

    // KIỂM TRA USER TỒN TẠI
    const invitedUser = await User.findOne({ email: invitedEmail });
    if (!invitedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng với email này' });
    }

    // SECURITY: KIỂM TRA USER CÓ THUỘC WORKSPACE KHÔNG
    if (board.workspace) {
      const workspace = await Workspace.findById(board.workspace).lean();
      if (workspace) {
        const workspaceMemberIds = new Set<string>([
          String(workspace.owner),
          ...(workspace.members || []).map((m) => String(m)),
        ]);
        
        const invitedUserId = String(invitedUser._id);
        if (!workspaceMemberIds.has(invitedUserId)) {
          return res.status(403).json({ 
            message: 'Không thể mời người dùng không thuộc workspace vào board' 
          });
        }
      }
    }

    // KIỂM TRA ĐÃ LÀ OWNER
    if (ownerId && ownerId === (invitedUser._id as Types.ObjectId).toString()) {
      return res.status(400).json({ message: 'Người dùng này là chủ sở hữu board' });
    }

    // KIỂM TRA ĐÃ LÀ MEMBER
    const alreadyMember = (board.members || []).some((member) => {
      const memberId = typeof member === 'object' && member._id ? member._id.toString() : member?.toString();
      return memberId === ((invitedUser._id as Types.ObjectId).toString());
    });
    if (alreadyMember) {
      return res.status(400).json({ message: 'Người dùng này đã là thành viên của board' });
    }

    // KIỂM TRA LỜI MỜI ĐANG CHỞ XỦ LÝ
    const pendingInvitation = await Invitation.findOne({
      board: board._id,
      invitedEmail,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    if (pendingInvitation) {
      return res.status(400).json({ message: 'Đã có lời mời đang chờ xử lý cho email này' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(
      Date.now() + (process.env.INVITE_EXPIRES_HOURS ? Number(process.env.INVITE_EXPIRES_HOURS) * 3600 * 1000 : 24 * 3600 * 1000)
    );

    const invitation = await Invitation.create({
      board: board._id,
      invitedEmail,
      inviter: userId,
      token,
      expiresAt,
      used: false,
    });

    // Notify the invited user (store board title as message)
    await createNotification({
      recipient: String(invitedUser._id),
      sender: String(userId),
      type: 'board_invitation',
      message: board.title,
      relatedBoard: String(board._id),
    });

    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const acceptUrl = `${frontendUrl}/invitations/accept?token=${token}`;

    if (transporter) {
      try {
        const inviterName = req.user?.displayName || req.user?.username || 'Một thành viên';
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: invitedEmail,
          subject: `Lời mời tham gia board "${board.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
              <h2 style="color: #38bdf8;">Bạn được mời tham gia board</h2>
              <p><strong>${inviterName}</strong> đã mời bạn tham gia board <strong>"${board.title}"</strong>.</p>
              ${board.description ? `<p style="color:#555">${board.description}</p>` : ''}
              <div style="margin: 24px 0;">
                <a href="${acceptUrl}" style="background: linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%); color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px;">Chấp nhận lời mời</a>
              </div>
              <p style="color:#666; font-size:13px;">Nếu link chưa hoạt động, copy: <br/><a href="${acceptUrl}">${acceptUrl}</a></p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions); 
      } catch (emailErr) {
        console.error('Failed to send invite email', emailErr);
        
      }
    }

    return res.status(201).json({ message: 'Lời mời đã được tạo', invitationId: invitation._id, invitedEmail });
  } catch (error) {
    console.error('inviteMemberToBoard error', error);
    return res.status(500).json({message: "Lỗi server"}); 
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user?._id;
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });
    if (!token || typeof token !== 'string') 
      return res.status(400).json({ message: 'Token không hợp lệ' });

    const invitation = await Invitation.findOne({ token });
    if (!invitation) 
      return res.status(404).json({ message: 'Lời mời không tồn tại' });
    if (invitation.used) 
      return res.status(400).json({ message: 'Lời mời đã được sử dụng' });
    if (invitation.expiresAt.getTime() < Date.now()) 
      return res.status(400).json({ message: 'Lời mời đã hết hạn' });

    const user = await User.findById(userId);
    if (!user) 
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    if (user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      return res.status(403).json({ message: 'Email của bạn không khớp với lời mời' });
    }

    const board = await Board.findById(invitation.board);
    if (!board) 
      return res.status(404).json({ message: 'Board không tồn tại' });

    const userObjId = new mongoose.Types.ObjectId(userId);

    // remove the invitation after it's consumed to prevent reuse

    // Get ALL current members BEFORE adding new user (to notify them)
    const existingMemberIds = (board.members || []).map(String);
    const ownerId = String(board.owner);
    const allRecipientIds = new Set([...existingMemberIds, ownerId]);
    allRecipientIds.delete(String(userId)); // Don't notify the person joining
    
    // Now add user to board
    await Board.findByIdAndUpdate(String(board._id), { $addToSet: { members: userObjId } });

    const updatedBoard = await Board.findById(board._id).populate('members', 'displayName username avatarUrl email');

    // Notify ALL existing members + owner that someone joined
    const newMemberName = user.displayName || user.username;
    
    for (const memberId of Array.from(allRecipientIds)) {
      await createNotification({
        recipient: memberId,
        sender: String(userId),
        type: 'board_member_added',
        message: newMemberName,
        relatedBoard: String(board._id),
      });
    }
    // Delete the invitation after processing so it cannot be reused
    try {
      await Invitation.findByIdAndDelete(invitation._id);
    } catch (delErr) {
      console.error('Failed to delete invitation after acceptance', delErr);
    }
    return res.status(200).json({ message: 'Đã tham gia board', board: updatedBoard });
  } catch (error) {
    console.error('acceptInvitation error', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};
