import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.signup(email, password);
      return res.status(201).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }
}
