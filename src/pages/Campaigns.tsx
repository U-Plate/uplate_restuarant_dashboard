import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CampaignCard } from '../components/campaign/CampaignCard';
import { CampaignForm } from '../components/campaign/CampaignForm';
import { BrowseChrome } from '../components/layout/BrowseChrome';
import { useApp } from '../store/AppContext';
import { campaignsInOrder } from '../store/selectors';
import { campaignWindow } from '../lib/verdict';
import type { Campaign } from '../types';

type SortKey = 'updated' | 'name' | 'clicks' | 'status';
type StatusFilter = 'all' | 'active' | 'paused';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently updated' },
  { value: 'name' as const, label: 'Name (A to Z)' },
  { value: 'clicks' as const, label: 'Clicks (7 days)' },
  { value: 'status' as const, label: 'Status' },
];

export default function CampaignsPage() {
  const { state, commands } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const query = params.get('q') ?? '';
  const status = (params.get('status') as StatusFilter) || 'all';
  const sort = (params.get('sort') as SortKey) || 'updated';

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || value === '' || value === defaultFor(key)) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const allCampaigns = useMemo(() => campaignsInOrder(state), [state]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCampaigns
      .filter((c) => status === 'all' || c.status === status)
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [allCampaigns, query, status]);

  const withWindow = useMemo(
    () => filtered.map((c) => ({ campaign: c, window: campaignWindow(state, c.id) })),
    [filtered, state],
  );

  const sorted = useMemo(() => {
    const list = [...withWindow];
    switch (sort) {
      case 'name':
        list.sort((a, b) => a.campaign.name.localeCompare(b.campaign.name));
        break;
      case 'clicks':
        list.sort((a, b) => b.window.clicks7d - a.window.clicks7d);
        break;
      case 'status':
        list.sort((a, b) => {
          if (a.campaign.status === b.campaign.status) return 0;
          return a.campaign.status === 'active' ? -1 : 1;
        });
        break;
      case 'updated':
      default:
        list.sort((a, b) => b.campaign.updatedAt.localeCompare(a.campaign.updatedAt));
        break;
    }
    return list;
  }, [withWindow, sort]);

  const topId = useMemo(() => {
    const candidates = withWindow.filter((c) => c.window.clicks7d > 0);
    if (candidates.length === 0) return null;
    const winner = [...candidates].sort((a, b) => b.window.clicks7d - a.window.clicks7d)[0];
    return winner.campaign.id;
  }, [withWindow]);

  const hasAnyCampaigns = allCampaigns.length > 0;
  const filtersApplied = query !== '' || status !== 'all';
  const isFilteredEmpty = hasAnyCampaigns && sorted.length === 0;

  if (!hasAnyCampaigns) {
    return (
      <>
        <FirstRunHeader onCreate={() => setShowForm(true)} />
        <CampaignForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={async (data) => {
            const c = await commands.createCampaign(data);
            setShowForm(false);
            navigate(`/campaigns/${c.id}`);
          }}
        />
      </>
    );
  }

  return (
    <>
      <BrowseChrome
        title="Campaigns"
        query={query}
        onQueryChange={(v) => updateParam('q', v)}
        searchPlaceholder="Search by name"
        status={status}
        onStatusChange={(v) => updateParam('status', v)}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => updateParam('sort', v)}
        cta={
          <Button iconLeft={<Plus size={16} />} onClick={() => setShowForm(true)}>
            New campaign
          </Button>
        }
      />

      {isFilteredEmpty ? (
        <FilteredEmpty onClear={() => setParams({})} />
      ) : (
        <div className="uplate-browse-grid--campaigns">
          {sorted.map(({ campaign }) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isTop={filtersApplied ? false : campaign.id === topId}
              onDeleteRequest={setPendingDelete}
            />
          ))}
        </div>
      )}

      <CampaignForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => {
          const c = await commands.createCampaign(data);
          setShowForm(false);
          navigate(`/campaigns/${c.id}`);
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete campaign?"
        message={`Delete ${pendingDelete?.name ?? ''}? This removes the campaign and all of its ads. This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void commands.deleteCampaign(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
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

function FirstRunHeader({ onCreate }: { onCreate: () => void }) {
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
        No campaigns yet.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Create your first to start showing ads on UPlate. Campaigns are how you group ads, set a date range, and turn serving on or off.
      </p>
      <div>
        <Button iconLeft={<Plus size={16} />} onClick={onCreate}>
          Create campaign
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
        No campaigns match these filters.
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
