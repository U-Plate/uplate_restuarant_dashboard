import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Pause, Pencil, Play, Send, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ActionMenu } from '../ui/ActionMenu';
import { AdPreview } from './AdPreview';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';
import { adCtr } from '../../store/selectors';
import { formatNumber, formatPercent } from '../../lib/format';
import { cloneAd } from '../../lib/clone';

interface AdCardProps {
  ad: Ad;
  onDeleteRequest: (ad: Ad) => void;
  onDuplicateAcross: (ad: Ad) => void;
  showCampaign?: boolean;
}

export function AdCard({ ad, onDeleteRequest, onDuplicateAcross, showCampaign }: AdCardProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const ctr = adCtr(ad);
  const campaign = state.campaigns[ad.campaignId];
  const isActive = ad.status === 'active';
  const inAdsLibrary = location.pathname === '/ads';

  const openAd = () =>
    navigate(`/campaigns/${ad.campaignId}/ads/${ad.id}`, {
      state: { from: location.pathname + location.search },
    });

  const handleDuplicateHere = () => {
    const clone = cloneAd(ad, ad.campaignId);
    dispatch({
      type: 'AD_DUPLICATE',
      payload: { sourceId: ad.id, newAd: clone, targetCampaignId: ad.campaignId },
    });
    navigate(`/campaigns/${ad.campaignId}/ads/${clone.id}`, {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <Card padding="var(--s-4)">
      <div
        onClick={openAd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAd();
          }
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', cursor: 'pointer' }}
      >
        <AdPreview ad={ad} compact />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--s-2)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ad.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone={isActive ? 'active' : 'paused'} withDot>
                {isActive ? 'Active' : 'Paused'}
              </Badge>
              {showCampaign && campaign && (
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{campaign.name}</span>
              )}
            </div>
          </div>
          <ActionMenu
            items={[
              {
                label: 'Open',
                icon: <Pencil size={14} />,
                onClick: openAd,
              },
              ...(inAdsLibrary
                ? []
                : [
                    {
                      label: 'Duplicate here',
                      icon: <Copy size={14} />,
                      onClick: handleDuplicateHere,
                    },
                  ]),
              {
                label: 'Duplicate to…',
                icon: <Send size={14} />,
                onClick: () => onDuplicateAcross(ad),
              },
              {
                label: isActive ? 'Pause' : 'Activate',
                icon: isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () => dispatch({ type: 'AD_TOGGLE_STATUS', payload: { id: ad.id } }),
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

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-soft)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ad.description || 'No description yet.'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--s-2)',
            padding: 'var(--s-3)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <MiniMetric label="Imp" value={formatNumber(ad.metrics.impressions)} />
          <MiniMetric label="Clicks" value={formatNumber(ad.metrics.clicks)} />
          <MiniMetric label="CTR" value={formatPercent(ctr)} />
        </div>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 9,
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
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}
