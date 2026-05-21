import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { TextField } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useApp } from '../store/AppContext';

export default function Settings() {
  const { state, dispatch, reset } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [email, setEmail] = useState('ops@boilerbowl.com');
  const [emailWeekly, setEmailWeekly] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const name = state.restaurant.name ?? '';
  const iconUrl = state.restaurant.iconUrl ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 720 }}>
      <Card padding="var(--s-5)">
        <SectionHeader title="Restaurant profile" subtitle="Public name and the inbox we contact for billing and policy" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--s-3)',
          }}
        >
          <TextField
            label="Restaurant name"
            value={name}
            onChange={(e) =>
              dispatch({
                type: 'RESTAURANT_UPDATE',
                payload: { name: e.target.value || undefined },
              })
            }
          />
          <TextField
            label="Contact email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Brand icon URL"
            hint="Used as the default icon on every ad. Each ad can override it."
            value={iconUrl}
            onChange={(e) =>
              dispatch({
                type: 'RESTAURANT_UPDATE',
                payload: { iconUrl: e.target.value || undefined },
              })
            }
            placeholder="https://…"
          />
        </div>
      </Card>

      <Card padding="var(--s-5)">
        <SectionHeader title="Notifications" subtitle="How we keep you in the loop" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <Row
            label="Weekly performance digest"
            description="Top campaigns and notable changes, every Monday"
          >
            <Toggle checked={emailWeekly} onChange={setEmailWeekly} />
          </Row>
          <Row
            label="Email alerts"
            description="Get pinged when an ad falls below your CTR target"
          >
            <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
          </Row>
          <Row
            label="SMS alerts"
            description="Urgent issues only — campaign paused, billing failure"
          >
            <Toggle checked={smsAlerts} onChange={setSmsAlerts} />
          </Row>
        </div>
      </Card>

      <Card padding="var(--s-5)">
        <SectionHeader
          title="Demo data"
          subtitle="Reset the dashboard to its seeded campaigns and ads"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--s-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
            gap: 'var(--s-3)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Reset to seeded data
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              Removes everything you've added and restores the example campaigns.
            </span>
          </div>
          <Button
            variant="secondary"
            iconLeft={<RotateCcw size={14} />}
            onClick={() => setConfirmReset(true)}
          >
            Reset demo data
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all dashboard data?"
        message="This permanently removes the campaigns and ads you've created in this session and restores the seeded demo data."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--s-4)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
      {subtitle && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{subtitle}</span>}
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--s-3)',
        padding: 'var(--s-3) var(--s-4)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-md)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        {description && (
          <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}
