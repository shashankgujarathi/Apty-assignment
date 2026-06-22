import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

export const ElementSelectorsSchema = z.object({
  idSelector: z.string().optional(),
  dataAttributes: z.record(z.string()),
  classSelector: z.string().optional(),
  tagName: z.string(),
  textContent: z.string().optional(),
  positionalXPath: z.string(),
  robustSelector: z.string(),
});

export const WalkthroughStepCreateSchema = z.object({
  stepNumber: z.number().int().nonnegative(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().default(''),
  selectors: ElementSelectorsSchema,
  triggerType: z.enum(['next-button', 'click-target', 'input-change']),
  triggerValue: z.string().optional(),
  path: z.string().optional(),
});

export const WalkthroughCreateSchema = z.object({
  name: z.string().min(1, 'Walkthrough name is required'),
  origin: z.string().min(1, 'Origin is required'),
  path: z.string().default('/'),
  steps: z.array(WalkthroughStepCreateSchema),
  isActive: z.boolean().default(true),
});

export const WalkthroughUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
  path: z.string().optional(),
  steps: z.array(WalkthroughStepCreateSchema).optional(),
  isActive: z.boolean().optional(),
});
