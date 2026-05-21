import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField, TextArea, SelectField } from '../ui/Field';
import { useApp } from '../../store/AppContext';
import { campaignsInOrder } from '../../store/selectors';
import { newAdSkeleton } from '../../lib/clone';

interface AdCreateDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId?: string;
}

export function AdCreateDialog({ open, onClose, campaignId }: AdCreateDialogProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const campaigns = useMemo(() => campaignsInOrder(state), [state]);
  const firstCampaignId = campaigns[0]?.id ?? '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [creativeUrl, setCreativeUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [target, setTarget] = useState(campaignId ?? firstCampaignId);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setRedirectUrl('');
    setCreativeUrl('');
    setIconUrl('');
    setTarget(campaignId ?? firstCampaignId);
    // Intentionally only reset when the dialog opens — depending on `campaigns`
    // or `firstCampaignId` would clobber the user's typing on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canCreate = title.trim().length > 0 && target.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const skeleton = newAdSkeleton(target);
    const ad = {
      ...skeleton,
      title: title.trim(),
      description: description.trim(),
      redirectUrl: redirectUrl.trim(),
      creativeUrl: creativeUrl.trim() || undefined,
      iconUrl: iconUrl.trim() || undefined,
    };
    dispatch({ type: 'AD_CREATE', payload: ad });
    onClose();
    navigate(`/campaigns/${target}/ads/${ad.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create ad"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canCreate} onClick={handleCreate}>
            Create ad
          </Button>
        </>
      }
    >
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chicken Quinoa Power Bowl"
      />
      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short, appetizing copy under 140 chars."
        rows={3}
      />
      <TextField
        label="Redirect URL"
        value={redirectUrl}
        onChange={(e) => setRedirectUrl(e.target.value)}
        placeholder="https://uplate.app/order/your-item"
      />
      <TextField
        label="Creative image URL"
        hint="Optional — leave empty to use the gradient placeholder."
        value={creativeUrl}
        onChange={(e) => setCreativeUrl(e.target.value)}
        placeholder="https://…"
      />
      <TextField
        label="Custom icon URL"
        hint="Optional — overrides the restaurant's default icon for this ad."
        value={iconUrl}
        onChange={(e) => setIconUrl(e.target.value)}
        placeholder="https://…"
      />
      {!campaignId && (
        <SelectField
          label="Campaign"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}
    </Modal>
  );
}
