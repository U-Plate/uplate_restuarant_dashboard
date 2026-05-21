import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { useApp } from '../store/AppContext';
import { AUDIENCE_LABEL, DIETARY_LABEL } from '../data/constants';
import type { AudienceTag, DietaryPreference, Priority } from '../types';

export default function AudienceInsights() {
  const { state } = useApp();

  const tagUsage = useMemo(() => {
    const counts = new Map<AudienceTag, number>();
    for (const ad of Object.values(state.ads)) {
      for (const t of ad.targeting.audienceTags) {
        counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
      }
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count, pct: count / total }))
      .sort((a, b) => b.count - a.count);
  }, [state]);

  const dietUsage = useMemo(() => {
    const priorityScore: Record<Priority, number> = {
      required: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    const counts = new Map<DietaryPreference, { count: number; avgScore: number }>();
    for (const ad of Object.values(state.ads)) {
      for (const d of ad.targeting.dietary) {
        const cur = counts.get(d.pref) ?? { count: 0, avgScore: 0 };
        const score = priorityScore[d.priority];
        const next = {
          count: cur.count + 1,
          avgScore: (cur.avgScore * cur.count + score) / (cur.count + 1),
        };
        counts.set(d.pref, next);
      }
    }
    return Array.from(counts.entries())
      .map(([pref, v]) => ({ pref, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [state]);

  const heat = useMemo(() => {
    const rows = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    const grid = rows.map(() => Array.from({ length: 24 }, () => 0));
    const dayAdCounts = rows.map(() => 0);
    for (const ad of Object.values(state.ads)) {
      const range = ad.targeting.time.range;
      const days = ad.targeting.time.days.length > 0 ? ad.targeting.time.days : rows;
      const start = range?.startHour ?? 0;
      const end = range?.endHour ?? 24;
      for (const d of days) {
        const rIdx = rows.indexOf(d);
        if (rIdx < 0) continue;
        dayAdCounts[rIdx] += 1;
        const hours = end >= start ? [start, end] : [start, 24];
        const second = end >= start ? null : [0, end];
        const incRange = (a: number, b: number) => {
          for (let h = a; h < b; h++) grid[rIdx][h] += 1;
        };
        incRange(hours[0], hours[1]);
        if (second) incRange(second[0], second[1]);
      }
    }
    const max = Math.max(1, ...grid.flat());
    return { rows, grid, max, dayAdCounts };
  }, [state]);

  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--s-4)',
        }}
      >
        <Card padding="var(--s-5)">
          <SectionTitle title="Audience tag mix" subtitle="Share of ads targeting each behavioral signal" />
          {tagUsage.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              Add audience tags to your ads to see the distribution.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {tagUsage.map((row) => (
                <div key={row.tag} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                      {AUDIENCE_LABEL[row.tag]}
                    </span>
                    <span style={{ color: 'var(--text-soft)' }}>
                      {row.count} ad{row.count === 1 ? '' : 's'} · {Math.round(row.pct * 100)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--secondary-20)',
                      borderRadius: 'var(--r-pill)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${row.pct * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="var(--s-5)">
          <SectionTitle
            title="Dietary preference weights"
            subtitle="Average weight applied across active ads"
          />
          {dietUsage.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              No dietary targeting configured yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {dietUsage.map((row) => (
                <div key={row.pref} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                      {DIETARY_LABEL[row.pref]}
                    </span>
                    <span style={{ color: 'var(--text-soft)' }}>
                      {row.count} ad{row.count === 1 ? '' : 's'} · avg priority {Math.round(row.avgScore)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--secondary-20)',
                      borderRadius: 'var(--r-pill)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${row.avgScore}%`,
                        height: '100%',
                        background: 'var(--accent-60)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="var(--s-5)">
        <SectionTitle title="Time coverage heatmap" subtitle="When your ads are eligible to serve" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px repeat(24, minmax(18px, 1fr))',
              gap: 2,
              fontSize: 10,
              color: 'var(--text-soft)',
              marginBottom: 4,
            }}
          >
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span
                key={h}
                style={{
                  textAlign: 'center',
                  visibility: h % 3 === 0 ? 'visible' : 'hidden',
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {heat.rows.map((day, rIdx) => {
            const dayCount = heat.dayAdCounts[rIdx];
            const isHovered = hoveredDay === rIdx;
            return (
              <div
                key={day}
                onMouseEnter={() => setHoveredDay(rIdx)}
                onMouseLeave={() =>
                  setHoveredDay((cur) => (cur === rIdx ? null : cur))
                }
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px repeat(24, minmax(18px, 1fr))',
                  gap: 2,
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: isHovered ? 'var(--text)' : 'var(--text-soft)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    alignSelf: 'center',
                  }}
                >
                  {day}
                </span>
                {heat.grid[rIdx].map((v, hIdx) => {
                  const intensity = v / heat.max;
                  return (
                    <div
                      key={hIdx}
                      title={`${day} ${hIdx}:00 · ${v} ad${v === 1 ? '' : 's'} this hour · ${dayCount} ad${dayCount === 1 ? '' : 's'} this day`}
                      style={{
                        height: 18,
                        borderRadius: 4,
                        background:
                          intensity === 0
                            ? 'var(--surface-2)'
                            : `rgba(148, 176, 218, ${0.18 + intensity * 0.82})`,
                      }}
                    />
                  );
                })}
                {isHovered && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translate(calc(100% + 8px), -50%)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text)',
                      background: 'var(--surface)',
                      boxShadow: 'var(--shadow-md)',
                      borderRadius: 'var(--r-sm)',
                      padding: '4px 8px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  >
                    {dayCount} ad{dayCount === 1 ? '' : 's'} on {day}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--s-3)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {subtitle && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{subtitle}</span>}
    </div>
  );
}
