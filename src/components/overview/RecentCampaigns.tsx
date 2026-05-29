import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Campaign } from '../../types';
import { formatRelativeTime } from '../../lib/format';

interface RecentCampaignsProps {
  campaigns: Campaign[];
}

export function RecentCampaigns({ campaigns }: RecentCampaignsProps) {
  return (
    <section
      aria-label="Recent campaigns"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-h3)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.011em',
          }}
        >
          Recent campaigns
        </h2>
        <Link
          to="/campaigns"
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-2)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          See all
        </Link>
      </header>
      {campaigns.length === 0 ? (
        <EmptyRecent />
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)',
            background: 'var(--surface-raised)',
            overflow: 'hidden',
          }}
        >
          {campaigns.map((c, i) => (
            <li key={c.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
              <Row campaign={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ campaign }: { campaign: Campaign }) {
  const isActive = campaign.status === 'active';
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 'var(--s-3)',
        padding: 'var(--s-3) var(--s-4)',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 56,
        transition: 'background var(--motion-fast) var(--ease-out-quart)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-sunken)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isActive ? 'var(--status-active)' : 'var(--status-paused)',
          boxShadow: isActive ? '0 0 0 3px var(--status-active-tint)' : '0 0 0 3px var(--status-paused-tint)',
          flexShrink: 0,
          marginLeft: 4,
        }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-body)',
            fontWeight: 500,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {campaign.name}
        </span>
        <span
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-3)',
          }}
        >
          <span aria-label={isActive ? 'Active' : 'Paused'}>{isActive ? 'Active' : 'Paused'}</span>
          <span aria-hidden> · </span>
          {campaign.adIds.length} ad{campaign.adIds.length === 1 ? '' : 's'}
          <span aria-hidden> · </span>
          updated {formatRelativeTime(campaign.updatedAt)}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={1.75} color="var(--ink-3)" />
    </Link>
  );
}

function EmptyRecent() {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-6)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      No campaigns yet. Create one to start showing ads on UPlate.
    </div>
  );
}
