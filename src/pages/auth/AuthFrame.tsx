import type { ReactNode } from 'react';

interface AuthFrameProps {
  scene?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Full-bleed moss surface used by sign-in and sign-up. The wordmark and
 * backdrop are shared across both routes so the cross-link reads as a desk
 * change inside the same room.
 */
export function AuthFrame({ scene, children, footer }: AuthFrameProps) {
  return (
    <div className="uplate-auth">
      <div className="uplate-auth__column">
        <header className="uplate-auth__head">
          <h1 className="uplate-auth__wordmark">UPlate.</h1>
          <span className="uplate-auth__subtitle">Restaurant Dashboard.</span>
          {scene && <p className="uplate-auth__scene">{scene}</p>}
        </header>
        <div className="uplate-auth__form">{children}</div>
        {footer && <footer className="uplate-auth__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function AuthLoading() {
  return (
    <AuthFrame>
      <div className="uplate-auth__skeleton" aria-hidden />
    </AuthFrame>
  );
}
