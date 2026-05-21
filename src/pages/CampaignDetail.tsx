import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AdCard } from '../components/ad/AdCard';
import { AdCreateDialog } from '../components/ad/AdCreateDialog';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import { CampaignForm } from '../components/campaign/CampaignForm';
import { TrendChart } from '../components/charts/TrendChart';
import { BarComparison } from '../components/charts/BarComparison';
import { useApp } from '../store/AppContext';
import {
  adCtr,
  adsForCampaign,
  aggregateSeries,
  campaignAnalytics,
} from '../store/selectors';
import { formatDateRange, formatNumber, formatPercent } from '../lib/format';
import type { Ad } from '../types';
import { cloneCampaign } from '../lib/clone';

export default function CampaignDetail() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'ads' | 'analytics'>('ads');
  const [pendingAdDelete, setPendingAdDelete] = useState<Ad | null>(null);
  const [duplicateAd, setDuplicateAd] = useState<Ad | null>(null);
  const [confirmCampaignDelete, setConfirmCampaignDelete] = useState(false);
  const [createAdOpen, setCreateAdOpen] = useState(false);

  const campaign = id ? state.campaigns[id] : undefined;
  const editing = params.get('edit') === '1';
  const ads = useMemo(() => (campaign ? adsForCampaign(state, campaign.id) : []), [state, campaign]);
  const stats = campaign ? campaignAnalytics(state, campaign.id) : null;
  const series = useMemo(
    () => (campaign ? aggregateSeries(state, campaign.id) : []),
    [state, campaign]
  );

  if (!campaign) {
    return (
      <EmptyState
        title="Campaign not found"
        description="It may have been deleted."
        action={<Button onClick={() => navigate('/campaigns')}>Back to campaigns</Button>}
      />
    );
  }

  const isActive = campaign.status === 'active';

  const handleDuplicateCampaign = () => {
    const cloned = cloneCampaign(campaign, ads);
    dispatch({
      type: 'CAMPAIGN_DUPLICATE',
      payload: { id: campaign.id, newCampaign: cloned.campaign, newAds: cloned.ads },
    });
    navigate(`/campaigns/${cloned.campaign.id}?edit=1`);
  };

  const sortedByCtr = [...ads].sort((a, b) => adCtr(b) - adCtr(a));
  const best = sortedByCtr.slice(0, 3);
  const worst = sortedByCtr.slice(-3).reverse();

  return (
    <>
      <PageHeader
        title=""
        back="/campaigns"
        meta={
          <>
            <Badge tone={isActive ? 'active' : 'paused'} withDot>
              {isActive ? 'Active' : 'Paused'}
            </Badge>
            <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              {formatDateRange(campaign.startDate, campaign.endDate)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              {ads.length} ad{ads.length === 1 ? '' : 's'}
            </span>
          </>
        }
        actions={
          <>
            <Toggle
              checked={isActive}
              onChange={() =>
                dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id: campaign.id } })
              }
              label={isActive ? 'Active' : 'Paused'}
            />
            <Button
              variant="ghost"
              iconLeft={<Pencil size={14} />}
              onClick={() => setParams({ edit: '1' })}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              iconLeft={<Copy size={14} />}
              onClick={handleDuplicateCampaign}
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              iconLeft={<Trash2 size={14} />}
              onClick={() => setConfirmCampaignDelete(true)}
            >
              Delete
            </Button>
            <Button iconLeft={<Plus size={16} />} onClick={() => setCreateAdOpen(true)}>
              New ad
            </Button>
          </>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s-4)',
          marginBottom: 'var(--s-5)',
        }}
      >
        <MiniStat label="Impressions" value={formatNumber(stats?.impressions ?? 0)} />
        <MiniStat label="Clicks" value={formatNumber(stats?.clicks ?? 0)} />
        <MiniStat label="CTR" value={formatPercent(stats?.ctr ?? 0)} />
        <MiniStat
          label="Active Ads"
          value={`${stats?.activeAdCount ?? 0} / ${ads.length}`}
        />
      </div>

      <div style={{ display: 'flex', marginBottom: 'var(--s-4)' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as 'ads' | 'analytics')}
          tabs={[
            { value: 'ads', label: 'Ads' },
            { value: 'analytics', label: 'Analytics' },
          ]}
        />
      </div>

      {tab === 'ads' && (
        <>
          {ads.length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={24} />}
              title="No ads in this campaign"
              description="Add your first ad creative — you can configure targeting after creating it."
              action={
                <Button iconLeft={<Plus size={16} />} onClick={() => setCreateAdOpen(true)}>
                  Create ad
                </Button>
              }
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
                  onDeleteRequest={setPendingAdDelete}
                  onDuplicateAcross={setDuplicateAd}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <Card padding="var(--s-5)">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
              Impressions trend
            </h3>
            <TrendChart
              data={series.map((s) => ({ date: s.date, value: s.impressions }))}
              label="Impressions"
            />
          </Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--s-4)',
            }}
          >
            <Card padding="var(--s-5)">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
                Best performing
              </h3>
              {best.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>No data yet.</p>
              ) : (
                <BarComparison
                  data={best.map((ad) => ({ name: ad.title, value: adCtr(ad) }))}
                  valueLabel="CTR"
                  formatValue={(n) => formatPercent(n)}
                  height={180}
                />
              )}
            </Card>
            <Card padding="var(--s-5)">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
                Underperforming
              </h3>
              {worst.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>No data yet.</p>
              ) : (
                <BarComparison
                  data={worst.map((ad) => ({ name: ad.title, value: adCtr(ad) }))}
                  valueLabel="CTR"
                  formatValue={(n) => formatPercent(n)}
                  height={180}
                />
              )}
            </Card>
          </div>
        </div>
      )}

      <CampaignForm
        open={editing}
        mode="edit"
        initial={campaign}
        onClose={() => setParams({})}
        onSubmit={(data) => {
          dispatch({ type: 'CAMPAIGN_UPDATE', payload: { id: campaign.id, patch: data } });
          setParams({});
        }}
      />

      <ConfirmDialog
        open={!!pendingAdDelete}
        title="Delete ad?"
        message={`Permanently remove "${pendingAdDelete?.title ?? ''}" from this campaign.`}
        confirmLabel="Delete"
        onCancel={() => setPendingAdDelete(null)}
        onConfirm={() => {
          if (pendingAdDelete) dispatch({ type: 'AD_DELETE', payload: { id: pendingAdDelete.id } });
          setPendingAdDelete(null);
        }}
      />

      <ConfirmDialog
        open={confirmCampaignDelete}
        title="Delete campaign?"
        message={`Permanently remove "${campaign.name}" and all of its ads. This can't be undone.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmCampaignDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'CAMPAIGN_DELETE', payload: { id: campaign.id } });
          setConfirmCampaignDelete(false);
          navigate('/campaigns');
        }}
      />

      <DuplicateAdDialog
        open={!!duplicateAd}
        ad={duplicateAd}
        onClose={() => setDuplicateAd(null)}
      />

      <AdCreateDialog
        open={createAdOpen}
        onClose={() => setCreateAdOpen(false)}
        campaignId={campaign.id}
      />
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="var(--s-4)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-soft)',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -0.4,
          }}
        >
          {value}
        </span>
      </div>
    </Card>
  );
}
