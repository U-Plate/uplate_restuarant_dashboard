import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AdCard } from '../components/ad/AdCard';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import { BrowseChrome } from '../components/layout/BrowseChrome';
import { useApp } from '../store/AppContext';
import { campaignsInOrder } from '../store/selectors';
import { singleAdWindow } from '../lib/verdict';
import type { Ad } from '../types';

type SortKey = 'updated' | 'name' | 'clicks' | 'ctr';
type StatusFilter = 'all' | 'active' | 'paused';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently updated' },
  { value: 'name' as const, label: 'Title (A to Z)' },
  { value: 'clicks' as const, label: 'Clicks (7 days)' },
  { value: 'ctr' as const, label: 'CTR (7 days)' },
];

export default function AdsLibrary() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState<Ad | null>(null);
  const [duplicateAd, setDuplicateAd] = useState<Ad | null>(null);

  const startCreate = () => {
    const first = campaignsInOrder(state)[0];
    if (!first) return;
    navigate(`/campaigns/${first.id}/ads/new`, {
      state: { from: location.pathname + location.search },
    });
  };

  const query = params.get('q') ?? '';
  const status = (params.get('status') as StatusFilter) || 'all';
  const sort = (params.get('sort') as SortKey) || 'updated';

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || value === '' || value === defaultFor(key)) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const allAds = useMemo(() => Object.values(state.ads), [state.ads]);
  const hasAnyCampaign = campaignsInOrder(state).length > 0;
  const hasAnyAd = allAds.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAds
      .filter((ad) => status === 'all' || ad.status === status)
      .filter((ad) => !q || ad.title.toLowerCase().includes(q));
  }, [allAds, query, status]);

  const withWindow = useMemo(
    () =>
      filtered.map((ad) => ({
        ad,
        window: singleAdWindow(state, ad.id),
      })),
    [filtered, state],
  );

  const sorted = useMemo(() => {
    const list = [...withWindow];
    switch (sort) {
      case 'name':
        list.sort((a, b) => a.ad.title.localeCompare(b.ad.title));
        break;
      case 'clicks':
        list.sort((a, b) => (b.window?.clicks7d ?? 0) - (a.window?.clicks7d ?? 0));
        break;
      case 'ctr':
        list.sort((a, b) => (b.window?.ctr7d ?? 0) - (a.window?.ctr7d ?? 0));
        break;
      case 'updated':
      default:
        list.sort((a, b) => b.ad.updatedAt.localeCompare(a.ad.updatedAt));
        break;
    }
    return list;
  }, [withWindow, sort]);

  const topId = useMemo(() => {
    const candidates = withWindow.filter(
      (r) => r.window && r.window.impressions7d >= 100 && r.window.ctr7d > 0,
    );
    if (candidates.length === 0) return null;
    const winner = [...candidates].sort(
      (a, b) => (b.window?.ctr7d ?? 0) - (a.window?.ctr7d ?? 0),
    )[0];
    return winner.ad.id;
  }, [withWindow]);

  const coldIds = useMemo(() => {
    return new Set(
      withWindow
        .filter(
          (r) =>
            r.ad.status === 'active' &&
            r.window &&
            r.window.impressions7d >= 100 &&
            r.window.clicks7d === 0,
        )
        .map((r) => r.ad.id),
    );
  }, [withWindow]);

  const filtersApplied = query !== '' || status !== 'all';
  const isFilteredEmpty = hasAnyAd && sorted.length === 0;

  if (!hasAnyAd) {
    return <FirstRunHeader hasCampaigns={hasAnyCampaign} onCreate={startCreate} />;
  }

  return (
    <>
      <BrowseChrome
        title="Ads"
        subtitle="All creatives across every campaign."
        query={query}
        onQueryChange={(v) => updateParam('q', v)}
        searchPlaceholder="Search by title"
        status={status}
        onStatusChange={(v) => updateParam('status', v)}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => updateParam('sort', v)}
        cta={
          <Button
            iconLeft={<Plus size={16} />}
            onClick={startCreate}
            disabled={!hasAnyCampaign}
            title={hasAnyCampaign ? undefined : 'Create a campaign first to add ads.'}
          >
            New ad
          </Button>
        }
      />

      {isFilteredEmpty ? (
        <FilteredEmpty onClear={() => setParams({})} />
      ) : (
        <div className="uplate-browse-grid--ads">
          {sorted.map(({ ad }) => (
            <AdCard
              key={ad.id}
              ad={ad}
              showCampaign
              isTop={!filtersApplied && ad.id === topId}
              isCold={coldIds.has(ad.id)}
              onDeleteRequest={setPendingDelete}
              onDuplicateAcross={setDuplicateAd}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this ad?"
        message={`Permanently remove "${pendingDelete?.title ?? ''}". This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) dispatch({ type: 'AD_DELETE', payload: { id: pendingDelete.id } });
          setPendingDelete(null);
        }}
      />

      <DuplicateAdDialog
        open={!!duplicateAd}
        ad={duplicateAd}
        onClose={() => setDuplicateAd(null)}
      />
    </>
  );
}

function defaultFor(key: string): string | null {
  switch (key) {
    case 'status':
      return 'all';
    case 'sort':
      return 'updated';
    case 'q':
      return '';
    default:
      return null;
  }
}

function FirstRunHeader({
  hasCampaigns,
  onCreate,
}: {
  hasCampaigns: boolean;
  onCreate: () => void;
}) {
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
        No ads yet.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {hasCampaigns
          ? 'Create one inside a campaign to start serving on UPlate. Each ad has its own creative, targeting, and analytics.'
          : 'Create a campaign first, then add ads to it. Campaigns set the date range and master on or off switch.'}
      </p>
      <div>
        <Button
          iconLeft={<Plus size={16} />}
          onClick={onCreate}
          disabled={!hasCampaigns}
        >
          {hasCampaigns ? 'Create ad' : 'Create a campaign first'}
        </Button>
      </div>
    </div>
  );
}

function FilteredEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-7) var(--s-6)',
        textAlign: 'center',
        color: 'var(--ink-2)',
      }}
    >
      <p style={{ fontSize: 'var(--type-body)', fontWeight: 500, color: 'var(--ink)' }}>
        No ads match these filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: 'var(--type-meta)',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 'var(--s-2)',
          padding: 0,
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
