import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Image as ImageIcon,
  Menu,
  MoreHorizontal,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { SidebarBody } from './Sidebar';

interface MobileChromeProps {
  /** Render slot for things that belong in the topbar between the menu and the identity (e.g. a "back" link). */
  leadingSlot?: ReactNode;
}

export function MobileChrome({ leadingSlot }: MobileChromeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { restaurant } = useAuth();
  const location = useLocation();
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll + Escape-to-close + restore focus
  useEffect(() => {
    if (!drawerOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="uplate-mobile-topbar" aria-label="Mobile header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', minWidth: 0 }}>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            style={iconButtonStyle}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          {leadingSlot}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-body)',
            fontWeight: 600,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
          title={restaurant?.name ?? 'UPlate Restaurant Ads'}
        >
          {restaurant?.name ?? 'UPlate Restaurant Ads'}
        </span>
        <div style={{ width: 36 }} aria-hidden />
      </header>

      <BottomTabBar onMoreClick={() => setDrawerOpen(true)} />

      {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
      }}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--surface-overlay)',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          animation: 'uplate-fade-in var(--motion-base) var(--ease-out-quart)',
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: 'min(304px, 86vw)',
          height: '100dvh',
          background: 'var(--surface-sunken)',
          boxShadow: 'var(--shadow-drawer)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'uplate-drawer-in var(--motion-slow) var(--ease-out-expo)',
          willChange: 'transform',
        }}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{
            ...iconButtonStyle,
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
          }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        <SidebarBody onNavigate={onClose} />
      </div>
      <style>{`
        @keyframes uplate-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes uplate-drawer-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

interface BottomTabBarProps {
  onMoreClick: () => void;
}

function BottomTabBar({ onMoreClick }: BottomTabBarProps) {
  return (
    <nav
      className="uplate-mobile-tabbar"
      aria-label="Quick navigation"
    >
      <TabLink to="/" end label="Dashboard" icon={<LayoutDashboard size={20} strokeWidth={1.75} />} />
      <TabLink to="/campaigns" label="Campaigns" icon={<Megaphone size={20} strokeWidth={1.75} />} />
      <TabLink to="/ads" label="Ads" icon={<ImageIcon size={20} strokeWidth={1.75} />} />
      <button
        type="button"
        onClick={onMoreClick}
        aria-label="More"
        style={tabButtonStyle(false)}
      >
        <MoreHorizontal size={20} strokeWidth={1.75} />
        <span style={tabLabelStyle}>More</span>
      </button>
    </nav>
  );
}

function TabLink({
  to,
  label,
  icon,
  end,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} style={({ isActive }) => tabButtonStyle(isActive)}>
      {({ isActive }) => (
        <>
          <span aria-hidden style={{ position: 'relative' }}>
            {icon}
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: -10,
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }}
              />
            )}
          </span>
          <span style={tabLabelStyle}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 'var(--r-md)',
  border: 'none',
  background: 'transparent',
  color: 'var(--ink)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const tabLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.01em',
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    height: '100%',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: 'none',
    background: 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink-2)',
    textDecoration: 'none',
    cursor: 'pointer',
    paddingTop: 6,
  };
}
