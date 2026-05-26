import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Clock, Leaf, Repeat, Sparkles, Target, Utensils } from 'lucide-react';
import type { Ad } from '../../types';
import { Card } from '../ui/Card';
import { formatNumber, formatPercent } from '../../lib/format';
import { api } from '../../api';
import type { ClickSignalsResponse } from '../../api';

interface ClickAudienceSignalsProps {
  ad: Ad;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface FetchState {
  adId: string;
  data: ClickSignalsResponse | null;
}

export function ClickAudienceSignals({ ad }: ClickAudienceSignalsProps) {
  const [fetched, setFetched] = useState<FetchState | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.analytics
      .clickSignals(ad.id)
      .then((res) => {
        if (!cancelled) setFetched({ adId: ad.id, data: res });
      })
      .catch(() => {
        if (!cancelled) setFetched({ adId: ad.id, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [ad.id]);

  const loading = !fetched || fetched.adId !== ad.id;
  const data = !loading ? fetched?.data ?? null : null;

  if (loading) {
    return (
      <Card padding="var(--s-5)">
        <HeaderRow totalClicks={0} loading />
      </Card>
    );
  }

  const totalClicks = data?.totalClicks ?? 0;
  if (!data || totalClicks === 0) {
    return (
      <Card padding="var(--s-5)">
        <HeaderRow totalClicks={0} />
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-soft)',
            marginTop: 'var(--s-3)',
          }}
        >
          No clicks yet — audience signals will appear once this ad has impressions.
        </p>
      </Card>
    );
  }

  const maxDayShare = Math.max(...data.clicksByDay, 0.01);
  const maxHourShare = Math.max(...data.clicksByHour, 0.01);

  return (
    <Card padding="var(--s-5)">
      <HeaderRow totalClicks={totalClicks} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--s-4)',
          marginTop: 'var(--s-4)',
        }}
      >
        <Section icon={<Target size={13} />} title="Top audience tags">
          <SignalList
            rows={data.topAudienceTags.map((r) => ({
              key: r.tag,
              label: r.label,
              pct: r.pct,
              targeted: r.targeted,
            }))}
          />
        </Section>

        <Section icon={<Leaf size={13} />} title="Dietary preferences">
          <SignalList
            rows={data.topDietary.map((r) => ({
              key: r.pref,
              label: r.label,
              pct: r.pct,
              targeted: r.targeted,
            }))}
          />
        </Section>

        <Section icon={<Utensils size={13} />} title="Food interests">
          <SignalList
            rows={data.topFoodInterests.map((r) => ({
              key: r.name,
              label: r.name,
              pct: r.pct,
              targeted: r.targeted,
            }))}
          />
        </Section>

        <Section icon={<Repeat size={13} />} title="Customer type">
          <CustomerSplit recurringPct={data.recurringPct} />
        </Section>

        <Section icon={<Clock size={13} />} title="Clicks by day of week">
          <DayBars share={data.clicksByDay} max={maxDayShare} />
        </Section>

        <Section
          icon={<Sparkles size={13} />}
          title="Clicks by hour of day"
          subtitle={`Peak around ${formatHour(data.peakHour)}`}
        >
          <HourBars share={data.clicksByHour} max={maxHourShare} />
        </Section>
      </div>
    </Card>
  );
}

function HeaderRow({ totalClicks, loading }: { totalClicks: number; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700 }}>Click audience signals</h3>
      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
        {loading
          ? 'Loading click breakdown…'
          : totalClicks === 0
            ? 'Who is clicking this ad will appear here.'
            : `Profile of the ${formatNumber(totalClicks)} ${
                totalClicks === 1 ? 'person' : 'people'
              } who clicked.`}
      </span>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--r-sm)',
            background: 'var(--accent-12)',
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              color: 'var(--text-soft)',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div style={{ paddingLeft: 32 }}>{children}</div>
    </div>
  );
}

interface SignalRow {
  key: string;
  label: string;
  pct: number;
  targeted: boolean;
}

function SignalList({ rows }: { rows: SignalRow[] }) {
  if (rows.length === 0) {
    return (
      <span style={{ fontSize: 12, color: 'var(--text-soft)', fontStyle: 'italic' }}>
        No data
      </span>
    );
  }
  const max = Math.max(...rows.map((r) => r.pct), 0.01);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
      {rows.map((row) => (
        <div key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              gap: 8,
            }}
          >
            <span
              style={{
                color: 'var(--text)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.label}
              {row.targeted && (
                <span
                  title="Part of this ad's targeting"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 'var(--r-pill)',
                    background: 'var(--accent-20)',
                    color: 'var(--accent)',
                  }}
                >
                  Targeted
                </span>
              )}
            </span>
            <span
              style={{ color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatPercent(row.pct, 0)}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: 'var(--secondary-20)',
              borderRadius: 'var(--r-pill)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(row.pct / max) * 100}%`,
                height: '100%',
                background: row.targeted ? 'var(--accent)' : 'var(--accent-60)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerSplit({ recurringPct }: { recurringPct: number }) {
  const newPct = 1 - recurringPct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div
        style={{
          display: 'flex',
          height: 10,
          width: '100%',
          borderRadius: 'var(--r-pill)',
          overflow: 'hidden',
          background: 'var(--secondary-20)',
        }}
      >
        <div
          style={{
            width: `${recurringPct * 100}%`,
            background: 'var(--accent)',
          }}
        />
        <div
          style={{
            width: `${newPct * 100}%`,
            background: 'var(--accent-35)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <LegendDot
          color="var(--accent)"
          label="Recurring"
          value={formatPercent(recurringPct, 0)}
        />
        <LegendDot
          color="var(--accent-35)"
          label="New"
          value={formatPercent(newPct, 0)}
        />
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--text)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </span>
  );
}

function DayBars({ share, max }: { share: number[]; max: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
        alignItems: 'end',
      }}
    >
      {share.map((s, i) => {
        const heightPct = Math.max(6, (s / max) * 100);
        return (
          <div
            key={DAY_LABELS[i]}
            title={`${DAY_LABELS[i]} · ${formatPercent(s, 0)} of clicks`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 56,
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: 'var(--accent)',
                  borderRadius: 'var(--r-sm)',
                  opacity: 0.85,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-soft)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HourBars({ share, max }: { share: number[]; max: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, 1fr)',
          gap: 2,
          alignItems: 'end',
          height: 56,
        }}
      >
        {share.map((s, h) => {
          const heightPct = Math.max(6, (s / max) * 100);
          return (
            <div
              key={h}
              title={`${formatHour(h)} · ${formatPercent(s, 0)} of clicks`}
              style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: 'var(--accent)',
                  borderRadius: 2,
                  opacity: 0.6 + (s / max) * 0.4,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, 1fr)',
          gap: 2,
          fontSize: 9,
          color: 'var(--text-soft)',
          fontWeight: 600,
        }}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <span
            key={h}
            style={{
              textAlign: 'center',
              visibility: h % 4 === 0 ? 'visible' : 'hidden',
            }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}
