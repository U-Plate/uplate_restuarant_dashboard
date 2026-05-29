import { useEffect, useMemo, useState } from 'react';
import type { Campaign } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TextField, SelectField } from '../ui/Field';
import { CampaignCard } from './CampaignCard';

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Pick<Campaign, 'name' | 'startDate' | 'endDate' | 'status'>) => void;
  initial?: Campaign;
  mode?: 'create' | 'edit';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultEnd(): string {
  return new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10);
}

export function CampaignForm({ open, onClose, onSubmit, initial, mode = 'create' }: CampaignFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayIso());
  const [endDate, setEndDate] = useState(initial?.endDate ?? defaultEnd());
  const [status, setStatus] = useState<'active' | 'paused'>(initial?.status ?? 'active');
  const [touchedName, setTouchedName] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setStartDate(initial?.startDate ?? todayIso());
    setEndDate(initial?.endDate ?? defaultEnd());
    setStatus(initial?.status ?? 'active');
    setTouchedName(false);
    // Only reset when the dialog opens to avoid clobbering user input mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmedName = name.trim();
  const nameError = touchedName && trimmedName.length === 0 ? 'Campaign name is required.' : null;
  const endError = endDate < startDate ? 'End date must be after the start date.' : null;
  const canSave = trimmedName.length > 0 && !endError;

  const baseline = useMemo(
    () => ({
      name: initial?.name ?? '',
      startDate: initial?.startDate ?? todayIso(),
      endDate: initial?.endDate ?? defaultEnd(),
      status: initial?.status ?? 'active',
    }),
    [initial],
  );

  const dirty =
    name !== baseline.name ||
    startDate !== baseline.startDate ||
    endDate !== baseline.endDate ||
    status !== baseline.status;

  const handleClose = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleSubmit = () => {
    if (!canSave) {
      setTouchedName(true);
      return;
    }
    onSubmit({ name: trimmedName, startDate, endDate, status });
  };

  const draftCampaign: Campaign = useMemo(
    () => ({
      id: initial?.id ?? 'preview-draft',
      name: trimmedName || 'Untitled campaign',
      status,
      startDate,
      endDate,
      adIds: initial?.adIds ?? [],
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [trimmedName, status, startDate, endDate, initial],
  );

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={mode === 'edit' ? 'Edit campaign' : 'Create a campaign'}
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSave} onClick={handleSubmit}>
              {mode === 'edit' ? 'Save changes' : 'Create campaign'}
            </Button>
          </>
        }
      >
        <div className="uplate-campaign-form__grid">
          <div className="uplate-campaign-form__fields">
            <TextField
              label="Campaign name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touchedName) setTouchedName(true);
              }}
              onBlur={() => setTouchedName(true)}
              placeholder="Post-Workout Protein Bowls"
              autoFocus
            />
            {nameError && <span className="uplate-campaign-form__error">{nameError}</span>}

            <div className="uplate-campaign-form__dates">
              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <TextField
                label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {endError && <span className="uplate-campaign-form__error">{endError}</span>}

            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
              ]}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        title={mode === 'edit' ? 'Discard changes?' : 'Discard this campaign?'}
        message={
          mode === 'edit'
            ? "Your edits haven't been saved. Leave and lose them?"
            : "You started filling this out. Leave and discard it?"
        }
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      />
    </>
  );
}
