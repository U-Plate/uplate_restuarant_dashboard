import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthFrame } from './auth/AuthFrame';
import { AuthField } from './auth/AuthField';

interface LocationState {
  from?: string;
}

export default function SignIn() {
  const { signIn, error, clearError, phase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = submitting || phase === 'loading';
  const message = localError ?? error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch {
      // Errors surface via AuthContext error.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      scene="Reach hungry students on campus."
      footer={
        <span>
          New here?{' '}
          <Link className="uplate-auth__link" to="/sign-up">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="uplate-auth__form-inner" noValidate>
        <AuthField
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

        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          disabled={busy}
          required
          hint="Forgot it? Contact UPlate support."
        />

        {message && (
          <div role="alert" className="uplate-auth__error">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="uplate-auth__submit"
          data-busy={busy}
        >
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthFrame>
  );
}
