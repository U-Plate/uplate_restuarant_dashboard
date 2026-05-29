import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';

export interface SupportingNumber {
  label: string;
  value: string;
  /**
   * Delta: signed share (e.g. 0.14 for +14%). Null when the comparison window
   * isn't full and a delta would be dishonest. Ignored when `description` is
   * supplied.
   */
  delta: number | null;
  deltaSuffix?: string;
  /**
   * Static descriptive caption shown in place of a delta. Use for numbers
   * that don't have a meaningful week-over-week comparison
   * (e.g. "3 active, 1 paused").
   */
  description?: string;
  /** A short 30-day series of values for the inline sparkline. Omit for numbers without history. */
  spark?: number[];
  /** Where this number drills into when clicked. */
  to: string;
  /** Optional override for the data color used by the sparkline + delta tint. */
  tone?: 'clicks' | 'ctr' | 'neutral';
}

interface SupportingNumbersProps {
  numbers: SupportingNumber[];
}

export function SupportingNumbers({ numbers }: SupportingNumbersProps) {
  return (
    <section
      aria-label="Last seven days"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--s-2)',
        borderTop: '1px solid var(--hairline)',
        borderBottom: '1px solid var(--hairline)',
        padding: 'var(--s-5) 0',
      }}
    >
      {numbers.map((n, i) => (
        <NumberCell
          key={n.label}
          number={n}
          divider={i < numbers.length - 1}
        />
      ))}
    </section>
  );
}

function NumberCell({ number, divider }: { number: SupportingNumber; divider: boolean }) {
  const sparkColor = toneToColor(number.tone);
  return (
    <Link
      to={number.to}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gridTemplateRows: 'auto auto auto',
        gap: '4px 16px',
        alignItems: 'baseline',
        padding: 'var(--s-3) var(--s-5) var(--s-3) 0',
        textDecoration: 'none',
        color: 'inherit',
        borderRight: divider ? '1px solid var(--hairline)' : 'none',
        minWidth: 0,
      }}
    >
      <span
        style={{
          gridColumn: '1 / 2',
          gridRow: '1 / 2',
          fontSize: 'var(--type-eyebrow)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          fontWeight: 600,
        }}
      >
        {number.label}
      </span>
      <span
        className="num"
        style={{
          gridColumn: '1 / 2',
          gridRow: '2 / 3',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-number-lg)',
          lineHeight: 'var(--type-number-lg-lh)',
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {number.value}
      </span>
      <span
        style={{
          gridColumn: '1 / 2',
          gridRow: '3 / 4',
          marginTop: 6,
        }}
      >
        {number.description ? (
          <span
            style={{
              fontSize: 'var(--type-meta)',
              color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            {number.description}
          </span>
        ) : (
          <DeltaPill delta={number.delta} suffix={number.deltaSuffix} />
        )}
      </span>
      {number.spark && number.spark.length >= 2 && (
        <div
          style={{
            gridColumn: '2 / 3',
            gridRow: '2 / 4',
            alignSelf: 'end',
            width: 88,
            color: sparkColor,
            opacity: 0.85,
          }}
        >
          <Sparkline data={number.spark} height={32} strokeWidth={1.5} />
        </div>
      )}
    </Link>
  );
}

function toneToColor(tone: SupportingNumber['tone']): string {
  switch (tone) {
    case 'clicks':
      return 'var(--data-clicks)';
    case 'ctr':
      return 'var(--data-ctr)';
    default:
      return 'var(--ink-3)';
  }
}

function DeltaPill({ delta, suffix }: { delta: number | null; suffix?: string }): ReactNode {
  if (delta === null) {
    return (
      <span
        className="num"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        <Minus size={12} strokeWidth={2} />
        Not enough data yet
      </span>
    );
  }

  if (Math.abs(delta) < 0.005) {
    return (
      <span
        className="num"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--type-meta)',
          color: 'var(--trend-flat)',
          fontWeight: 500,
        }}
      >
        <Minus size={12} strokeWidth={2.5} />
        Flat {suffix ?? 'vs last week'}
      </span>
    );
  }

  const positive = delta > 0;
  const color = positive ? 'var(--trend-positive)' : 'var(--trend-negative)';
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  const pct = Math.round(Math.abs(delta) * 100);

  return (
    <span
      className="num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--type-meta)',
        color,
        fontWeight: 600,
      }}
    >
      <Arrow size={13} strokeWidth={2.25} />
      {pct}% {suffix ?? 'vs last week'}
    </span>
  );
}
