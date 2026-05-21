import { useEffect, useState } from 'react';
import type { Campaign } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField, SelectField } from '../ui/Field';

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Pick<Campaign, 'name' | 'startDate' | 'endDate' | 'status'>) => void;
  initial?: Campaign;
  mode?: 'create' | 'edit';
}

export function CampaignForm({ open, onClose, onSubmit, initial, mode = 'create' }: CampaignFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    initial?.endDate ??
      new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<'active' | 'paused'>(initial?.status ?? 'active');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setStartDate(initial?.startDate ?? new Date().toISOString().slice(0, 10));
    setEndDate(
      initial?.endDate ??
        new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
    );
    setStatus(initial?.status ?? 'active');
    // Only reset when the dialog opens — re-running on every `initial` change
    // would clobber user input mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSave = name.trim().length > 0 && startDate && endDate;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit campaign' : 'Create campaign'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() => onSubmit({ name: name.trim(), startDate, endDate, status })}
          >
            {mode === 'edit' ? 'Save changes' : 'Create campaign'}
          </Button>
        </>
      }
    >
      <TextField
        label="Campaign name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Post-Workout Protein Bowls"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
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
      <SelectField
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
        ]}
      />
    </Modal>
  );
}
