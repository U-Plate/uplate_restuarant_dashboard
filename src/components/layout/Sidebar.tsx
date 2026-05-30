import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Image as ImageIcon,
  LineChart,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={17} strokeWidth={1.75} />, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: <Megaphone size={17} strokeWidth={1.75} /> },
  { to: '/ads', label: 'Ads', icon: <ImageIcon size={17} strokeWidth={1.75} /> },
  { to: '/analytics', label: 'Analytics', icon: <LineChart size={17} strokeWidth={1.75} /> },
  { to: '/audience', label: 'Audience', icon: <Users size={17} strokeWidth={1.75} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={17} strokeWidth={1.75} /> },
];

function initials(value: string | undefined | null): string {
  if (!value) return 'U';
  const cleaned = value.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface SidebarBodyProps {
  onNavigate?: () => void;
}

export function SidebarBody({ onNavigate }: SidebarBodyProps) {
  const { restaurant, user, signOut } = useAuth();
  const location = useLocation();
  const { pathname } = location;
  const fromState = (location.state as { from?: string } | null)?.from;
  const onAdDetail = /^\/campaigns\/[^/]+\/ads\/[^/]+/.test(pathname);
  const adDetailFromLibrary = onAdDetail && !!fromState?.startsWith('/ads');

  const isActive = (item: NavItem): boolean => {
    if (item.to === '/ads') return pathname === '/ads' || adDetailFromLibrary;
    if (item.to === '/campaigns') {
      if (adDetailFromLibrary) return false;
      return pathname === '/campaigns' || pathname.startsWith('/campaigns/');
    }
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + '/');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--s-5) var(--s-4) var(--s-4)',
        gap: 'var(--s-4)',
      }}
    >
      <header className="uplate-sidebar__brand">
        <div className="uplate-sidebar__masthead">
          <span className="uplate-sidebar__wordmark">UPlate</span>
          <span className="uplate-sidebar__brandqual">Restaurant Ads</span>
        </div>
        <RestaurantIdentity name={restaurant?.name} iconUrl={restaurant?.iconUrl} />
      </header>

      <nav aria-label="Primary" className="uplate-sidebar__nav">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`uplate-sidebar__item${active ? ' uplate-sidebar__item--active' : ''}`}
            >
              <span aria-hidden className="uplate-sidebar__item-icon">
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <div style={{ height: 1, background: 'var(--hairline)' }} aria-hidden />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s-3)',
            padding: '0 var(--s-3)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--r-md)',
              background: 'var(--accent-tint)',
              color: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            {initials(user?.email)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 'var(--type-meta)',
                color: 'var(--ink)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email ?? 'Signed in'}
            </span>
            <span style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)' }}>Account</span>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => void signOut()}
            className="uplate-sidebar__signout"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        background: 'var(--surface-sunken)',
        borderRight: '1px solid var(--hairline)',
      }}
    >
      <SidebarBody />
    </aside>
  );
}

function RestaurantIdentity({ name, iconUrl }: { name?: string; iconUrl?: string }) {
  const display = name?.trim() || 'Your restaurant';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', minWidth: 0 }}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-md)',
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid var(--hairline)',
            background: 'var(--surface)',
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-md)',
            background: 'var(--accent)',
            color: 'var(--accent-on)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {initials(display)}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-h3)',
          fontWeight: 600,
          letterSpacing: '-0.012em',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
        title={display}
      >
        {display}
      </span>
    </div>
  );
}
