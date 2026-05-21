import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Image as ImageIcon,
  LineChart,
  Users,
  Settings,
  Salad,
} from 'lucide-react';
import type { ReactNode } from 'react';

import Logo from '../../assets/plate_light.png';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: <Megaphone size={18} /> },
  { to: '/ads', label: 'Ads Library', icon: <ImageIcon size={18} /> },
  { to: '/analytics', label: 'Analytics', icon: <LineChart size={18} /> },
  { to: '/audience', label: 'Audience Insights', icon: <Users size={18} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const fromState = (location.state as { from?: string } | null)?.from;
  const onAdDetail = /^\/campaigns\/[^/]+\/ads\/[^/]+/.test(path);
  const adDetailFromLibrary = onAdDetail && !!fromState?.startsWith('/ads');

  const isActive = (item: NavItem) => {
    if (item.to === '/ads') return path === '/ads' || adDetailFromLibrary;
    if (item.to === '/campaigns') {
      if (adDetailFromLibrary) return false;
      return path === '/campaigns' || path.startsWith('/campaigns/');
    }
    if (item.end) return path === item.to;
    return path === item.to || path.startsWith(item.to + '/');
  };

  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        maxHeight: '100vh',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--s-5) var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-6)',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 8px',
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--r-md)',
            background: 'var(--accent)',
            color: 'var(--surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={Logo} alt="UPlate logo" style={{ width: 25, height: 25 }} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>
            UPlate
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 500 }}>
            Restaurant Ads
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                color: active ? 'var(--surface)' : 'var(--text-soft)',
                background: active ? 'var(--accent)' : 'transparent',
                transition: 'background 120ms ease, color 120ms ease',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '8px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--r-pill)',
            background: 'var(--accent-20)',
            color: 'var(--text)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          BR
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Boiler Bowl Co.</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-soft)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            West Lafayette
          </span>
        </div>
      </div>
    </aside>
  );
}
