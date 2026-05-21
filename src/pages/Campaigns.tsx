import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { CampaignCard } from '../components/campaign/CampaignCard';
import { CampaignForm } from '../components/campaign/CampaignForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useApp } from '../store/AppContext';
import { campaignsInOrder } from '../store/selectors';
import { newCampaignSkeleton } from '../lib/clone';
import type { Campaign } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export default function CampaignsPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const campaigns = campaignsInOrder(state);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  return (
    <>
      <PageHeader
        title=""
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setShowForm(true)}>
            New campaign
          </Button>
        }
      />
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={24} />}
          title="No campaigns yet"
          description="Create your first campaign to start serving ads on UPlate."
          action={
            <Button iconLeft={<Plus size={16} />} onClick={() => setShowForm(true)}>
              Create campaign
            </Button>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 'var(--s-4)',
          }}
        >
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onDeleteRequest={setPendingDelete} />
          ))}
        </div>
      )}

      <CampaignForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => {
          const c = { ...newCampaignSkeleton(), ...data };
          dispatch({ type: 'CAMPAIGN_CREATE', payload: c });
          setShowForm(false);
          navigate(`/campaigns/${c.id}`);
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete campaign?"
        message={`Permanently remove "${pendingDelete?.name ?? ''}" and all of its ads. This can't be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            dispatch({ type: 'CAMPAIGN_DELETE', payload: { id: pendingDelete.id } });
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}
