import { useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { AdCard } from '../components/ad/AdCard';
import { AdCreateDialog } from '../components/ad/AdCreateDialog';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { useApp } from '../store/AppContext';
import { campaignsInOrder } from '../store/selectors';
import type { Ad } from '../types';

export default function AdsLibrary() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [pendingDelete, setPendingDelete] = useState<Ad | null>(null);
  const [duplicateAd, setDuplicateAd] = useState<Ad | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const ads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(state.ads)
      .filter((ad) => filter === 'all' || ad.status === filter)
      .filter((ad) => !q || ad.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [state.ads, filter, query]);

  const firstCampaign = campaignsInOrder(state)[0];

  return (
    <>
      <Card padding="var(--s-3)" style={{ marginBottom: 'var(--s-4)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s-3)',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-pill)',
              flex: 1,
              minWidth: 240,
              maxWidth: 360,
            }}
          >
            <Search size={14} color="var(--text-soft)" />
            <input
              placeholder="Search ads by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>
          <Tabs
            value={filter}
            onChange={(v) => setFilter(v as 'all' | 'active' | 'paused')}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
            ]}
          />
          <Button
            iconLeft={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            disabled={!firstCampaign}
          >
            New ad
          </Button>
        </div>
      </Card>

      {ads.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={24} />}
          title="No ads match your filters"
          description="Try clearing the search, or create a new ad in a campaign."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--s-4)',
          }}
        >
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              showCampaign
              onDeleteRequest={setPendingDelete}
              onDuplicateAcross={setDuplicateAd}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete ad?"
        message={`Permanently remove "${pendingDelete?.title ?? ''}".`}
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

      <AdCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
