import type { Ad, Campaign, Targeting } from '../types';
import { newId } from './format';

export function emptyTargeting(): Targeting {
  return {
    audienceTags: [],
    dietary: [],
    foodInterests: [],
    exclusions: [],
    behavioral: { recurringCustomer: false, recurringPriority: 'medium' },
    time: { range: null, days: [] },
  };
}

export function newAdSkeleton(campaignId: string): Ad {
  const now = new Date().toISOString();
  return {
    id: newId('ad'),
    campaignId,
    title: 'New Ad',
    description: '',
    redirectUrl: '',
    status: 'paused',
    targeting: emptyTargeting(),
    metrics: { impressions: 0, clicks: 0, series: [] },
    createdAt: now,
    updatedAt: now,
  };
}

export function newCampaignSkeleton(): Campaign {
  const now = new Date().toISOString();
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    id: newId('cmp'),
    name: 'New Campaign',
    status: 'paused',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    adIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneAd(ad: Ad, targetCampaignId: string, opts?: { copySuffix?: boolean }): Ad {
  const now = new Date().toISOString();
  return {
    ...ad,
    id: newId('ad'),
    campaignId: targetCampaignId,
    title: opts?.copySuffix === false ? ad.title : `${ad.title} (Copy)`,
    targeting: JSON.parse(JSON.stringify(ad.targeting)) as Targeting,
    metrics: { impressions: 0, clicks: 0, series: [] },
    status: 'paused',
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneCampaign(campaign: Campaign, sourceAds: Ad[]): { campaign: Campaign; ads: Ad[] } {
  const now = new Date().toISOString();
  const newCampaignId = newId('cmp');
  const newAds = sourceAds.map((ad) => cloneAd(ad, newCampaignId, { copySuffix: false }));
  return {
    campaign: {
      ...campaign,
      id: newCampaignId,
      name: `${campaign.name} (Copy)`,
      status: 'paused',
      adIds: newAds.map((a) => a.id),
      createdAt: now,
      updatedAt: now,
    },
    ads: newAds,
  };
}
