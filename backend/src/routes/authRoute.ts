import express from 'express';

import {
  register,
  login,
  logout,
  refreshToken,
} from '../controllers/authController.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';
import { validateBody } from '../validations/validateBody.js';

const router = express.Router();



router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
export default router;
