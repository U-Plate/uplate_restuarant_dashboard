import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AdLocation, Targeting } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StickyBar } from '../components/ui/StickyBar';
import { AdForm } from '../components/ad/AdForm';
import { AdPreview } from '../components/ad/AdPreview';
import { TargetingBuilder } from '../components/targeting/TargetingBuilder';
import { useApp } from '../store/AppContext';
import { emptyTargeting } from '../lib/clone';

interface Draft {
  title: string;
  description: string;
  redirectUrl: string;
  iconUrl?: string;
  location: AdLocation;
  targeting: Targeting;
}

const INITIAL_DRAFT: Draft = {
  title: '',
  description: '',
  redirectUrl: '',
  iconUrl: undefined,
  location: 'homeScreen',
  targeting: emptyTargeting(),
};

export default function AdCreate() {
  const { id } = useParams();
  const { state, commands } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const campaign = id ? state.campaigns[id] : undefined;
  const backState = (location.state as { from?: string } | null)?.from;
  const backTo = backState ?? (campaign ? `/campaigns/${campaign.id}` : '/campaigns');

  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [pendingExit, setPendingExit] = useState<null | { to: string }>(null);

  const dirty = useMemo(() => {
    return (
      draft.title !== INITIAL_DRAFT.title ||
      draft.description !== INITIAL_DRAFT.description ||
      draft.redirectUrl !== INITIAL_DRAFT.redirectUrl ||
      (draft.iconUrl ?? '') !== '' ||
      draft.location !== INITIAL_DRAFT.location ||
      JSON.stringify(draft.targeting) !== JSON.stringify(INITIAL_DRAFT.targeting)
    );
  }, [draft]);

  if (!campaign) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
          padding: 'var(--s-7) 0',
          maxWidth: '40ch',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--type-display)',
            lineHeight: 'var(--type-display-lh)',
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.022em',
          }}
        >
          That campaign isn't here anymore.
        </h1>
        <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)' }}>
          It may have been deleted, or the link is wrong.
        </p>
        <div>
          <Button onClick={() => navigate('/campaigns')}>Back to campaigns</Button>
        </div>
      </div>
    );
  }

  const titleValid = draft.title.trim().length > 0;
  const canCreate = titleValid;

  const handleCreate = async () => {
    if (!canCreate || submitting) return;
    setSubmitting(true);
    try {
      const ad = await commands.createAd({
        campaignId: campaign.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        redirectUrl: draft.redirectUrl.trim(),
        iconUrl: draft.iconUrl?.trim() || undefined,
        location: draft.location,
        targeting: draft.targeting,
      });
      navigate(`/campaigns/${campaign.id}/ads/${ad.id}`, { replace: true });
    } catch {
      setSubmitting(false);
    }
  };

  const requestDiscard = (to: string) => {
    if (!dirty) {
      navigate(to);
      return;
    }
    setPendingExit({ to });
  };

  const truncatedCampaignName =
    campaign.name.length > 28 ? `${campaign.name.slice(0, 27)}…` : campaign.name;

  const stickySubtext = !titleValid
    ? 'Title required.'
    : 'Cmd+S to create, or hit the button.';

  return (
    <>
      <div className="uplate-ad-page">
        <header className="uplate-ad-create__head">
          <Link
            to={backTo}
            onClick={(e) => {
              if (!dirty) return;
              e.preventDefault();
              requestDiscard(backTo);
            }}
            className="uplate-ad-create__back"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            <span>{truncatedCampaignName}</span>
          </Link>
          <h1 className="uplate-ad-create__h1">
            New ad in <em>{campaign.name}</em>
          </h1>
        </header>

        <div className="uplate-ad-zone">
          <div className="uplate-ad-body">
            <AdForm
              value={{
                title: draft.title,
                description: draft.description,
                redirectUrl: draft.redirectUrl,
                iconUrl: draft.iconUrl,
                location: draft.location,
              }}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
            <div className="uplate-ad-preview-card">
              <span className="uplate-ad-zone__eyebrow">
                Live preview, how it will look on UPlate
              </span>
              <AdPreview
                ad={{
                  title: draft.title || 'New ad',
                  description: draft.description,
                  redirectUrl: draft.redirectUrl,
                  iconUrl: draft.iconUrl,
                  location: draft.location,
                }}
                showLabel={false}
              />
            </div>
          </div>
          <TargetingBuilder
            value={draft.targeting}
            onChange={(targeting) => setDraft((d) => ({ ...d, targeting }))}
          />
        </div>
      </div>

      <StickyBar
        visible
        saving={submitting}
        headline={titleValid ? 'Ready to create' : 'Title required'}
        subtext={stickySubtext}
        saveLabel="Create ad"
        discardLabel="Discard"
        onSave={handleCreate}
        onDiscard={() => requestDiscard(backTo)}
      />

      <ConfirmDialog
        open={!!pendingExit}
        title="Discard changes?"
        message="Your new ad hasn't been saved. Leave and lose it?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setPendingExit(null)}
        onConfirm={() => {
          const to = pendingExit?.to;
          setPendingExit(null);
          if (to) navigate(to);
        }}
      />
    </>
  );
}
