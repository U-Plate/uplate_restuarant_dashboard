import type { InputHTMLAttributes, ReactNode } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function AuthField({ label, hint, id, ...rest }: AuthFieldProps) {
  const fieldId = id ?? `auth-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="uplate-auth__field">
      <label htmlFor={fieldId} className="uplate-auth__label">
        {label}
      </label>
      <input id={fieldId} className="uplate-auth__input" {...rest} />
      {hint && <span className="uplate-auth__hint">{hint}</span>}
    </div>
  );
}
