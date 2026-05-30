import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { aggregateSeries } from '../store/selectors';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { OverviewChart, type RangeKey } from '../components/overview/OverviewChart';
import { CampaignsTable } from '../components/analytics/CampaignsTable';
import { TopAdsList } from '../components/analytics/TopAdsList';
import type { Campaign } from '../types';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

export default function Analytics() {
  const { state, dispatch } = useApp();
  const [params, setParams] = useSearchParams();
  const requestedRange = params.get('range') as RangeKey | null;
  const range: RangeKey =
    requestedRange === '7d' ||
    requestedRange === '30d' ||
    requestedRange === '90d' ||
    requestedRange === 'all'
      ? requestedRange
      : '30d';

  const setRange = (next: RangeKey) => {
    const nextParams = new URLSearchParams(params);
    if (next === '30d') nextParams.delete('range');
    else nextParams.set('range', next);
    setParams(nextParams, { replace: true });
  };

  const series = useMemo(() => aggregateSeries(state), [state]);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const hasCampaigns = Object.keys(state.campaigns).length > 0;

  if (!hasCampaigns) {
    return <EmptyState />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-8)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            Analytics
          </h1>
          <p style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            Performance across your campaigns and ads.
          </p>
        </div>
        <RangePill value={range} onChange={setRange} />
      </header>

      <OverviewChart series={series} range={range} />

      <CampaignsTable range={range} onDeleteRequest={setPendingDelete} />

      <TopAdsList range={range} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete campaign?"
        message={`Delete ${pendingDelete?.name ?? ''}? This removes the campaign and all of its ads. This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) dispatch({ type: 'CAMPAIGN_DELETE', payload: { id: pendingDelete.id } });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function RangePill({ value, onChange }: { value: RangeKey; onChange: (next: RangeKey) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      style={{
        display: 'inline-flex',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
        border: '1px solid var(--hairline)',
      }}
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontSize: 'var(--type-meta)',
              fontWeight: active ? 600 : 500,
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px oklch(0.22 0.01 250 / 0.06)' : 'none',
              transition: 'background var(--motion-fast) var(--ease-out-quart)',
              fontFamily: 'var(--font-ui)',
              minHeight: 28,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-5)',
        maxWidth: '52ch',
        padding: 'var(--s-7) 0',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--type-display)',
          lineHeight: 'var(--type-display-lh)',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.022em',
        }}
      >
        Nothing to measure yet.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Create a campaign with at least one ad. Performance, comparison, and ranking will appear here as your ads serve.
      </p>
    </div>
  );
}
