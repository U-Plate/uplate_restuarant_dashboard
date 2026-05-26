import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../auth/AuthContext';

type Mode = 'sign-in' | 'sign-up';

export default function SignIn() {
  const { signIn, signUp, error, clearError, phase } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(null);
    clearError();
    setConfirm('');
    setAccessCode('');
  }, [mode, clearError]);

  const busy = submitting || phase === 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    if (mode === 'sign-up') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (!accessCode.trim()) {
        setLocalError('Access code is required to create an account.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        await signUp(email, password, accessCode.trim());
      }
    } catch {
      // Errors are surfaced via the AuthContext `error` field.
    } finally {
      setSubmitting(false);
    }
  };

  const message = localError ?? error;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--s-6)',
      }}
    >
      <Card padding="var(--s-6)" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <header style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-md)',
                background: 'var(--accent-12)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Utensils size={22} />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.2 }}>
              UPlate Restaurant Dashboard
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-soft)', textAlign: 'center' }}>
              {mode === 'sign-in'
                ? 'Sign in to manage your campaigns and ads.'
                : 'Create an account using your restaurant access code.'}
            </span>
          </header>

          <Tabs
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            tabs={[
              { value: 'sign-in', label: 'Sign in' },
              { value: 'sign-up', label: 'Create account' },
            ]}
          />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              autoComplete="email"
              autoFocus
              disabled={busy}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={busy}
              required
            />

            {mode === 'sign-up' && (
              <>
                <TextField
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
                <TextField
                  label="Access code"
                  hint="Provided by UPlate when your restaurant was onboarded."
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="UPLATE-XXXX"
                  disabled={busy}
                  required
                />
              </>
            )}

            {message && (
              <div
                role="alert"
                style={{
                  fontSize: 13,
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#b91c1c',
                  boxShadow: 'inset 0 0 0 1px rgba(239, 68, 68, 0.18)',
                }}
              >
                {message}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={busy} fullWidth>
              {busy
                ? mode === 'sign-in' ? 'Signing in…' : 'Creating account…'
                : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'center' }}>
            {mode === 'sign-in' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-up')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 0, cursor: 'pointer' }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-in')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 0, cursor: 'pointer' }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
