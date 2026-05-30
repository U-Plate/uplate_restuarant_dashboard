import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Pencil, Trash2 } from 'lucide-react';
import type { Ad, Campaign } from '../../types';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { ActionMenu } from '../ui/ActionMenu';
import { AD_LOCATION_LABEL } from '../../data/constants';

interface AdPageHeaderProps {
  ad: Ad;
  campaign: Campaign;
  editing: boolean;
  dirty: boolean;
  backTo: string;
  backLabel: string;
  onStartEdit: () => void;
  /** Back link clicked while editing. Exits edit AND navigates to backTo. */
  onRequestExitEdit: () => void;
  /** Discard button clicked. Exits edit mode but stays on the page. */
  onDiscardChanges: () => void;
  onSave: () => void;
  onToggleStatus: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
}

export function AdPageHeader({
  ad,
  campaign,
  editing,
  dirty,
  backTo,
  backLabel,
  onStartEdit,
  onRequestExitEdit,
  onDiscardChanges,
  onSave,
  onToggleStatus,
  onDuplicate,
  onRequestDelete,
}: AdPageHeaderProps) {
  const navigate = useNavigate();
  const isActive = ad.status === 'active';

  return (
    <header className="uplate-ad-header">
      <BackLink to={backTo} label={backLabel} editing={editing} dirty={dirty} onRequestExit={onRequestExitEdit} navigate={navigate} />

      <div className="uplate-ad-header__title-row">
        <h1
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-headline)',
            lineHeight: 'var(--type-headline-lh)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.014em',
            margin: 0,
            wordBreak: 'break-word',
            flex: 1,
            minWidth: 0,
          }}
          title={ad.title}
        >
          {ad.title}
        </h1>

        <div className="uplate-ad-header__actions">
          {editing ? (
            <>
              <Button variant="ghost" onClick={onDiscardChanges}>
                Discard
              </Button>
              <Button disabled={!dirty} onClick={onSave}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Toggle
                checked={isActive}
                onChange={onToggleStatus}
                label={isActive ? 'Active' : 'Paused'}
              />
              <ActionMenu
                items={[
                  { label: 'Duplicate', icon: <Copy size={14} />, onClick: onDuplicate },
                  {
                    label: 'Delete ad',
                    icon: <Trash2 size={14} />,
                    onClick: onRequestDelete,
                    danger: true,
                  },
                ]}
              />
              <Button iconLeft={<Pencil size={14} />} onClick={onStartEdit}>
                Edit ad
              </Button>
            </>
          )}
        </div>
      </div>

      <p
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        {AD_LOCATION_LABEL[ad.location]}
        <span aria-hidden> · </span>
        in <Link
          to={`/campaigns/${campaign.id}`}
          style={{ color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 500 }}
        >
          {campaign.name}
        </Link>
      </p>
    </header>
  );
}

interface BackLinkProps {
  to: string;
  label: string;
  editing: boolean;
  dirty: boolean;
  onRequestExit: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function BackLink({ to, label, editing, dirty, onRequestExit, navigate }: BackLinkProps) {
  // When clean (or not editing), follow the link straight to `to`.
  // When dirty and editing, intercept so the parent can confirm-discard.
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (editing && dirty) {
          e.preventDefault();
          onRequestExit();
          // onRequestExit will navigate the user via the confirm flow.
          // If parent decides to navigate immediately (clean), we'd already be gone.
          return;
        }
        if (editing && !dirty) {
          // Allow plain navigation but let parent know we exited edit mode.
          e.preventDefault();
          onRequestExit();
          navigate(to);
        }
      }}
      className="uplate-ad-header__back"
    >
      <ChevronLeft size={14} strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}
