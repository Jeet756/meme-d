'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Briefcase, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Role } from '@/types/api';
import { homePathForRole, useAuth } from './AuthProvider';

type Mode = 'login' | 'signup';

const roleOptions: { value: Role; title: string; body: string; icon: typeof Briefcase }[] = [
  { value: 'brand', title: 'I run campaigns', body: 'Set a budget and milestone payouts.', icon: Briefcase },
  { value: 'creator', title: 'I make content', body: 'Submit posts and earn per milestone.', icon: Sparkles },
];

/** Only same-site relative paths are honoured, so a crafted ?next= cannot redirect people elsewhere. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [role, setRole] = useState<Role>(params.get('role') === 'brand' ? 'brand' : 'creator');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(form: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (mode === 'signup' && String(form.get('name') ?? '').trim().length < 2) errors.name = 'Enter your name (2+ characters).';
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (mode === 'signup') {
      if (password.length < 8) errors.password = 'Use at least 8 characters.';
      else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) errors.password = 'Include at least one letter and one number.';
    } else if (!password) errors.password = 'Enter your password.';
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors = validate(form);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const email = String(form.get('email')).trim();
      const password = String(form.get('password'));
      const user =
        mode === 'signup'
          ? await signup({ name: String(form.get('name')).trim(), email, password, role })
          : await login({ email, password });
      toast.push({ tone: 'success', title: mode === 'signup' ? `Welcome to Meme’d, ${user.name.split(' ')[0]}` : 'Signed in' });
      router.replace(safeNext(params.get('next')) ?? homePathForRole(user.role));
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {mode === 'signup' && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fog-200">I am joining as</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleOptions.map(({ value, title, body, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer flex-col gap-1 rounded-control border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lime-400',
                  role === value ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/20',
                )}
              >
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <Icon className="h-5 w-5 text-violet-300" aria-hidden />
                <span className="text-sm font-semibold text-fog-50">{title}</span>
                <span className="text-xs text-fog-400">{body}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {mode === 'signup' && <TextField label="Name" name="name" autoComplete="name" error={fieldErrors.name} />}
      <TextField label="Email" name="email" type="email" autoComplete="email" error={fieldErrors.email} />
      <TextField
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        hint={mode === 'signup' ? 'At least 8 characters, with a letter and a number.' : undefined}
        error={fieldErrors.password}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="grid h-9 w-9 place-items-center rounded-control text-fog-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      {formError && (
        <p role="alert" className="rounded-control border border-signal-red/30 bg-signal-red/10 px-3.5 py-2.5 text-sm text-signal-red">
          {formError}
        </p>
      )}

      <Button type="submit" variant="accent" size="lg" className="w-full" loading={submitting}>
        {mode === 'signup' ? 'Create account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-fog-400">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-violet-300 underline-offset-4 hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Meme’d?{' '}
            <Link href="/signup" className="font-medium text-violet-300 underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
