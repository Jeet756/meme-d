import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

// Teaches TypeScript that `req.user` exists once authentication middleware has run.
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
