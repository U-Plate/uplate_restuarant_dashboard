import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  DollarSign,
  Eye,
  Megaphone,
  MousePointerClick,
  Percent,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Sparkline } from '../components/charts/Sparkline';
import { TrendChart } from '../components/charts/TrendChart';
import { BarComparison } from '../components/charts/BarComparison';
import { useApp } from '../store/AppContext';
import {
  aggregateSeries,
  globalAnalytics,
  topPerformingAds,
  adCtr,
  campaignsInOrder,
} from '../store/selectors';
import { formatNumber, formatPercent, formatRelativeTime } from '../lib/format';
import { Badge } from '../components/ui/Badge';

export default function DashboardOverview() {
  const { state } = useApp();
  const stats = globalAnalytics(state);
  const series = useMemo(() => aggregateSeries(state), [state]);
  const impressionsSpark = series.map((s) => s.impressions);
  const clicksSpark = series.map((s) => s.clicks);
  const top = topPerformingAds(state, 5);
  const recentCampaigns = campaignsInOrder(state).slice(0, 4);

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
          label="Total Impressions"
          value={formatNumber(stats.impressions)}
          delta={{ value: '+12.4% vs last 30d', positive: true }}
          icon={<Eye size={18} />}
          sparkline={<Sparkline data={impressionsSpark} />}
        />
        <StatCard
          label="Total Clicks"
          value={formatNumber(stats.clicks)}
          delta={{ value: '+8.7% vs last 30d', positive: true }}
          icon={<MousePointerClick size={18} />}
          sparkline={<Sparkline data={clicksSpark} />}
        />
        <StatCard
          label="CTR"
          value={formatPercent(stats.ctr)}
          delta={{ value: 'Avg across all ads', positive: true }}
          icon={<Percent size={18} />}
        />
        <StatCard
          label="Active Campaigns"
          value={`${stats.activeCampaigns}`}
          delta={{ value: `${stats.totalCampaigns} total` }}
          icon={<Megaphone size={18} />}
        />
        <StatCard
          label="Active Ads"
          value={`${stats.activeAds}`}
          delta={{ value: `${stats.totalAds} total` }}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Spend (30d)"
          value="$0"
          delta={{ value: 'Placeholder — billing not wired' }}
          icon={<DollarSign size={18} />}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--s-4)',
        }}
      >
        <Card padding="var(--s-5)">
          <ChartHeader title="Impressions" subtitle="Last 30 days" />
          <TrendChart
            data={series.map((s) => ({ date: s.date, value: s.impressions }))}
            label="Impressions"
            color="#94B0DA"
          />
        </Card>
        <Card padding="var(--s-5)">
          <ChartHeader title="Clicks" subtitle="Last 30 days" />
          <TrendChart
            data={series.map((s) => ({ date: s.date, value: s.clicks }))}
            label="Clicks"
            color="#505A5B"
          />
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 'var(--s-4)',
        }}
      >
        <Card padding="var(--s-5)">
          <ChartHeader
            title="Top performing ads"
            subtitle="Ranked by click-through rate"
            icon={<Sparkles size={14} />}
          />
          {top.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>No active ads yet.</p>
          ) : (
            <BarComparison
              data={top.map((ad) => ({ name: ad.title, value: adCtr(ad) }))}
              valueLabel="CTR"
              formatValue={(n) => formatPercent(n)}
            />
          )}
        </Card>

        <Card padding="var(--s-5)">
          <ChartHeader title="Recent campaigns" subtitle="Latest activity" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {recentCampaigns.map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--s-3)',
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--surface-2)',
                  textDecoration: 'none',
                  color: 'var(--text)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                    {c.adIds.length} ad{c.adIds.length === 1 ? '' : 's'} · updated {formatRelativeTime(c.updatedAt)}
                  </span>
                </div>
                <Badge tone={c.status === 'active' ? 'active' : 'paused'} withDot>
                  {c.status === 'active' ? 'Active' : 'Paused'}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChartHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--s-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--accent)' }}>{icon}</span>}
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
      </div>
      {subtitle && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{subtitle}</span>}
    </div>
  );
}
