import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
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
import {
  adsForCampaign,
  aggregateSeries,
  campaignsInOrder,
} from '../../store/selectors';
import { formatNumber, formatPercent } from '../../lib/format';
import type { RangeKey } from '../overview/OverviewChart';

type SortKey = 'clicks' | 'ctr';
type SortDir = 'asc' | 'desc';

const RANGE_LENS: Record<RangeKey, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

interface CampaignsTableProps {
  range: RangeKey;
  onDeleteRequest: (c: Campaign) => void;
}

interface Row {
  campaign: Campaign;
  impressions: number;
  clicks: number;
  ctr: number;
  adCount: number;
  spark: number[];
}

export function CampaignsTable({ range, onDeleteRequest }: CampaignsTableProps) {
  const { state, commands } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sortParam = params.get('campSort') ?? 'clicks-desc';
  const [sortKey, sortDir] = parseSort(sortParam);

  const rows = useMemo<Row[]>(() => {
    const days = RANGE_LENS[range];
    return campaignsInOrder(state).map((c) => {
      const series = aggregateSeries(state, c.id);
      const sliced = days === null ? series : series.slice(-days);
      const impressions = sliced.reduce((a, p) => a + p.impressions, 0);
      const clicks = sliced.reduce((a, p) => a + p.clicks, 0);
      const ctr = impressions === 0 ? 0 : clicks / impressions;
      const ads = adsForCampaign(state, c.id);
      const spark = aggregateSeries(state, c.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((p) => p.clicks);
      return { campaign: c, impressions, clicks, ctr, adCount: ads.length, spark };
    });
  }, [state, range]);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = sortKey === 'clicks' ? a.clicks : a.ctr;
      const bv = sortKey === 'clicks' ? b.clicks : b.ctr;
      const diff = av - bv;
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  const topId = useMemo(() => {
    const candidates = rows.filter((r) => r.clicks > 0);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.clicks - a.clicks)[0].campaign.id;
  }, [rows]);

  const setSort = (key: SortKey) => {
    const nextDir: SortDir = sortKey === key && sortDir === 'desc' ? 'asc' : 'desc';
    const next = new URLSearchParams(params);
    if (key === 'clicks' && nextDir === 'desc') next.delete('campSort');
    else next.set('campSort', `${key}-${nextDir}`);
    setParams(next, { replace: true });
  };

  if (rows.length === 0) return null;

  const handleDuplicate = async (c: Campaign) => {
    const created = await commands.duplicateCampaign(c.id);
    navigate(`/campaigns/${created.id}`);
  };

  return (
    <section
      aria-label="Campaigns ranked"
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
          Campaigns
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          {rows.length} total, sorted by{' '}
          {sortKey === 'clicks' ? 'clicks' : 'CTR'} {sortDir === 'desc' ? 'high to low' : 'low to high'}
        </span>
      </header>

      <div
        role="table"
        className="uplate-camps-table"
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          overflow: 'hidden',
        }}
      >
        <div role="row" className="uplate-camps-table__header">
          <span role="columnheader" className="uplate-camps-table__c-status" />
          <span role="columnheader" className="uplate-camps-table__c-name uplate-camps-table__head-cell">
            Campaign
          </span>
          <span role="columnheader" className="uplate-camps-table__c-spark" />
          <span role="columnheader" className="uplate-camps-table__c-num uplate-camps-table__head-cell">
            Impressions
          </span>
          <SortHeader
            label="Clicks"
            active={sortKey === 'clicks'}
            dir={sortDir}
            onClick={() => setSort('clicks')}
          />
          <SortHeader
            label="CTR"
            active={sortKey === 'ctr'}
            dir={sortDir}
            onClick={() => setSort('ctr')}
          />
          <span role="columnheader" className="uplate-camps-table__c-ads uplate-camps-table__head-cell">
            Ads
          </span>
          <span role="columnheader" className="uplate-camps-table__c-actions" />
        </div>

        {sorted.map((row) => (
          <CampaignRow
            key={row.campaign.id}
            row={row}
            isTop={row.campaign.id === topId && row.clicks > 0}
            onDuplicate={handleDuplicate}
            onDeleteRequest={onDeleteRequest}
            commands={commands}
            navigate={navigate}
          />
        ))}
      </div>
    </section>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      onClick={onClick}
      className="uplate-camps-table__c-num uplate-camps-table__head-cell uplate-camps-table__sort"
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

