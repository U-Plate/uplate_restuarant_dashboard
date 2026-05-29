import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { ActionMenu } from '../ui/ActionMenu';
import { Badge } from '../ui/Badge';
import { formatDateRange, formatRelativeTime } from '../../lib/format';
import type { Campaign } from '../../types';

interface CampaignHeaderProps {
  campaign: Campaign;
  adCount: number;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (next: { name: string; startDate: string; endDate: string }) => void;
  onToggleStatus: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onNewAd: () => void;
}

export function CampaignHeader({
  campaign,
  adCount,
  editing,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onToggleStatus,
  onDuplicate,
  onRequestDelete,
  onNewAd,
}: CampaignHeaderProps) {
  const navigate = useNavigate();
  const isActive = campaign.status === 'active';
  const today = todayUtc();
  const ended = new Date(campaign.endDate + 'T00:00:00Z') < today;

  if (editing) {
    return (
      <EditHeader
        campaign={campaign}
        onCancel={onCancelEdit}
        onSubmit={onSubmitEdit}
        onBack={() => navigate('/campaigns')}
      />
    );
  }

  return (
    <header className="uplate-campaign-header">
      <Link to="/campaigns" className="uplate-campaign-header__back">
        <ChevronLeft size={14} strokeWidth={2} />
        <span>Campaigns</span>
      </Link>

      <div className="uplate-campaign-header__title-row">
        <h1
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-headline)',
            lineHeight: 'var(--type-headline-lh)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.014em',
            margin: 0,
            wordBreak: 'break-word',
            flex: 1,
            minWidth: 0,
          }}
        >
          {campaign.name}
        </h1>

        <div className="uplate-campaign-header__actions">
          {ended ? (
            <Badge tone="paused" withDot>
              Ended {new Date(campaign.endDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Badge>
          ) : (
            <Toggle
              checked={isActive}
              onChange={onToggleStatus}
              label={isActive ? 'Active' : 'Paused'}
            />
          )}

          <ActionMenu
            items={[
              { label: 'Edit details', icon: <Pencil size={14} />, onClick: onStartEdit },
              { label: 'Duplicate', icon: <Copy size={14} />, onClick: onDuplicate },
              {
                label: 'Delete campaign',
                icon: <Trash2 size={14} />,
                onClick: onRequestDelete,
                danger: true,
              },
            ]}
          />

          <Button iconLeft={<Plus size={16} />} onClick={onNewAd}>
            New ad
          </Button>
        </div>
      </div>

      <p
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        Runs {formatDateRange(campaign.startDate, campaign.endDate)}
        <span aria-hidden> · </span>
        {adCount} ad{adCount === 1 ? '' : 's'}
        <span aria-hidden> · </span>
        updated {formatRelativeTime(campaign.updatedAt)}
      </p>
    </header>
  );
}

interface EditHeaderProps {
  campaign: Campaign;
  onCancel: () => void;
  onSubmit: (next: { name: string; startDate: string; endDate: string }) => void;
  onBack: () => void;
}

function EditHeader({ campaign, onCancel, onSubmit, onBack }: EditHeaderProps) {
  const [name, setName] = useState(campaign.name);
  const [startDate, setStartDate] = useState(campaign.startDate);
  const [endDate, setEndDate] = useState(campaign.endDate);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const canSave =
    name.trim().length > 0 &&
    startDate &&
    endDate &&
    endDate >= startDate &&
    (name !== campaign.name || startDate !== campaign.startDate || endDate !== campaign.endDate);

  const validationError =
    endDate && startDate && endDate < startDate
      ? 'End date must be on or after the start date.'
      : null;

  return (
    <header className="uplate-campaign-header">
      <button
        type="button"
        onClick={onBack}
        className="uplate-campaign-header__back"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={14} strokeWidth={2} />
        <span>Campaigns</span>
      </button>

      <div className="uplate-campaign-header__title-row">
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Campaign name"
          placeholder="Campaign name"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-headline)',
            lineHeight: 'var(--type-headline-lh)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.014em',
            background: 'var(--surface-sunken)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 'var(--r-md)',
            padding: '6px 12px',
            outline: 'none',
          }}
        />

        <div className="uplate-campaign-header__actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSubmit({ name: name.trim(), startDate, endDate })
            }
          >
            Save
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-3)',
          flexWrap: 'wrap',
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-2)',
          fontWeight: 500,
        }}
      >
        <span style={{ color: 'var(--ink-3)' }}>Runs</span>
        <DateInput value={startDate} onChange={setStartDate} label="Start date" />
        <span aria-hidden style={{ color: 'var(--ink-3)' }}>→</span>
        <DateInput value={endDate} onChange={setEndDate} label="End date" />
        {validationError && (
          <span style={{ color: 'var(--trend-negative)', fontWeight: 500 }}>
            {validationError}
          </span>
        )}
      </div>
    </header>
  );
}

function DateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--type-meta)',
        color: 'var(--ink)',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-sm)',
        padding: '4px 8px',
        outline: 'none',
      }}
    />
  );
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
