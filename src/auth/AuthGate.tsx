import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import SignIn from '../pages/SignIn';

export function AuthGate({ children }: { children: ReactNode }) {
  const { phase } = useAuth();

  if (phase === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: 'var(--text-soft)',
        }}
      >
        Loading…
      </div>
    );
  }

  if (phase !== 'signed-in') return <SignIn />;

  return <>{children}</>;
}
