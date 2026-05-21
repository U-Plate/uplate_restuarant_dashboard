import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldShellProps {
  label?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldShell({ label, hint, children }: FieldShellProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: 0.2 }}>
          {label.toUpperCase()}
        </span>
      )}
      {children}
      {hint && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{hint}</span>}
    </label>
  );
}

const baseInput = {
  background: 'var(--surface-2)',
  border: 'none',
  outline: 'none',
  borderRadius: 'var(--r-md)',
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--text)',
  width: '100%',
  boxShadow: 'inset 0 0 0 1px transparent',
  transition: 'box-shadow 120ms ease',
} as const;

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function TextField({ label, hint, style, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        {...rest}
        style={{ ...baseInput, ...style }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 0 0 2px var(--accent)';
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 0 0 1px transparent';
          rest.onBlur?.(e);
        }}
      />
    </FieldShell>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function TextArea({ label, hint, style, rows = 3, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        {...rest}
        rows={rows}
        style={{ ...baseInput, resize: 'vertical', fontFamily: 'inherit', ...style }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 0 0 2px var(--accent)';
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 0 0 1px transparent';
          rest.onBlur?.(e);
        }}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function SelectField({ label, hint, options, style, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        {...rest}
        style={{
          ...baseInput,
          appearance: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23505A5B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 32,
          ...style,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
