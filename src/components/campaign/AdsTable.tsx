import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';
import { formatNumber, formatPercent } from '../../lib/format';
import { describeTargeting } from '../../lib/targeting';
import { adWindowMetrics, type AdWindowMetrics } from '../../lib/verdict';
import { ActionMenu } from '../ui/ActionMenu';
import { Sparkline } from '../charts/Sparkline';
import { AD_LOCATION_LABEL } from '../../data/constants';

type SortKey = 'clicks' | 'ctr';
type SortDir = 'asc' | 'desc';

interface AdsTableProps {
  campaignId: string;
  onDeleteRequest: (ad: Ad) => void;
  onDuplicateAcross: (ad: Ad) => void;
  onCreateAd: () => void;
}

export function AdsTable({
  campaignId,
  onDeleteRequest,
  onDuplicateAcross,
  onCreateAd,
}: AdsTableProps) {
  const { state } = useApp();
  const [params, setParams] = useSearchParams();
  const sortParam = params.get('sort') ?? 'clicks-desc';
  const [sortKey, sortDir] = parseSort(sortParam);

  const rows = useMemo(() => {
    const metrics = adWindowMetrics(state, campaignId);
    const sorted = [...metrics].sort((a, b) => compare(a, b, sortKey, sortDir));
    return sorted;
  }, [state, campaignId, sortKey, sortDir]);

  const topId = useMemo(() => {
    const candidates = rows.filter((r) => r.impressions7d >= 100);
    if (candidates.length === 0) return null;
    const best = [...candidates].sort((a, b) => b.ctr7d - a.ctr7d)[0];
    return best.ctr7d > 0 ? best.ad.id : null;
  }, [rows]);

  const coldIds = useMemo(() => {
    return new Set(
      rows
        .filter(
          (r) => r.ad.status === 'active' && r.impressions7d >= 100 && r.clicks7d === 0,
        )
        .map((r) => r.ad.id),
    );
  }, [rows]);

  const setSort = (key: SortKey) => {
    const nextDir: SortDir = sortKey === key && sortDir === 'desc' ? 'asc' : 'desc';
    const next = new URLSearchParams(params);
    if (key === 'clicks' && nextDir === 'desc') next.delete('sort');
    else next.set('sort', `${key}-${nextDir}`);
    setParams(next, { replace: true });
  };

  if (rows.length === 0) {
    return <EmptyTable onCreate={onCreateAd} />;
  }

  return (
    <section
      aria-label="Ads in this campaign"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-h3)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.011em',
          }}
        >
          Ads in this campaign
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          {rows.length} ad{rows.length === 1 ? '' : 's'} · sorted by{' '}
          {sortKey === 'clicks' ? 'clicks' : 'CTR'} {sortDir === 'desc' ? 'high to low' : 'low to high'}
        </span>
      </header>

      <div
        role="table"
        aria-label="Ads"
        className="uplate-ads-table"
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          overflow: 'hidden',
        }}
      >
        <HeaderRow sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
        {rows.map((row) => (
          <AdRow
            key={row.ad.id}
            row={row}
            campaignId={campaignId}
            isTop={topId === row.ad.id}
            isCold={coldIds.has(row.ad.id)}
            onDeleteRequest={onDeleteRequest}
            onDuplicateAcross={onDuplicateAcross}
          />
        ))}
      </div>
    </section>
  );
}

function HeaderRow({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <div role="row" className="uplate-ads-table__header">
      <span role="columnheader" aria-label="Status" className="uplate-ads-table__c-status" />
      <span role="columnheader" className="uplate-ads-table__c-title uplate-ads-table__head-cell">
        Ad
      </span>
      <span role="columnheader" className="uplate-ads-table__c-target uplate-ads-table__head-cell">
        Targeting
      </span>
      <span
        role="columnheader"
        aria-label="30-day clicks trend"
        className="uplate-ads-table__c-spark"
      />
      <SortHeader
        label="Clicks"
        active={sortKey === 'clicks'}
        dir={sortDir}
        onClick={() => onSort('clicks')}
        className="uplate-ads-table__c-num"
      />
      <SortHeader
        label="CTR"
        active={sortKey === 'ctr'}
        dir={sortDir}
        onClick={() => onSort('ctr')}
        className="uplate-ads-table__c-num"
      />
      <span role="columnheader" aria-label="Actions" className="uplate-ads-table__c-actions" />
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      onClick={onClick}
      className={[className, 'uplate-ads-table__head-cell uplate-ads-table__sort'].filter(Boolean).join(' ')}
    >
      <span style={{ fontWeight: active ? 600 : 500, color: active ? 'var(--ink)' : 'var(--ink-3)' }}>
        {label}
      </span>
      {active &&
        (dir === 'desc' ? (
          <ChevronDown size={12} strokeWidth={2.25} />
        ) : (
          <ChevronUp size={12} strokeWidth={2.25} />
        ))}
    </button>
  );
}

