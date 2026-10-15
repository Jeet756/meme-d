import bcrypt from 'bcryptjs';
import { Prisma, type Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { LoginInput, SignupInput } from './auth.schemas';

const BCRYPT_COST = 12;

// Compared against when the email is unknown so that response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

const publicUserSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;

export async function signUp(input: SignupInput): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    return await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
      select: publicUserSelect,
    });
  } catch (error) {
    // The unique index on email is the source of truth, which also covers two simultaneous signups.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('An account with this email already exists. Try signing in instead.');
    }
    throw error;
  }
}

export async function logIn(input: LoginInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    throw AppError.unauthenticated('Email or password is incorrect.');
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  if (!user) throw AppError.unauthenticated('Your account could not be found. Please sign in again.');
  return user;
}
