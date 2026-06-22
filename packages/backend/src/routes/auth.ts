import { Router } from 'express';
import { SignupSchema, LoginSchema } from '@mini-apty/shared';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// POST /auth/signup
router.post('/signup', validateRequest(SignupSchema), AuthController.signup);

// POST /auth/login
router.post('/login', validateRequest(LoginSchema), AuthController.login);

export default router;
export const authRouter = router;
