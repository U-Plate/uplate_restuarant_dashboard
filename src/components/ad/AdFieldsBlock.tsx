import { ExternalLink } from 'lucide-react';
import type { Ad } from '../../types';
import { AD_LOCATION_LABEL } from '../../data/constants';

interface AdFieldsBlockProps {
  ad: Ad;
}

/**
 * Read-only display of an ad's core fields. Replaces the previous
 * <DataRow label="..."> all-caps eyebrow soup with a clean two-column
 * definition list: small soft-ink label on the left, ink-1 value beside.
 */
export function AdFieldsBlock({ ad }: AdFieldsBlockProps) {
  return (
    <section
      aria-label="Ad details"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-5)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-h3)',
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.011em',
        }}
      >
        Ad details
      </h2>
      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, max-content) minmax(0, 1fr)',
          rowGap: 'var(--s-4)',
          columnGap: 'var(--s-5)',
        }}
      >
        <Field label="Title">
          <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink)', fontWeight: 500 }}>
            {ad.title}
          </span>
        </Field>
        <Field label="Description">
          {ad.description ? (
            <p
              style={{
                fontSize: 'var(--type-body)',
                color: 'var(--ink)',
                lineHeight: 1.5,
                maxWidth: '60ch',
              }}
            >
              {ad.description}
            </p>
          ) : (
            <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink-3)' }}>Not set</span>
          )}
        </Field>
        <Field label="Tap target">
          {ad.redirectUrl ? (
            <a
              href={ad.redirectUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 'var(--type-body)',
                color: 'var(--accent)',
                wordBreak: 'break-all',
                textDecoration: 'none',
              }}
            >
              {ad.redirectUrl}
              <ExternalLink size={12} strokeWidth={2} />
            </a>
          ) : (
            <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink-3)' }}>Not set</span>
          )}
        </Field>
        <Field label="Where it shows">
          <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink)' }}>
            {AD_LOCATION_LABEL[ad.location]}
          </span>
        </Field>
        {ad.location === 'homeScreen' && (
          <Field label="Call to action">
            {ad.ctaText?.trim() ? (
              <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink)' }}>
                {ad.ctaText}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink-3)' }}>
                Order Now (default)
              </span>
            )}
          </Field>
        )}
      </dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
          paddingTop: 2,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </>
  );
}
