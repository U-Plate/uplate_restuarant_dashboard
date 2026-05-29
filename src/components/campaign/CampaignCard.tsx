import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Copy,
  Eye,
  Pause,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { ActionMenu } from '../ui/ActionMenu';
import { Sparkline } from '../charts/Sparkline';
import type { Campaign } from '../../types';
import { useApp } from '../../store/AppContext';
import { adsForCampaign } from '../../store/selectors';
import { formatNumber, formatPercent, formatRelativeTime } from '../../lib/format';
import { campaignWindow } from '../../lib/verdict';
import { cloneCampaign } from '../../lib/clone';

interface CampaignCardProps {
  campaign: Campaign;
  isTop?: boolean;
  onDeleteRequest: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, isTop, onDeleteRequest }: CampaignCardProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const window = campaignWindow(state, campaign.id);
  const ads = adsForCampaign(state, campaign.id);
  const isActive = campaign.status === 'active';

  const today = todayUtc();
  const endsAt = new Date(campaign.endDate + 'T00:00:00Z');
  const daysToEnd = Math.round((endsAt.getTime() - today.getTime()) / 86_400_000);
  const isEnded = daysToEnd < 0;
  const isEndingSoon = !isEnded && daysToEnd <= 4 && isActive;

  const handleDuplicate = () => {
    const cloned = cloneCampaign(campaign, ads);
    dispatch({
      type: 'CAMPAIGN_DUPLICATE',
      payload: { id: campaign.id, newCampaign: cloned.campaign, newAds: cloned.ads },
    });
    navigate(`/campaigns/${cloned.campaign.id}`);
  };

  const open = () => navigate(`/campaigns/${campaign.id}`);

  return (
    <article
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-card-action]')) return;
        open();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('[data-card-action]')) return;
          e.preventDefault();
          open();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Open ${campaign.name}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
        padding: 'var(--s-5)',
        background: 'var(--surface-raised)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lg)',
        cursor: 'pointer',
        transition: 'border-color var(--motion-fast) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline)';
      }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 'var(--s-3)',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isActive ? 'var(--status-active)' : 'var(--status-paused)',
            boxShadow: isActive
              ? '0 0 0 3px var(--status-active-tint)'
              : '0 0 0 3px var(--status-paused-tint)',
            display: 'inline-block',
            marginLeft: 4,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Link
            to={`/campaigns/${campaign.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-h3)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.011em',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
            title={campaign.name}
          >
            {campaign.name}
          </Link>
          {isTop && <CardTag tone="top">Top week</CardTag>}
          {isEndingSoon && (
            <CardTag tone="warn">
              {daysToEnd === 0 ? 'Ends today' : daysToEnd === 1 ? 'Ends tomorrow' : `Ends in ${daysToEnd}d`}
            </CardTag>
          )}
          {isEnded && <CardTag tone="muted">Ended</CardTag>}
        </div>
        <div data-card-action style={{ display: 'inline-flex' }}>
          <ActionMenu
            items={[
              { label: 'View', icon: <Eye size={14} />, onClick: () => navigate(`/campaigns/${campaign.id}`) },
              {
                label: 'Edit details',
                icon: <Pencil size={14} />,
                onClick: () => navigate(`/campaigns/${campaign.id}?edit=1`),
              },
              {
                label: isActive ? 'Pause' : 'Activate',
                icon: isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () =>
                  dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id: campaign.id } }),
              },
              { label: 'Duplicate', icon: <Copy size={14} />, onClick: handleDuplicate },
              {
                label: 'Delete',
                icon: <Trash2 size={14} />,
                onClick: () => onDeleteRequest(campaign),
                danger: true,
              },
            ]}
          />
        </div>
      </header>

      <p
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
          margin: 0,
        }}
      >
        {formatShortRange(campaign.startDate, campaign.endDate)}
        <span aria-hidden> · </span>
        {ads.length} ad{ads.length === 1 ? '' : 's'}
        <span aria-hidden> · </span>
        updated {formatRelativeTime(campaign.updatedAt)}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            className="num"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-number-lg)',
              lineHeight: 'var(--type-number-lg-lh)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatNumber(window.clicks7d)}
          </span>
          <span
            style={{
              fontSize: 'var(--type-meta)',
              color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            clicks, last 7 days
          </span>
        </div>
        <div
          style={{
            color: 'var(--data-clicks)',
            opacity: 0.85,
            minHeight: 36,
          }}
        >
          {window.spark30d.length >= 2 ? (
            <Sparkline data={window.spark30d} height={36} strokeWidth={1.5} fillOpacity={0.14} />
          ) : (
            <span
              style={{
                fontSize: 'var(--type-eyebrow)',
                color: 'var(--ink-3)',
                display: 'inline-block',
                paddingTop: 8,
              }}
            >
              Not enough data yet
            </span>
          )}
        </div>
      </div>

      <footer
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
          marginTop: 'auto',
        }}
      >
        <span
          className="num"
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 6,
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-2)',
            fontWeight: 500,
          }}
        >
          <span style={{ color: 'var(--ink-3)' }}>CTR</span>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
            {window.impressions7d === 0 ? '0.00%' : formatPercent(window.ctr7d, 2)}
          </span>
          <CtrDeltaArrow delta={window.ctrDelta} />
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-2)',
            fontWeight: 500,
          }}
        >
          View campaign
          <ChevronRight size={14} strokeWidth={2} />
        </span>
      </footer>
    </article>
  );
}

function CardTag({
  tone,
  children,
}: {
  tone: 'top' | 'warn' | 'muted';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'top'
      ? { bg: 'var(--accent-tint)', fg: 'var(--status-active-on)' }
      : tone === 'warn'
        ? { bg: 'oklch(0.94 0.04 65)', fg: 'oklch(0.45 0.1 65)' }
        : { bg: 'var(--status-paused-tint)', fg: 'var(--status-paused-on)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 8px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'var(--r-pill)',
        background: palette.bg,
        color: palette.fg,
        flexShrink: 0,
        fontFamily: 'var(--font-ui)',
      }}
    >
      {children}
    </span>
  );
}

function CtrDeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.1) return null;
  const positive = delta > 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  const pct = Math.round(Math.abs(delta) * 100);
  return (
    <span
      className="num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        color: positive ? 'var(--trend-positive)' : 'var(--trend-negative)',
        fontWeight: 600,
      }}
    >
      <Arrow size={12} strokeWidth={2.5} />
      {pct}%
    </span>
  );
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatShortRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} to ${e.toLocaleDateString('en-US', opts)}`;
}
