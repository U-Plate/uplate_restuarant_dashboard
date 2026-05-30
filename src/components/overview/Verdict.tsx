import { Link } from 'react-router-dom';
import type { Verdict as VerdictData } from '../../lib/verdict';

interface VerdictProps {
  verdict: VerdictData;
  /** Optional CTA shown for empty/no-active states so the action sits in the verdict zone. */
  cta?: { label: string; to: string };
}

export function Verdict({ verdict, cta }: VerdictProps) {
  return (
    <section
      aria-label="Performance summary"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        maxWidth: '38ch',
        padding: 'var(--s-6) 0 var(--s-4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-eyebrow)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          fontWeight: 600,
        }}
      >
        Last 7 days
      </span>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--type-display)',
          lineHeight: 'var(--type-display-lh)',
          letterSpacing: '-0.022em',
          fontWeight: 500,
          color: 'var(--ink)',
          fontVariationSettings: '"opsz" 96',
          textWrap: 'balance' as const,
        }}
      >
        {verdict.headline}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 'var(--type-headline)',
          lineHeight: 1.4,
          fontWeight: 400,
          color: 'var(--ink-2)',
          letterSpacing: '-0.005em',
          fontVariationSettings: '"opsz" 48',
        }}
      >
        <SupportText verdict={verdict} />
      </p>
      {cta && (
        <div style={{ marginTop: 'var(--s-3)' }}>
          <Link
            to={cta.to}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              textDecoration: 'none',
              fontSize: 'var(--type-body)',
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {cta.label}
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </section>
  );
}

function SupportText({ verdict }: { verdict: VerdictData }) {
  if (!verdict.link || !verdict.support.includes(verdict.link.label)) {
    return <>{verdict.support}</>;
  }
  const [before, after] = splitOnce(verdict.support, verdict.link.label);
  return (
    <>
      {before}
      <Link
        to={verdict.link.to}
        style={{
          color: 'var(--ink)',
          textDecoration: 'underline',
          textDecorationColor: 'var(--accent-tint-2)',
          textDecorationThickness: 2,
          textUnderlineOffset: 4,
          fontStyle: 'italic',
        }}
      >
        {verdict.link.label}
      </Link>
      {after}
    </>
  );
}

function splitOnce(text: string, token: string): [string, string] {
  const i = text.indexOf(token);
  if (i === -1) return [text, ''];
  return [text.slice(0, i), text.slice(i + token.length)];
}
