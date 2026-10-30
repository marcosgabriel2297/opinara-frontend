import { authHandlers } from './auth';
import { businessHandlers } from './businesses';
import { campaignHandlers } from './campaigns';
import { googleHandlers } from './google';
import { reviewHandlers } from './reviews';
import { teamHandlers } from './team';

export const handlers = [
  ...authHandlers,
  ...businessHandlers,
  ...campaignHandlers,
  ...googleHandlers,
  ...reviewHandlers,
  ...teamHandlers,
];