function AdRow({
  row,
  campaignId,
  isTop,
  isCold,
  onDeleteRequest,
  onDuplicateAcross,
}: {
  row: AdWindowMetrics;
  campaignId: string;
  isTop: boolean;
  isCold: boolean;
  onDeleteRequest: (ad: Ad) => void;
  onDuplicateAcross: (ad: Ad) => void;
}) {
  const { commands } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { ad, clicks7d, ctr7d, impressions7d, ctrDelta, spark30d } = row;
  const isActive = ad.status === 'active';
  const targetingSummary = describeTargeting(ad.targeting);

  const openAd = () => {
    navigate(`/campaigns/${campaignId}/ads/${ad.id}`, {
      state: { from: location.pathname + location.search },
    });
  };

  const handleDuplicateHere = async () => {
    const clone = await commands.duplicateAd(ad.id, campaignId);
    navigate(`/campaigns/${campaignId}/ads/${clone.id}`, {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <div
      role="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-action]')) return;
        openAd();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAd();
        }
      }}
      tabIndex={0}
      className="uplate-ads-table__row"
    >
      <div role="cell" className="uplate-ads-table__c-status">
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
          }}
        />
        <span className="sr-only">{isActive ? 'Active' : 'Paused'}</span>
      </div>

      <div role="cell" className="uplate-ads-table__c-title">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-body)',
              fontWeight: 500,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={ad.title}
          >
            {ad.title}
          </span>
          {isTop && <PerformanceTag tone="top">Top</PerformanceTag>}
          {isCold && <PerformanceTag tone="cold">Cold</PerformanceTag>}
        </div>
        <div
          style={{
            fontSize: 'var(--type-eyebrow)',
            color: 'var(--ink-3)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 2,
          }}
        >
          <span>{AD_LOCATION_LABEL[ad.location]}</span>
          <span aria-hidden>·</span>
          <span className="uplate-ads-table__targeting-mobile">{targetingSummary}</span>
        </div>
      </div>

      <div
        role="cell"
        className="uplate-ads-table__c-target"
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {targetingSummary}
      </div>

      <div
        className="uplate-ads-table__mobile-meta"
        aria-hidden
      >
        <span>
          <strong className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {formatNumber(clicks7d)}
          </strong>{' '}
          clicks
        </span>
        <span>
          <strong className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {impressions7d === 0 ? '0.00%' : formatPercent(ctr7d, 2)}
          </strong>{' '}
          CTR
        </span>
        <span>
          <strong className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {formatNumber(impressions7d)}
          </strong>{' '}
          views
        </span>
      </div>

      <div
        role="cell"
        className="uplate-ads-table__c-spark"
        style={{ color: 'var(--data-clicks)' }}
      >
        {spark30d.length >= 2 ? (
          <Sparkline data={spark30d} height={24} strokeWidth={1.5} />
        ) : (
          <span style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)' }}>not enough data</span>
        )}
      </div>

      <div
        role="cell"
        className="uplate-ads-table__c-num"
      >
        <span
          className="num"
          style={{ fontWeight: 500, color: 'var(--ink)' }}
        >
          {formatNumber(clicks7d)}
        </span>
        <span
          style={{
            fontSize: 'var(--type-eyebrow)',
            color: 'var(--ink-3)',
            display: 'block',
            marginTop: 2,
          }}
        >
          7d
        </span>
      </div>

      <div
        role="cell"
        className="uplate-ads-table__c-num"
      >
        <span
          className="num"
          style={{
            fontWeight: 500,
            color: 'var(--ink)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {impressions7d === 0 ? '0.00%' : formatPercent(ctr7d, 2)}
          <DeltaArrow delta={ctrDelta} />
        </span>
        <span
          style={{
            fontSize: 'var(--type-eyebrow)',
            color: 'var(--ink-3)',
            display: 'block',
            marginTop: 2,
          }}
        >
          {formatNumber(impressions7d)} views
        </span>
      </div>

      <div role="cell" className="uplate-ads-table__c-actions" data-action>
        <ActionMenu
          items={[
            { label: 'Open ad', icon: <Pencil size={14} />, onClick: openAd },
            {
              label: 'Duplicate here',
              icon: <Copy size={14} />,
              onClick: handleDuplicateHere,
            },
            {
              label: 'Duplicate to other campaign',
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
    </div>
  );
}

function PerformanceTag({ tone, children }: { tone: 'top' | 'cold'; children: ReactNode }) {
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
      }}
    >
      {children}
    </span>
  );
}

function DeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.1) return null;
  if (delta > 0) {
    return <ArrowUpRight size={13} strokeWidth={2.25} color="var(--trend-positive)" />;
  }
  return <ArrowDownRight size={13} strokeWidth={2.25} color="var(--trend-negative)" />;
}

function EmptyTable({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--s-4)',
        padding: 'var(--s-7) var(--s-6)',
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--surface-raised)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-h3)',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          No ads in this campaign yet
        </h2>
        <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', maxWidth: '46ch' }}>
          Create your first ad. Targeting and creative can be edited after the ad is saved.
        </p>
      </div>
      <Link
        to="#"
        onClick={(e) => {
          e.preventDefault();
          onCreate();
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          borderRadius: 'var(--r-md)',
          background: 'var(--accent)',
          color: 'var(--accent-on)',
          textDecoration: 'none',
          fontSize: 'var(--type-body)',
          fontWeight: 600,
        }}
      >
        <Plus size={16} strokeWidth={2} />
        Create ad
      </Link>
    </div>
  );
}

function parseSort(value: string): [SortKey, SortDir] {
  const [k, d] = value.split('-');
  const key: SortKey = k === 'ctr' ? 'ctr' : 'clicks';
  const dir: SortDir = d === 'asc' ? 'asc' : 'desc';
  return [key, dir];
}

function compare(a: AdWindowMetrics, b: AdWindowMetrics, key: SortKey, dir: SortDir): number {
  const av = key === 'clicks' ? a.clicks7d : a.ctr7d;
  const bv = key === 'clicks' ? b.clicks7d : b.ctr7d;
  const diff = av - bv;
  return dir === 'desc' ? -diff : diff;
}
