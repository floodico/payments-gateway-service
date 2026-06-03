import type { AuthenticatedUser } from '../modules/identity/interfaces/authenticated-user.interface';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      brandId?: string;
      userId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
