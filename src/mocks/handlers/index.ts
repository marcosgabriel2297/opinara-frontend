import { authHandlers } from './auth';
import { businessHandlers } from './businesses';
import { campaignHandlers } from './campaigns';
import { googleHandlers } from './google';
import { loyaltyHandlers } from './loyalty';
import { planGuardHandlers } from './plan-guard';
import { reviewHandlers } from './reviews';
import { teamHandlers } from './team';

export const handlers = [
  // Primero: corta lo que el plan no incluye, como el guard del backend.
  ...planGuardHandlers,
  ...authHandlers,
  ...businessHandlers,
  ...campaignHandlers,
  ...googleHandlers,
  ...loyaltyHandlers,
  ...reviewHandlers,
  ...teamHandlers,
];
