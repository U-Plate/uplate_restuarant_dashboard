import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Tabs } from '../components/ui/Tabs';
import { DualTrendChart } from '../components/charts/DualTrendChart';
import { BarComparison } from '../components/charts/BarComparison';
import { useApp } from '../store/AppContext';
import {
  adCtr,
  adsForCampaign,
  aggregateSeries,
  campaignAnalytics,
  campaignsInOrder,
  globalAnalytics,
  topPerformingAds,
} from '../store/selectors';
import { formatNumber, formatPercent } from '../lib/format';
import { Eye, MousePointerClick, Percent, Activity } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';

type RangeKey = '7d' | '30d' | '90d' | 'all';

export default function Analytics() {
  const { state } = useApp();
  const [range, setRange] = useState<RangeKey>('30d');
  const stats = globalAnalytics(state);
  const series = useMemo(() => aggregateSeries(state), [state]);

  const sliced = useMemo(() => {
    if (range === 'all') return series;
    const n = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return series.slice(-n);
  }, [series, range]);

  const top = topPerformingAds(state, 6);

  const campaignRows = useMemo(
    () =>
      campaignsInOrder(state).map((c) => {
        const a = campaignAnalytics(state, c.id);
        const ads = adsForCampaign(state, c.id);
        return { campaign: c, ...a, ads: ads.length };
      }),
    [state]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--s-4)',
        }}
      >
        <StatCard
          label="Impressions"
          value={formatNumber(stats.impressions)}
          delta={{ value: 'All time' }}
          icon={<Eye size={18} />}
        />
        <StatCard
          label="Clicks"
          value={formatNumber(stats.clicks)}
          delta={{ value: 'All time' }}
          icon={<MousePointerClick size={18} />}
        />
        <StatCard
          label="CTR"
          value={formatPercent(stats.ctr)}
          delta={{ value: 'Across all ads' }}
          icon={<Percent size={18} />}
        />
        <StatCard
          label="Active Ads"
          value={`${stats.activeAds}`}
          delta={{ value: `${stats.totalAds} total` }}
          icon={<Activity size={18} />}
        />
      </div>

      <Card padding="var(--s-5)">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--s-3)',
            gap: 'var(--s-3)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Impressions vs clicks</h3>
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              Overlay of total reach and engagement
            </span>
          </div>
          <Tabs
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            tabs={[
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
              { value: '90d', label: '90d' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        <DualTrendChart data={sliced} />
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 'var(--s-4)',
        }}
      >
        <Card padding="var(--s-5)">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
            Top performing ads
          </h3>
          {top.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>No data yet.</p>
          ) : (
            <BarComparison
              data={top.map((ad) => ({ name: ad.title, value: adCtr(ad) }))}
              valueLabel="CTR"
              formatValue={(n) => formatPercent(n)}
              height={300}
            />
          )}
        </Card>

        <Card padding="var(--s-5)">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
            Campaign comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <Row header />
            {campaignRows.map((row) => (
              <Link
                key={row.campaign.id}
                to={`/campaigns/${row.campaign.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.6fr 0.6fr',
                  alignItems: 'center',
                  gap: 'var(--s-2)',
                  padding: '10px 8px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.campaign.name}
                  </span>
                  <Badge
                    tone={row.campaign.status === 'active' ? 'active' : 'paused'}
                    withDot
                  >
                    {row.campaign.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(row.impressions)}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(row.clicks)}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatPercent(row.ctr)}
                </span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-soft)',
                  }}
                >
                  {row.ads}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ header }: { header?: boolean }) {
  if (!header) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.6fr 0.6fr',
        gap: 'var(--s-2)',
        padding: '0 8px',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-soft)',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}
    >
      <span>Campaign</span>
      <span>Imp</span>
      <span>Clicks</span>
      <span>CTR</span>
      <span>Ads</span>
    </div>
  );
}
