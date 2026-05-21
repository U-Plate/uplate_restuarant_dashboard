import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField } from '../ui/Field';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';
import { cloneAd } from '../../lib/clone';
import { campaignsInOrder } from '../../store/selectors';

interface DuplicateAdDialogProps {
  open: boolean;
  ad: Ad | null;
  onClose: () => void;
}

export function DuplicateAdDialog({ open, ad, onClose }: DuplicateAdDialogProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const campaigns = campaignsInOrder(state);
  const [target, setTarget] = useState(ad?.campaignId ?? campaigns[0]?.id ?? '');

  useEffect(() => {
    if (open && ad) setTarget(ad.campaignId);
  }, [open, ad]);

  if (!ad) return null;

  const handleSubmit = () => {
    const clone = cloneAd(ad, target);
    dispatch({
      type: 'AD_DUPLICATE',
      payload: { sourceId: ad.id, newAd: clone, targetCampaignId: target },
    });
    onClose();
    navigate(`/campaigns/${target}/ads/${clone.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duplicate ad"
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Duplicate
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
        Copy <strong style={{ color: 'var(--text)' }}>{ad.title}</strong> into a campaign. The new ad
        starts paused so you can review targeting before going live.
      </p>
      <SelectField
        label="Target campaign"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
      />
    </Modal>
  );
}
