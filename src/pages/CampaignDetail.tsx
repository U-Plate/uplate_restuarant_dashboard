import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import {
  aggregateSeries,
  campaignAnalytics,
  campaignsInOrder,
} from '../store/selectors';
import {
  computeCampaignVerdict,
  ctrDelta,
  deltaFor,
} from '../lib/verdict';
import { formatNumber, formatPercent } from '../lib/format';
import { cloneCampaign } from '../lib/clone';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Verdict } from '../components/overview/Verdict';
import {
  SupportingNumbers,
  type SupportingNumber,
} from '../components/overview/SupportingNumbers';
import { OverviewChart } from '../components/overview/OverviewChart';
import { CampaignHeader } from '../components/campaign/CampaignHeader';
import { AdsTable } from '../components/campaign/AdsTable';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import type { Ad } from '../types';

export default function CampaignDetail() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [pendingAdDelete, setPendingAdDelete] = useState<Ad | null>(null);
  const [duplicateAd, setDuplicateAd] = useState<Ad | null>(null);
  const [confirmCampaignDelete, setConfirmCampaignDelete] = useState(false);

  const goToCreateAd = () => {
    if (!id) return;
    navigate(`/campaigns/${id}/ads/new`, {
      state: { from: location.pathname + location.search },
    });
  };

  const campaign = id ? state.campaigns[id] : undefined;

  const editing = params.get('edit') === '1';
  const verdict = useMemo(
    () => (campaign ? computeCampaignVerdict(state, campaign.id) : null),
    [state, campaign],
  );
  const stats = campaign ? campaignAnalytics(state, campaign.id) : null;
  const series = useMemo(
    () => (campaign ? aggregateSeries(state, campaign.id) : []),
    [state, campaign],
  );
  const clicksDelta = useMemo(
    () => (campaign ? deltaFor(state, 'clicks', campaign.id) : null),
    [state, campaign],
  );
  const ctrTrend = useMemo(
    () => (campaign ? ctrDelta(state, campaign.id) : null),
    [state, campaign],
  );

  if (!campaign || !verdict || !stats || !clicksDelta || !ctrTrend) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
          padding: 'var(--s-7) 0',
          maxWidth: '40ch',
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
          That campaign isn't here anymore.
        </h1>
        <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)' }}>
          It may have been deleted, or the link is wrong.
        </p>
        <div>
          <Button onClick={() => navigate('/campaigns')}>Back to campaigns</Button>
        </div>
      </div>
    );
  }

  const enterEdit = () => setParams({ edit: '1' });
  const exitEdit = () => {
    const next = new URLSearchParams(params);
    next.delete('edit');
    setParams(next, { replace: true });
  };

  const handleSubmitEdit = (patch: { name: string; startDate: string; endDate: string }) => {
    dispatch({ type: 'CAMPAIGN_UPDATE', payload: { id: campaign.id, patch } });
    exitEdit();
  };

  const handleToggleStatus = () => {
    dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id: campaign.id } });
  };

  const handleDuplicate = () => {
    const ads = campaignsInOrder(state)
      .find((c) => c.id === campaign.id)
      ?.adIds.map((adId) => state.ads[adId])
      .filter((ad): ad is Ad => Boolean(ad)) ?? [];
    const cloned = cloneCampaign(campaign, ads);
    dispatch({
      type: 'CAMPAIGN_DUPLICATE',
      payload: { id: campaign.id, newCampaign: cloned.campaign, newAds: cloned.ads },
    });
    navigate(`/campaigns/${cloned.campaign.id}?edit=1`);
  };

  const adCount = campaign.adIds.length;
  const pausedAdCount = campaign.adIds.filter((adId) => state.ads[adId]?.status !== 'active').length;

  const numbers: SupportingNumber[] = [
    {
      label: 'Clicks',
      value: formatNumber(clicksDelta.recent),
      delta: clicksDelta.hasFullWindow ? clicksDelta.delta : null,
      spark: lastNValues(series, 30, 'clicks'),
      to: `/campaigns/${campaign.id}`,
      tone: 'clicks',
    },
    {
      label: 'CTR · clicks per 100 views',
      value:
        stats.impressions === 0 ? '0.00%' : formatPercent(ctrTrend.recent, 2),
      delta: ctrTrend.hasFullWindow ? ctrTrend.delta : null,
      spark: lastNValues(series, 30, 'ctr'),
      to: `/campaigns/${campaign.id}`,
      tone: 'ctr',
    },
    {
      label: 'Active ads',
      value: `${stats.activeAdCount}`,
      delta: null,
      description:
        adCount === 0
          ? 'No ads yet'
          : pausedAdCount === 0
            ? `All ${adCount} running`
            : `${pausedAdCount} paused`,
      to: `/campaigns/${campaign.id}`,
    },
  ];

  const showAnalyticsZones = adCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-7)' }}>
      <CampaignHeader
        campaign={campaign}
        adCount={adCount}
        editing={editing}
        onStartEdit={enterEdit}
        onCancelEdit={exitEdit}
        onSubmitEdit={handleSubmitEdit}
        onToggleStatus={handleToggleStatus}
        onDuplicate={handleDuplicate}
        onRequestDelete={() => setConfirmCampaignDelete(true)}
        onNewAd={goToCreateAd}
      />

      <Verdict verdict={verdict} />

      {showAnalyticsZones && (
        <>
          <SupportingNumbers numbers={numbers} />
          <OverviewChart series={series} />
        </>
      )}

      <AdsTable
        campaignId={campaign.id}
        onDeleteRequest={setPendingAdDelete}
        onDuplicateAcross={setDuplicateAd}
        onCreateAd={goToCreateAd}
      />

      <ConfirmDialog
        open={!!pendingAdDelete}
        title="Delete ad?"
        message={`Permanently remove "${pendingAdDelete?.title ?? ''}" from this campaign. This cannot be undone.`}
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
        message={`Delete ${campaign.name}? This removes the campaign and ${adCount} ad${adCount === 1 ? '' : 's'}. This cannot be undone.`}
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
    </div>
  );
}

function lastNValues(
  series: { date: string; clicks: number; impressions: number }[],
  n: number,
  metric: 'clicks' | 'ctr',
): number[] {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-n).map((p) => {
    if (metric === 'clicks') return p.clicks;
    return p.impressions === 0 ? 0 : p.clicks / p.impressions;
  });
}
