import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const controlClasses =
  'w-full rounded-control border bg-ink-900/80 px-3.5 text-sm text-fog-50 placeholder:text-fog-500 transition-colors ' +
  'focus-visible:border-violet-400 disabled:opacity-60';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label + control + hint/error wiring in one place so every form is accessible by default. */
export function FieldShell({ label, error, hint, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fog-200">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-signal-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-fog-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type CommonProps = { label: string; error?: string; hint?: string };

export const TextField = forwardRef<HTMLInputElement, CommonProps & InputHTMLAttributes<HTMLInputElement> & { trailing?: ReactNode }>(
  function TextField({ label, error, hint, className, trailing, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <input
              ref={ref}
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={cn(controlClasses, 'h-11', invalid ? 'border-signal-red/70' : 'border-white/10', trailing && 'pr-11', className)}
              {...rest}
            />
            {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
          </div>
        )}
      </FieldShell>
    );
  },
);

export function TextAreaField({ label, error, hint, className, ...rest }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClasses, 'min-h-28 py-3', invalid ? 'border-signal-red/70' : 'border-white/10', className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, className, children, ...rest }: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClasses, 'h-11', invalid ? 'border-signal-red/70' : 'border-white/10', className)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}
