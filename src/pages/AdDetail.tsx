import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Targeting } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DuplicateAdDialog } from '../components/ad/DuplicateAdDialog';
import { AdForm } from '../components/ad/AdForm';
import { AdPreview } from '../components/ad/AdPreview';
import { TargetSummaryCard } from '../components/ad/TargetSummaryCard';
import { TargetingBuilder } from '../components/targeting/TargetingBuilder';
import { TrendChart } from '../components/charts/TrendChart';
import { BarComparison } from '../components/charts/BarComparison';
import { useApp } from '../store/AppContext';
import { adCtr } from '../store/selectors';
import { formatNumber, formatPercent } from '../lib/format';
import { AUDIENCE_LABEL } from '../data/constants';
import { Badge } from '../components/ui/Badge';

export default function AdDetail() {
  const { id, adId } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const backTo =
    (location.state as { from?: string } | null)?.from ?? `/campaigns/${id}`;
  const editing = params.get('edit') === '1';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const ad = adId ? state.ads[adId] : undefined;
  const campaign = id ? state.campaigns[id] : undefined;

  type Draft = {
    title: string;
    description: string;
    redirectUrl: string;
    creativeUrl?: string;
    iconUrl?: string;
    targeting: Targeting;
  };
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
            creativeUrl: ad.creativeUrl,
            iconUrl: ad.iconUrl,
            targeting: ad.targeting,
          }
        : null,
    );
  }

  const hasChanges = !!(
    editing &&
    draft &&
    ad &&
    (draft.title !== ad.title ||
      draft.description !== ad.description ||
      draft.redirectUrl !== ad.redirectUrl ||
      (draft.creativeUrl ?? '') !== (ad.creativeUrl ?? '') ||
      (draft.iconUrl ?? '') !== (ad.iconUrl ?? '') ||
      JSON.stringify(draft.targeting) !== JSON.stringify(ad.targeting))
  );

  const saveDraft = () => {
    if (!ad || !draft) {
      setParams({});
      return;
    }
    dispatch({
      type: 'AD_UPDATE',
      payload: {
        id: ad.id,
        patch: {
          title: draft.title,
          description: draft.description,
          redirectUrl: draft.redirectUrl,
          creativeUrl: draft.creativeUrl,
          iconUrl: draft.iconUrl,
        },
      },
    });
    dispatch({ type: 'TARGETING_UPDATE', payload: { adId: ad.id, targeting: draft.targeting } });
    setDraft(null);
    setParams({});
  };

  const requestBack = () => {
    if (hasChanges) setConfirmExit(true);
    else navigate(backTo);
  };

  const audiencePerf = useMemo(() => {
    if (!ad) return [];
    if (ad.targeting.audienceTags.length === 0) return [];
    return ad.targeting.audienceTags.map((rule, i) => {
      const fraction = 0.65 - i * 0.08 + (rule.priority === 'required' ? 0.1 : 0);
      return {
        name: AUDIENCE_LABEL[rule.tag],
        value: Math.max(0.18, Math.min(0.92, fraction)),
      };
    });
  }, [ad]);

  if (!ad || !campaign) {
    return (
      <EmptyState
        title="Ad not found"
        description="It may have been deleted."
        action={<Button onClick={() => navigate('/campaigns')}>Back to campaigns</Button>}
      />
    );
  }

  const isActive = ad.status === 'active';

  return (
    <>
      <PageHeader
        title=""
        meta={
           <Badge tone={isActive ? 'active' : 'paused'} withDot>
                        {isActive ? 'Active' : 'Paused'}
                      </Badge>
        }
        back={backTo}
        onBack={editing ? requestBack : undefined}
        actions={
          editing ? (
            <Button
              variant="primary"
              iconLeft={<Check size={14} />}
              onClick={saveDraft}
            >
              Save
            </Button>
          ) : (
            <>
              <Toggle
                checked={isActive}
                onChange={() => dispatch({ type: 'AD_TOGGLE_STATUS', payload: { id: ad.id } })}
                label={isActive ? 'Active' : 'Paused'}
              />
              
              <Button
                variant="ghost"
                iconLeft={<Copy size={14} />}
                onClick={() => setDuplicateOpen(true)}
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                iconLeft={<Trash2 size={14} />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
              <Button
                variant="primary"
                iconLeft={<Pencil size={14} />}
                onClick={() => setParams({ edit: '1' })}
              >
                Edit ad
              </Button>
            </>
          )
        }
      />

      {editing ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)',
            gap: 'var(--s-5)',
            marginBottom: 'var(--s-5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-4)',
              position: 'sticky',
              top: 'var(--s-4)',
              alignSelf: 'flex-start',
            }}
          >
            <AdForm
              value={{
                title: draft?.title ?? ad.title,
                description: draft?.description ?? ad.description,
                redirectUrl: draft?.redirectUrl ?? ad.redirectUrl,
                creativeUrl: draft?.creativeUrl ?? ad.creativeUrl,
                iconUrl: draft?.iconUrl ?? ad.iconUrl,
              }}
              onChange={(patch) =>
                setDraft((d) => (d ? { ...d, ...patch } : d))
              }
            />
            <Card padding="var(--s-3)">
              <AdPreview ad={draft ? { ...ad, ...draft } : ad} />
            </Card>
          </div>
          <TargetingBuilder
            value={draft?.targeting ?? ad.targeting}
            onChange={(targeting) =>
              setDraft((d) => (d ? { ...d, targeting } : d))
            }
          />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)',
              gap: 'var(--s-5)',
              marginBottom: 'var(--s-5)',
              alignItems: 'flex-start',
            }}
          >
            <Card padding="var(--s-3)">
              <AdPreview ad={ad} />
            </Card>
            <Card padding="var(--s-5)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-soft)',
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    Title
                  </span>
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: -0.4,
                    }}
                  >
                    {ad.title}
                  </h2>
                </div>

                <DataRow label="Description">
                  <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>
                    {ad.description || (
                      <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
                        No description yet — click Edit to add one.
                      </span>
                    )}
                  </p>
                </DataRow>

                <DataRow label="Redirect URL">
                  {ad.redirectUrl ? (
                    <a
                      href={ad.redirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        color: 'var(--accent)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {ad.redirectUrl}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: 14 }}>
                      Not set
                    </span>
                  )}
                </DataRow>

                {/* <DataRow label="Image URL">
                  {ad.creativeUrl ? (
                    <a
                      href={ad.creativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        color: 'var(--accent)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {ad.creativeUrl}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: 14 }}>
                      Using gradient placeholder
                    </span>
                  )}
                </DataRow> */}

                <DataRow label="Campaign">
                  <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                    {campaign.name}
                  </span>
                </DataRow>
              </div>
            </Card>
          </div>

          <div style={{ marginBottom: 'var(--s-5)' }}>
            <TargetSummaryCard
              targeting={ad.targeting}
              onEdit={() => setParams({ edit: '1' })}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--s-4)',
              marginBottom: 'var(--s-4)',
            }}
          >
            <MiniStat label="Impressions" value={formatNumber(ad.metrics.impressions)} />
            <MiniStat label="Clicks" value={formatNumber(ad.metrics.clicks)} />
            <MiniStat label="CTR" value={formatPercent(adCtr(ad))} />
            <MiniStat
              label="Audience signals"
              value={`${
                ad.targeting.audienceTags.length +
                ad.targeting.dietary.length +
                ad.targeting.foodInterests.length
              }`}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
              gap: 'var(--s-4)',
            }}
          >
            <Card padding="var(--s-5)">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
                CTR over time
              </h3>
              {ad.metrics.series.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                  No performance data yet.
                </p>
              ) : (
                <TrendChart
                  data={ad.metrics.series.map((s) => ({
                    date: s.date,
                    value: s.impressions === 0 ? 0 : (s.clicks / s.impressions) * 100,
                  }))}
                  label="CTR %"
                />
              )}
            </Card>
            <Card padding="var(--s-5)">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s-3)' }}>
                Audience performance
              </h3>
              {audiencePerf.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                  Add audience tags to see breakdown.
                </p>
              ) : (
                <BarComparison
                  data={audiencePerf}
                  valueLabel="match score"
                  formatValue={(n) => formatPercent(n, 0)}
                  height={200}
                />
              )}
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete ad?"
        message={`Permanently remove "${ad.title}". This can't be undone.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'AD_DELETE', payload: { id: ad.id } });
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
        open={confirmExit}
        title="Discard unsaved changes?"
        message="Your edits to this ad haven't been saved yet. Leave and discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          setDraft(null);
          navigate(backTo);
        }}
      />
    </>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-soft)',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="var(--s-4)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-soft)',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -0.3,
          }}
        >
          {value}
        </span>
      </div>
    </Card>
  );
}
