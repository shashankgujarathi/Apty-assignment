import { Router } from 'express';
import { WalkthroughCreateSchema, WalkthroughUpdateSchema } from '@mini-apty/shared';
import { WalkthroughController } from '../controllers/walkthrough.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authenticate as any);

// POST /walkthroughs - Create a new walkthrough with steps
router.post(
  '/',
  validateRequest(WalkthroughCreateSchema),
  WalkthroughController.create as any
);

// GET /walkthroughs - Fetch walkthroughs for the current user
router.get(
  '/',
  WalkthroughController.list as any
);

// GET /walkthroughs/:id - Fetch a specific walkthrough
router.get(
  '/:id',
  WalkthroughController.get as any
);

// PUT /walkthroughs/:id - Update an existing walkthrough and its steps
router.put(
  '/:id',
  validateRequest(WalkthroughUpdateSchema),
  WalkthroughController.update as any
);

// DELETE /walkthroughs/:id - Delete a walkthrough
router.delete(
  '/:id',
  WalkthroughController.remove as any
);

export default router;
export const walkthroughRouter = router;
