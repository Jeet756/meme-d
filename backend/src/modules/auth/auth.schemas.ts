import { z } from 'zod';

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);

export const signupSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).trim().min(2, 'Name must be at least 2 characters.').max(80),
  email,
  // bcrypt only reads the first 72 bytes, so longer passwords would silently be truncated.
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be 72 characters or fewer.')
    .regex(/[A-Za-z]/, 'Password needs at least one letter.')
    .regex(/[0-9]/, 'Password needs at least one number.'),
  role: z.enum(['brand', 'creator'], { errorMap: () => ({ message: 'Choose brand or creator.' }) }),
});

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(72),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
