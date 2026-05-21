import { Link, useNavigate } from 'react-router-dom';
import { Copy, Eye, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Toggle';
import { ActionMenu } from '../ui/ActionMenu';
import type { Campaign } from '../../types';
import { useApp } from '../../store/AppContext';
import { adsForCampaign, campaignAnalytics } from '../../store/selectors';
import { formatDateRange, formatNumber, formatPercent } from '../../lib/format';
import { cloneCampaign } from '../../lib/clone';

interface CampaignCardProps {
  campaign: Campaign;
  onDeleteRequest: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onDeleteRequest }: CampaignCardProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const stats = campaignAnalytics(state, campaign.id);
  const ads = adsForCampaign(state, campaign.id);
  const series = ads.flatMap((a) => a.metrics.series);
  const byDate = new Map<string, number>();
  for (const p of series) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.impressions);

  const isActive = campaign.status === 'active';

  const handleDuplicate = () => {
    const cloned = cloneCampaign(campaign, ads);
    dispatch({
      type: 'CAMPAIGN_DUPLICATE',
      payload: { id: campaign.id, newCampaign: cloned.campaign, newAds: cloned.ads },
    });
    navigate(`/campaigns/${cloned.campaign.id}`);
  };

  return (
    <Card padding="var(--s-5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--s-3)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
            <Link
              to={`/campaigns/${campaign.id}`}
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text)',
                textDecoration: 'none',
                letterSpacing: -0.2,
              }}
            >
              {campaign.name}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={isActive ? 'active' : 'paused'} withDot>
                {isActive ? 'Active' : 'Paused'}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                {stats.adCount} ad{stats.adCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle
              checked={isActive}
              onChange={() => dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id: campaign.id } })}
              size="sm"
            />
            <ActionMenu
              items={[
                {
                  label: 'View campaign',
                  icon: <Eye size={14} />,
                  onClick: () => navigate(`/campaigns/${campaign.id}`),
                },
                {
                  label: 'Edit',
                  icon: <Pencil size={14} />,
                  onClick: () => navigate(`/campaigns/${campaign.id}?edit=1`),
                },
                {
                  label: 'Duplicate',
                  icon: <Copy size={14} />,
                  onClick: handleDuplicate,
                },
                {
                  label: isActive ? 'Pause' : 'Activate',
                  icon: isActive ? <Pause size={14} /> : <Play size={14} />,
                  onClick: () =>
                    dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id: campaign.id } }),
                },
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--s-3)',
            padding: 'var(--s-3) var(--s-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <Metric label="Impressions" value={formatNumber(stats.impressions)} />
          <Metric label="Clicks" value={formatNumber(stats.clicks)} />
          <Metric label="CTR" value={formatPercent(stats.ctr)} />
        </div>

        
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-soft)',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}
