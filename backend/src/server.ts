import { connectDB } from './configs/db.js';
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoute.js';
import cookieParser from 'cookie-parser';
import userRoute from './routes/userRoute.js';
import boardRoute from './routes/boardRoute.js';
import workspaceRoute from './routes/workspaceRoute.js';
import invitationRoute from './routes/invitationRoute.js';
import notificationRoute from './routes/notificationRoute.js';
import reminderRoute from './routes/reminderRoute.js';
// list routes are mounted through `boardRoute` to keep nested routing consistent
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import { mongoErrorHandler } from './utils/mongoError.js';
import { downloadAttachment } from './controllers/cardAttachmentController.js';
import { ReminderScheduler } from './schedulers/reminderScheduler.js';
import { createServer } from 'http';
import { initializeSocketIO, setSocketInstance } from './socket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server and initialize Socket.IO
const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);
setSocketInstance(io);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL, // cổng frontend của bạn
    credentials: true, // nếu dùng cookie/token
  })
);

app.use('/api/auth', authRoutes);

// Public route for downloading attachments (no auth required)
app.get('/api/attachments/download/:fileName', downloadAttachment);

app.use(protectedRoute);
app.use('/api/boards', boardRoute);
app.use('/api/users', userRoute);
app.use('/api/workspaces', workspaceRoute);
app.use('/api/invitations', invitationRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/reminders', reminderRoute);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Server is running successfully!',
  });
});

// Error handling middleware
app.use(mongoErrorHandler);

connectDB().then(() => {
  // Start the reminder scheduler after database connection
  ReminderScheduler.start();
  
  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Socket.IO server initialized');
    console.log('Due date reminder scheduler started');
  });
});