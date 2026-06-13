import { useMemo, useState } from 'react';
import { Mail, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StickyBar } from '../components/ui/StickyBar';
import { useApp } from '../store/AppContext';
import { useAuth } from '../auth/AuthContext';
import type { RestaurantNotifications } from '../types';

interface Draft {
  name: string;
  iconUrl: string;
  notifications: RestaurantNotifications;
}

const DEFAULT_NOTIFICATIONS: RestaurantNotifications = {
  weekly: true,
  emailAlerts: true,
};

function toDraft(state: ReturnType<typeof useApp>['state']): Draft {
  const r = state.restaurant ?? {};
  return {
    name: r.name ?? '',
    iconUrl: r.iconUrl ?? '',
    notifications: r.notifications ?? DEFAULT_NOTIFICATIONS,
  };
}

function diffCount(draft: Draft, base: Draft): number {
  let n = 0;
  if (draft.name !== base.name) n += 1;
  if (draft.iconUrl !== base.iconUrl) n += 1;
  if (draft.notifications.weekly !== base.notifications.weekly) n += 1;
  if (draft.notifications.emailAlerts !== base.notifications.emailAlerts) n += 1;
  return n;
}

export default function Settings() {
  const { state, commands, reset } = useApp();
  const { user } = useAuth();
  const baseDraft = useMemo(() => toDraft(state), [state]);

  const [draft, setDraft] = useState<Draft>(baseDraft);
  const [baselineKey, setBaselineKey] = useState<string>(JSON.stringify(baseDraft));
  const currentKey = JSON.stringify(baseDraft);
  if (currentKey !== baselineKey) {
    setBaselineKey(currentKey);
    setDraft(baseDraft);
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = diffCount(draft, baseDraft);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await commands.updateRestaurant({
        name: draft.name.trim() || undefined,
        iconUrl: draft.iconUrl.trim() || undefined,
        notifications: draft.notifications,
      });
    } catch {
      setSaveError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(baseDraft);
    setSaveError(null);
  };

  const setNotif = (key: keyof RestaurantNotifications, value: boolean) => {
    setDraft((d) => ({ ...d, notifications: { ...d.notifications, [key]: value } }));
  };

  return (
    <>
      <div className="uplate-settings">
        <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-headline)',
              lineHeight: 'var(--type-headline-lh)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.014em',
              margin: 0,
            }}
          >
            Settings
          </h1>
          <p style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)', margin: 0 }}>
            Your restaurant identity, how we reach you, and demo controls.
          </p>
        </header>

        <Section
          eyebrow="Profile"
          description="What your campaigns are signed with."
        >
          <Field
            label="Restaurant name"
            input={
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Boiler Bowl"
                className="uplate-settings__input"
              />
            }
          />

          <Field
            label="Brand icon URL"
            help="Used as the default icon on every ad. Each ad can override it."
            input={
              <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
                <IconThumb url={draft.iconUrl} name={draft.name} />
                <input
                  type="url"
                  value={draft.iconUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, iconUrl: e.target.value }))}
                  placeholder="https://"
                  className="uplate-settings__input"
                  style={{ flex: 1 }}
                />
              </div>
            }
          />

          <Field
            label="Signed in as"
            input={
              <div className="uplate-settings__readout">
                <Mail size={14} strokeWidth={2} color="var(--ink-3)" />
                <span className="num" style={{ color: 'var(--ink)' }}>
                  {user?.email ?? 'Not signed in'}
                </span>
                <span className="uplate-settings__tag">via email</span>
              </div>
            }
          />
        </Section>

        <Section
          eyebrow="Notifications"
          description="How we keep you in the loop."
        >
          <NotifRow
            label="Weekly performance digest"
            description="Top campaigns and notable changes, every Monday."
            checked={draft.notifications.weekly}
            onChange={(v) => setNotif('weekly', v)}
          />
          <NotifRow
            label="Email alerts"
            description="Get pinged when an ad falls below your CTR target."
            checked={draft.notifications.emailAlerts}
            onChange={(v) => setNotif('emailAlerts', v)}
          />
        </Section>

        <Section
          eyebrow="Danger zone"
          description="Permanent and outside the save bar."
        >
          <div className="uplate-settings__danger">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontSize: 'var(--type-body)',
                  color: 'var(--ink)',
                  fontWeight: 500,
                }}
              >
                Reset to seeded data
              </span>
              <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
                Removes everything you've added and restores the example campaigns.
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<RotateCcw size={14} />}
              onClick={() => setConfirmReset(true)}
            >
              Reset demo data
            </Button>
          </div>
        </Section>

        {saveError && (
          <div role="alert" className="uplate-settings__error">
            {saveError}
          </div>
        )}

        <div aria-hidden style={{ height: dirty > 0 ? 88 : 0 }} />
      </div>

      <StickyBar
        visible={dirty > 0}
        saving={saving}
        headline={`${dirty} unsaved ${dirty === 1 ? 'change' : 'changes'}`}
        subtext="Save to commit, or discard to revert."
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

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
    </>
  );
}

function Section({
  eyebrow,
  description,
  children,
}: {
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="uplate-settings__section">
      <header className="uplate-settings__sectionhead">
        <span className="uplate-settings__eyebrow">{eyebrow}</span>
        {description && (
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            {description}
          </span>
        )}
      </header>
      <div className="uplate-settings__rows">{children}</div>
    </section>
  );
}

function Field({
  label,
  help,
  input,
}: {
  label: string;
  help?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="uplate-settings__field">
      <div className="uplate-settings__fieldlabel">
        <span
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {help && (
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            {help}
          </span>
        )}
      </div>
      <div className="uplate-settings__fieldinput">{input}</div>
    </div>
  );
}

function NotifRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="uplate-settings__notif">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 'var(--type-body)',
            color: 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          {description}
        </span>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function IconThumb({ url, name }: { url: string; name: string }) {
  const [errored, setErrored] = useState(false);
  const initials = (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const showImage = url.trim().length > 0 && !errored;

  return (
    <div
      aria-hidden
      className="uplate-settings__thumb"
      style={{
        background: showImage ? 'var(--surface-raised)' : 'var(--surface-sunken)',
      }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          onError={() => setErrored(true)}
          onLoad={() => setErrored(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span
          className="num"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-2)',
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
