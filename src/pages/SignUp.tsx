import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { AuthFrame } from './auth/AuthFrame';
import { AuthField } from './auth/AuthField';

interface LocationState {
  from?: string;
}

export default function SignUp() {
  const { signUp, error, clearError, phase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const busy = submitting || phase === 'loading';
  const message = localError ?? error;

  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const code = accessCode.trim();
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (!code) {
      setJoining(null);
      return;
    }
    let cancelled = false;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await api.auth.validateAccessCode({ accessCode: code });
        if (cancelled) return;
        if (res.valid && res.restaurant?.name) {
          setJoining(res.restaurant.name);
        } else {
          setJoining(null);
        }
      } catch {
        if (!cancelled) setJoining(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [accessCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Email and password are required.');
      return;
    }
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

    setSubmitting(true);
    try {
      await signUp(email, password, accessCode.trim());
      navigate(from, { replace: true });
    } catch {
      // Errors surface via AuthContext error.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      scene="New to UPlate? Your access code unlocks setup."
      footer={
        <span>
          Already have an account?{' '}
          <Link className="uplate-auth__link" to="/sign-in">
            Sign in
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
          placeholder="At least 6 characters"
          autoComplete="new-password"
          disabled={busy}
          required
        />

        <AuthField
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Same password"
          autoComplete="new-password"
          disabled={busy}
          required
        />

        <AuthField
          label="Access code"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="UPLATE-XXXX"
          disabled={busy}
          required
          hint="Provided by UPlate when your restaurant was onboarded."
        />

        {joining && (
          <p className="uplate-auth__joining">
            Joining: <em>{joining}</em>
          </p>
        )}

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
          {busy ? 'Creating account' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  );
}
