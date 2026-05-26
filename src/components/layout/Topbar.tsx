import { LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../auth/AuthContext';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, signOut } = useAuth();

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--s-6)',
        gap: 'var(--s-5)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-3)' }}>
        {user?.email && (
          <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{user.email}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<LogOut size={14} />}
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
