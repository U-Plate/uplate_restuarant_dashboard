import { useState } from 'react';
import { Check } from 'lucide-react';
import { formatPercent } from '../../lib/format';
import type { AudienceEngagement, AudienceEngagementRow } from '../../api';

interface EngagementPanelProps {
  /** Cross-ad engagement aggregate from `/analytics/audience-insights`; null while the parent's single fetch is in flight. */
  engagement: AudienceEngagement | null;
  /** True when that fetch failed. */
  error?: boolean;
}

type Section = 'tags' | 'dietary' | 'food';

const SECTION_LABEL: Record<Section, string> = {
  tags: 'Audience tags',
  dietary: 'Dietary',
  food: 'Food interests',
};

export function EngagementPanel({ engagement, error = false }: EngagementPanelProps) {
  const [section, setSection] = useState<Section>('tags');
  const data = engagement;

  const rows: AudienceEngagementRow[] =
    section === 'tags'
      ? data?.topAudienceTags ?? []
      : section === 'dietary'
        ? data?.topDietary ?? []
        : data?.topFoodInterests ?? [];

  return (
    <section
      aria-label="Who actually clicks"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-h3)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.011em',
            }}
          >
            Who clicks
          </h2>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            {data
              ? `${data.totalClicks.toLocaleString()} click${data.totalClicks === 1 ? '' : 's'} across ${data.contributingAdCount} ad${data.contributingAdCount === 1 ? '' : 's'}.`
              : 'Loading audience signals...'}
          </span>
        </div>
        <SectionTabs value={section} onChange={setSection} />
      </header>

      {error ? (
        <ErrorBlock />
      ) : !data ? (
        <SkeletonRows />
      ) : data.totalClicks === 0 ? (
        <EmptyBlock />
      ) : rows.length === 0 ? (
        <NoRowsBlock label={SECTION_LABEL[section]} />
      ) : (
        <dl
          style={{
            margin: 0,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)',
            background: 'var(--surface-raised)',
            overflow: 'hidden',
          }}
        >
          {rows.map((row, i) => (
            <Row key={row.key} row={row} isFirst={i === 0} />
          ))}
        </dl>
      )}

      {data && data.totalClicks > 0 && (
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          {formatPercent(data.recurringPct, 0)} of clicks come from recurring customers.
        </p>
      )}
    </section>
  );
}

function SectionTabs({ value, onChange }: { value: Section; onChange: (next: Section) => void }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
        border: '1px solid var(--hairline)',
      }}
    >
      {(Object.keys(SECTION_LABEL) as Section[]).map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(k)}
            style={{
              padding: '5px 12px',
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontSize: 'var(--type-eyebrow)',
              fontWeight: active ? 600 : 500,
              letterSpacing: '0.04em',
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              boxShadow: active ? '0 1px 2px oklch(0.22 0.01 250 / 0.06)' : 'none',
              transition: 'background var(--motion-fast) var(--ease-out-quart)',
            }}
          >
            {SECTION_LABEL[k]}
          </button>
        );
      })}
    </div>
  );
}

function Row({ row, isFirst }: { row: AudienceEngagementRow; isFirst: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        alignItems: 'baseline',
        columnGap: 'var(--s-4)',
        padding: '12px var(--s-5)',
        borderTop: isFirst ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <dt
        style={{
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {row.label}
        {row.targeted && <TargetedBadge />}
      </dt>
      <dd
        className="num"
        style={{
          margin: 0,
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-2)',
          fontWeight: 600,
        }}
      >
        {formatPercent(row.pct, 0)}
      </dd>
    </div>
  );
}

function TargetedBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 6px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'var(--r-pill)',
        background: 'var(--accent-tint)',
        color: 'var(--status-active-on)',
      }}
    >
      <Check size={9} strokeWidth={3} />
      Targeted
    </span>
  );
}

function SkeletonRows() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        background: 'var(--surface-raised)',
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 44,
            borderRadius: 0,
            borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
            background: 'var(--surface-sunken)',
          }}
        />
      ))}
    </div>
  );
}

function EmptyBlock() {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      Engagement signals appear once your ads have clicks.
    </div>
  );
}

function NoRowsBlock({ label }: { label: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      No {label.toLowerCase()} appear in click signals yet.
    </div>
  );
}

function ErrorBlock() {
  return (
    <div
      style={{
        border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      Couldn't load engagement signals. Refresh to try again.
    </div>
  );
}
