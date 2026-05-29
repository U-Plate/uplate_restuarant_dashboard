import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import { AuthLoading } from '../pages/auth/AuthFrame';

const AUTH_ROUTES = new Set(['/sign-in', '/sign-up']);

export function AuthGate({ children }: { children: ReactNode }) {
  const { phase } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const onAuthSurface = phase !== 'signed-in';
    if (onAuthSurface) {
      document.documentElement.setAttribute('data-auth', 'true');
    } else {
      document.documentElement.removeAttribute('data-auth');
    }
    return () => document.documentElement.removeAttribute('data-auth');
  }, [phase]);

  if (phase === 'loading') {
    return <AuthLoading />;
  }

  if (phase !== 'signed-in') {
    const fromPath = AUTH_ROUTES.has(location.pathname) ? undefined : location.pathname;
    return (
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route
          path="*"
          element={<Navigate to="/sign-in" replace state={fromPath ? { from: fromPath } : undefined} />}
        />
      </Routes>
    );
  }

  return <>{children}</>;
}
