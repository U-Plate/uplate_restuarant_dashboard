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
  const { pathname } = useLocation();
  const fromState = (useLocation().state as { from?: string } | null)?.from;
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
        padding: 'var(--s-6) var(--s-4) var(--s-4)',
        gap: 'var(--s-7)',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', padding: '0 var(--s-2)' }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-eyebrow)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontWeight: 600,
          }}
        >
          UPlate · Restaurant Ads
        </span>
        <RestaurantIdentity name={restaurant?.name} iconUrl={restaurant?.iconUrl} />
      </header>

      <nav aria-label="Primary" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-0)' }}>
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              style={navItemStyle(active)}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--surface-sunken)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span aria-hidden style={activeMarkerStyle(active)} />
              <span style={{ display: 'inline-flex', color: active ? 'var(--accent)' : 'var(--ink-2)' }}>
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
            padding: 'var(--s-2)',
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
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-2)',
              width: 32,
              height: 32,
              borderRadius: 'var(--r-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-sunken)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--ink-2)';
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    paddingLeft: 14,
    borderRadius: 'var(--r-md)',
    fontSize: 'var(--type-body)',
    fontWeight: active ? 600 : 500,
    textDecoration: 'none',
    color: active ? 'var(--ink)' : 'var(--ink-2)',
    background: active ? 'var(--accent-tint)' : 'transparent',
    transition: 'background var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart)',
  };
}

function activeMarkerStyle(active: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    left: 2,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 2,
    height: active ? 20 : 0,
    borderRadius: 'var(--r-pill)',
    background: 'var(--accent)',
    transition: 'height var(--motion-base) var(--ease-out-quart)',
  };
}
