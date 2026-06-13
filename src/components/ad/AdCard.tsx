import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Pause,
  Pencil,
  Play,
  Send,
  Trash2,
} from 'lucide-react';
import { ActionMenu } from '../ui/ActionMenu';
import { AdPreview } from './AdPreview';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';
import { formatNumber, formatPercent } from '../../lib/format';
import { singleAdWindow } from '../../lib/verdict';
import { AD_LOCATION_LABEL } from '../../data/constants';

interface AdCardProps {
  ad: Ad;
  onDeleteRequest: (ad: Ad) => void;
  onDuplicateAcross: (ad: Ad) => void;
  showCampaign?: boolean;
  isTop?: boolean;
  isCold?: boolean;
}

export function AdCard({
  ad,
  onDeleteRequest,
  onDuplicateAcross,
  showCampaign,
  isTop,
  isCold,
}: AdCardProps) {
  const { state, commands } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const campaign = state.campaigns[ad.campaignId];
  const isActive = ad.status === 'active';
  const win = singleAdWindow(state, ad.id);
  const inAdsLibrary = location.pathname === '/ads';

  const openAd = () =>
    navigate(`/campaigns/${ad.campaignId}/ads/${ad.id}`, {
      state: { from: location.pathname + location.search },
    });

  const handleDuplicateHere = async () => {
    const clone = await commands.duplicateAd(ad.id, ad.campaignId);
    navigate(`/campaigns/${ad.campaignId}/ads/${clone.id}`, {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <article
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-card-action]')) return;
        openAd();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('[data-card-action]')) return;
          e.preventDefault();
          openAd();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Open ${ad.title}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
        padding: 'var(--s-4)',
        background: 'var(--surface-raised)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lg)',
        cursor: 'pointer',
        transition: 'border-color var(--motion-fast) var(--ease-out-quart)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline)';
      }}
    >
      <div>
        {ad.location === 'diningHallMenu' ? (
          <DiningHallStage>
            <AdPreview ad={ad} showLabel={false} />
          </DiningHallStage>
        ) : (
          <AdPreview ad={ad} showLabel={false} />
        )}
      </div>

      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 'var(--s-2)',
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
            marginLeft: 2,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-body)',
              fontWeight: 600,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
            title={ad.title}
          >
            {ad.title}
          </span>
          {isTop && <InlineTag tone="top">Top</InlineTag>}
          {isCold && <InlineTag tone="cold">Cold</InlineTag>}
        </div>
        <div data-card-action style={{ display: 'inline-flex' }}>
          <ActionMenu
            items={[
              { label: 'Open', icon: <Pencil size={14} />, onClick: openAd },
              ...(inAdsLibrary
                ? []
                : [
                    {
                      label: 'Duplicate here',
                      icon: <Copy size={14} />,
                      onClick: handleDuplicateHere,
                    },
                  ]),
              {
                label: 'Duplicate to another campaign',
                icon: <Send size={14} />,
                onClick: () => onDuplicateAcross(ad),
              },
              {
                label: isActive ? 'Pause' : 'Activate',
                icon: isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () =>
                  void commands.toggleAdStatus(ad.id),
              },
              {
                label: 'Delete',
                icon: <Trash2 size={14} />,
                onClick: () => onDeleteRequest(ad),
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
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'baseline',
        }}
      >
        {showCampaign && campaign && (
          <>
            <span>{campaign.name}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <span>{AD_LOCATION_LABEL[ad.location]}</span>
      </p>

      <MetricLine win={win} />
    </article>
  );
}

function MetricLine({
  win,
}: {
  win: ReturnType<typeof singleAdWindow>;
}) {
  if (!win) return null;
  const { clicks7d, ctr7d, impressions7d, ctrDelta } = win;

  if (impressions7d === 0) {
    return (
      <p
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
          margin: 0,
        }}
      >
        Not yet served. Audience signals will appear once it runs.
      </p>
    );
  }

  return (
    <p
      style={{
        fontSize: 'var(--type-meta)',
        color: 'var(--ink-2)',
        margin: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        fontWeight: 500,
      }}
    >
      <span>
        <strong className="num" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {formatNumber(clicks7d)}
        </strong>{' '}
        clicks
      </span>
      <span aria-hidden style={{ color: 'var(--ink-3)' }}>·</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
        <strong className="num" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {formatPercent(ctr7d, 2)}
        </strong>{' '}
        CTR
        <DeltaArrow delta={ctrDelta} />
      </span>
    </p>
  );
}

function DeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.1) return null;
  if (delta > 0) {
    return <ArrowUpRight size={12} strokeWidth={2.5} color="var(--trend-positive)" />;
  }
  return <ArrowDownRight size={12} strokeWidth={2.5} color="var(--trend-negative)" />;
}

/**
 * Wraps a dining-hall-menu AdPreview in its actual visual context: a stretch
 * of menu rows above and below the ad pill. Without this the small pill sits
 * alone in a tall card and leaves dead space; with it, the operator sees how
 * their ad slots into the menu the way an end user will.
 */
function DiningHallStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      style={{
        background: '#0d121e',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflow: 'hidden',
      }}
    >
      <MenuRow opacity={0.22} />
      <div style={{ margin: '2px 0' }}>{children}</div>
      <MenuRow opacity={0.22} />
    </div>
  );
}

function MenuRow({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 4px',
        opacity,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(168,185,232,0.18)',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        <div
          style={{
            height: 5,
            width: '62%',
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            height: 4,
            width: '38%',
            background: 'rgba(255,255,255,0.14)',
            borderRadius: 999,
          }}
        />
      </div>
      <div
        style={{
          height: 5,
          width: 24,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 999,
        }}
      />
    </div>
  );
}

function InlineTag({
  tone,
  children,
}: {
  tone: 'top' | 'cold';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'top'
      ? { bg: 'var(--accent-tint)', fg: 'var(--status-active-on)' }
      : { bg: 'var(--trend-negative-tint)', fg: 'var(--trend-negative)' };
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