function CampaignRow({
  row,
  isTop,
  onDuplicate,
  onDeleteRequest,
  commands,
  navigate,
}: {
  row: Row;
  isTop: boolean;
  onDuplicate: (c: Campaign) => void;
  onDeleteRequest: (c: Campaign) => void;
  commands: ReturnType<typeof useApp>['commands'];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { campaign, impressions, clicks, ctr, adCount, spark } = row;
  const isActive = campaign.status === 'active';

  return (
    <div
      role="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-action]')) return;
        navigate(`/campaigns/${campaign.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('[data-action]')) return;
          e.preventDefault();
          navigate(`/campaigns/${campaign.id}`);
        }
      }}
      tabIndex={0}
      className="uplate-camps-table__row"
    >
      <div role="cell" className="uplate-camps-table__c-status">
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

      <div role="cell" className="uplate-camps-table__c-name">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Link
            to={`/campaigns/${campaign.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-body)',
              fontWeight: 500,
              color: 'var(--ink)',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {campaign.name}
          </Link>
          {isTop && <InlineTag>Top</InlineTag>}
        </div>
        <span
          style={{
            display: 'block',
            fontSize: 'var(--type-eyebrow)',
            color: 'var(--ink-3)',
            marginTop: 2,
          }}
        >
          {isActive ? 'Active' : 'Paused'} · {adCount} ad{adCount === 1 ? '' : 's'}
        </span>
      </div>

      <div
        role="cell"
        className="uplate-camps-table__c-spark"
        style={{ color: 'var(--data-clicks)' }}
      >
        {spark.length >= 2 ? (
          <Sparkline data={spark} height={24} strokeWidth={1.5} />
        ) : null}
      </div>

      <div role="cell" className="uplate-camps-table__c-num">
        <span className="num" style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
          {formatNumber(impressions)}
        </span>
      </div>

      <div role="cell" className="uplate-camps-table__c-num">
        <span className="num" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {formatNumber(clicks)}
        </span>
      </div>

      <div role="cell" className="uplate-camps-table__c-num">
        <span className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {impressions === 0 ? '0.00%' : formatPercent(ctr, 2)}
        </span>
      </div>

      <div role="cell" className="uplate-camps-table__c-ads">
        <span className="num" style={{ color: 'var(--ink-3)' }}>
          {adCount}
        </span>
      </div>

      <div role="cell" className="uplate-camps-table__c-actions" data-action>
        <ActionMenu
          items={[
            { label: 'View', icon: <Eye size={14} />, onClick: () => navigate(`/campaigns/${campaign.id}`) },
            {
              label: 'Edit',
              icon: <Pencil size={14} />,
              onClick: () => navigate(`/campaigns/${campaign.id}?edit=1`),
            },
            {
              label: isActive ? 'Pause' : 'Activate',
              icon: isActive ? <Pause size={14} /> : <Play size={14} />,
              onClick: () =>
                void commands.toggleCampaignStatus(campaign.id),
            },
            { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => onDuplicate(campaign) },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => onDeleteRequest(campaign),
              danger: true,
            },
          ]}
        />
      </div>
    </div>
  );
}

function InlineTag({ children }: { children: React.ReactNode }) {
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
        background: 'var(--accent-tint)',
        color: 'var(--status-active-on)',
        flexShrink: 0,
        fontFamily: 'var(--font-ui)',
      }}
    >
      {children}
    </span>
  );
}

function parseSort(value: string): [SortKey, SortDir] {
  const [k, d] = value.split('-');
  const key: SortKey = k === 'ctr' ? 'ctr' : 'clicks';
  const dir: SortDir = d === 'asc' ? 'asc' : 'desc';
  return [key, dir];
}
