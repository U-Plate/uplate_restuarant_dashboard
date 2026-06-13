import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AdLocation, Targeting } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Verdict } from '../components/overview/Verdict';
import { OverviewChart } from '../components/overview/OverviewChart';
import { AdPageHeader } from '../components/ad/AdPageHeader';
import { AdFieldsBlock } from '../components/ad/AdFieldsBlock';
import { TargetingSummaryList } from '../components/ad/TargetingSummaryList';
import { StickyBar } from '../components/ui/StickyBar';
import { AdForm } from '../components/ad/AdForm';
import { AdPreview } from '../components/ad/AdPreview';
import { TargetingBuilder } from '../components/targeting/TargetingBuilder';
import { ClickAudienceSignals } from '../components/ad/ClickAudienceSignals';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import { useApp } from '../store/AppContext';
import { computeAdVerdict } from '../lib/verdict';

interface Draft {
  title: string;
  description: string;
  redirectUrl: string;
  iconUrl?: string;
  location: AdLocation;
  targeting: Targeting;
}

export default function AdDetail() {
  const { id, adId } = useParams();
  const { state, commands } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const editing = params.get('edit') === '1';

  const [pendingExit, setPendingExit] = useState<null | { kind: 'back' } | { kind: 'navigate'; to: string } | { kind: 'stay' }>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const targetingRef = useRef<HTMLDivElement>(null);

  const ad = adId ? state.ads[adId] : undefined;
  const campaign = id ? state.campaigns[id] : undefined;

  // Back-link target preserves the upstream surface.
  const backState = (location.state as { from?: string } | null)?.from;
  const cameFromLibrary = backState?.startsWith('/ads');
  const backTo = cameFromLibrary ? '/ads' : `/campaigns/${id}`;
  const backLabel = cameFromLibrary ? 'Ads' : campaign?.name ?? 'Campaign';

  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const expectedKey = editing && ad ? ad.id : null;
  if (expectedKey !== draftKey) {
    setDraftKey(expectedKey);
    setDraft(
      expectedKey && ad
        ? {
            title: ad.title,
            description: ad.description,
            redirectUrl: ad.redirectUrl,
            iconUrl: ad.iconUrl,
            location: ad.location,
            targeting: ad.targeting,
          }
        : null,
    );
  }

  const dirty = useMemo(() => {
    if (!editing || !draft || !ad) return false;
    return (
      draft.title !== ad.title ||
      draft.description !== ad.description ||
      draft.redirectUrl !== ad.redirectUrl ||
      (draft.iconUrl ?? '') !== (ad.iconUrl ?? '') ||
      draft.location !== ad.location ||
      JSON.stringify(draft.targeting) !== JSON.stringify(ad.targeting)
    );
  }, [editing, draft, ad]);

  const verdict = useMemo(
    () => (ad ? computeAdVerdict(state, ad.id) : null),
    [state, ad],
  );

  if (!ad || !campaign) {
    return <NotFound onBack={() => navigate('/campaigns')} />;
  }

  const exitEdit = () => {
    setDraft(null);
    setDraftKey(null);
    const next = new URLSearchParams(params);
    next.delete('edit');
    setParams(next, { replace: true });
  };

  const requestExitEdit = (
    target?: { kind: 'back' } | { kind: 'navigate'; to: string } | { kind: 'stay' },
  ) => {
    if (!editing) return;
    if (!dirty) {
      exitEdit();
      if (target?.kind === 'navigate') navigate(target.to);
      if (target?.kind === 'back') navigate(backTo);
      return;
    }
    setPendingExit(target ?? { kind: 'stay' });
  };

  const confirmExit = () => {
    const target = pendingExit;
    setPendingExit(null);
    exitEdit();
    if (target?.kind === 'navigate') navigate(target.to);
    if (target?.kind === 'back') navigate(backTo);
    // 'stay' falls through: exitEdit() already returned us to view mode.
  };

  const handleSave = () => {
    if (!draft || !dirty) return;
    void commands.updateAd(ad.id, {
      title: draft.title,
      description: draft.description,
      redirectUrl: draft.redirectUrl,
      iconUrl: draft.iconUrl ?? null,
      location: draft.location,
      status: ad.status,
      targeting: draft.targeting,
    });
    exitEdit();
  };

  const enterEdit = () => {
    setParams({ edit: '1' });
  };

  const enterEditAndScrollToTargeting = () => {
    setParams({ edit: '1' });
    // Defer the scroll until after edit mode has rendered.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        targetingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  return (
    <div className="uplate-ad-page">
      <AdPageHeader
        ad={ad}
        campaign={campaign}
        editing={editing}
        dirty={dirty}
        backTo={backTo}
        backLabel={backLabel}
        onStartEdit={enterEdit}
        onRequestExitEdit={() => requestExitEdit({ kind: 'back' })}
        onDiscardChanges={() => requestExitEdit({ kind: 'stay' })}
        onSave={handleSave}
        onToggleStatus={() => void commands.toggleAdStatus(ad.id)}
        onDuplicate={() => setDuplicateOpen(true)}
        onRequestDelete={() => setConfirmDelete(true)}
      />

      {editing ? (
        <div className="uplate-ad-zone">
          <div className="uplate-ad-body">
            <AdForm
              value={{
                title: draft?.title ?? ad.title,
                description: draft?.description ?? ad.description,
                redirectUrl: draft?.redirectUrl ?? ad.redirectUrl,
                iconUrl: draft?.iconUrl ?? ad.iconUrl,
                location: draft?.location ?? ad.location,
              }}
              onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
            />
            <div className="uplate-ad-preview-card">
              <span className="uplate-ad-zone__eyebrow">
                Live preview, how it looks on UPlate
              </span>
              <AdPreview
                ad={draft ? { ...ad, ...draft } : ad}
                showLabel={false}
              />
            </div>
          </div>
          <div ref={targetingRef}>
            <TargetingBuilder
              value={draft?.targeting ?? ad.targeting}
              onChange={(targeting) =>
                setDraft((d) => (d ? { ...d, targeting } : d))
              }
            />
          </div>
        </div>
      ) : (
        <>
          <section aria-label="Performance" className="uplate-ad-zone">
            {verdict && <Verdict verdict={verdict} />}
            <OverviewChart series={ad.metrics.series} />
            <ClickAudienceSignals ad={ad} />
          </section>

          <section aria-label="Ad spec" className="uplate-ad-zone">
            <div className="uplate-ad-body">
              <AdFieldsBlock ad={ad} />
              <div className="uplate-ad-preview-card">
                <span className="uplate-ad-zone__eyebrow">
                  How it looks on UPlate
                </span>
                <AdPreview ad={ad} showLabel={false} />
              </div>
            </div>
            <TargetingSummaryList
              targeting={ad.targeting}
              onEdit={enterEditAndScrollToTargeting}
            />
          </section>
        </>
      )}

      <StickyBar
        visible={editing && dirty}
        onSave={handleSave}
        onDiscard={() => requestExitEdit({ kind: 'stay' })}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this ad?"
        message={`Permanently remove "${ad.title}". This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void commands.deleteAd(ad.id);
          setConfirmDelete(false);
          navigate(`/campaigns/${campaign.id}`);
        }}
      />

      <DuplicateAdDialog
        open={duplicateOpen}
        ad={ad}
        onClose={() => setDuplicateOpen(false)}
      />

      <ConfirmDialog
        open={!!pendingExit}
        title="Discard unsaved changes?"
        message="Your edits to this ad haven't been saved. Leave and discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setPendingExit(null)}
        onConfirm={confirmExit}
      />
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
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
        That ad isn't here anymore.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)' }}>
        It may have been deleted, or the link is wrong.
      </p>
      <div>
        <Button onClick={onBack}>Back to campaigns</Button>
      </div>
    </div>
  );
}
