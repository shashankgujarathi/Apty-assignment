import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { WalkthroughService } from '../services/walkthrough.service.js';

export class WalkthroughController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await WalkthroughService.createWalkthrough(userId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { origin, path } = req.query;
      const result = await WalkthroughService.getWalkthroughs(userId, {
        origin: origin as string,
        path: path as string,
      });
      return res.status(200).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await WalkthroughService.getWalkthroughById(userId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await WalkthroughService.updateWalkthrough(userId, id, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await WalkthroughService.deleteWalkthrough(userId, id);
      return res.status(204).send();
    } catch (error: any) {
      if (error && typeof error === 'object' && error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }
}
