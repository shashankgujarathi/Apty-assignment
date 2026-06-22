export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TriggerType = 'next-button' | 'click-target' | 'input-change';

export interface ElementSelectors {
  idSelector?: string;
  dataAttributes: Record<string, string>;
  classSelector?: string;
  tagName: string;
  textContent?: string;
  positionalXPath: string;
  robustSelector: string;
}

export interface WalkthroughStep {
  id: string;
  walkthroughId: string;
  stepNumber: number;
  title: string;
  description: string;
  selectors: ElementSelectors;
  triggerType: TriggerType;
  triggerValue?: string;
  path?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Walkthrough {
  id: string;
  userId: string;
  name: string;
  origin: string;
  path: string;
  steps: WalkthroughStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
