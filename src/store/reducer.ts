import type { Ad, AppState, Campaign, RestaurantProfile, Targeting } from '../types';

export type Action =
  | { type: 'CAMPAIGN_CREATE'; payload: Campaign }
  | { type: 'CAMPAIGN_UPDATE'; payload: { id: string; patch: Partial<Campaign> } }
  | { type: 'CAMPAIGN_DELETE'; payload: { id: string } }
  | { type: 'CAMPAIGN_DUPLICATE'; payload: { id: string; newCampaign: Campaign; newAds: Ad[] } }
  | { type: 'CAMPAIGN_TOGGLE_STATUS'; payload: { id: string } }
  | { type: 'AD_CREATE'; payload: Ad }
  | { type: 'AD_UPDATE'; payload: { id: string; patch: Partial<Ad> } }
  | { type: 'AD_DELETE'; payload: { id: string } }
  | { type: 'AD_DUPLICATE'; payload: { sourceId: string; newAd: Ad; targetCampaignId: string } }
  | { type: 'AD_TOGGLE_STATUS'; payload: { id: string } }
  | { type: 'TARGETING_UPDATE'; payload: { adId: string; targeting: Targeting } }
  | { type: 'RESTAURANT_UPDATE'; payload: Partial<RestaurantProfile> }
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'RESET'; payload: AppState };

function nowIso(): string {
  return new Date().toISOString();
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CAMPAIGN_CREATE': {
      const c = action.payload;
      return {
        ...state,
        campaigns: { ...state.campaigns, [c.id]: c },
        campaignOrder: [c.id, ...state.campaignOrder],
      };
    }
    case 'CAMPAIGN_UPDATE': {
      const { id, patch } = action.payload;
      const existing = state.campaigns[id];
      if (!existing) return state;
      return {
        ...state,
        campaigns: {
          ...state.campaigns,
          [id]: { ...existing, ...patch, updatedAt: nowIso() },
        },
      };
    }
    case 'CAMPAIGN_DELETE': {
      const { id } = action.payload;
      const c = state.campaigns[id];
      if (!c) return state;
      const nextCampaigns = { ...state.campaigns };
      delete nextCampaigns[id];
      const nextAds = { ...state.ads };
      const deletedAdIds = new Set(c.adIds);
      for (const adId of c.adIds) delete nextAds[adId];
      return {
        ...state,
        campaigns: nextCampaigns,
        ads: nextAds,
        events: state.events.filter((e) => !deletedAdIds.has(e.adId)),
        campaignOrder: state.campaignOrder.filter((cid) => cid !== id),
      };
    }
    case 'CAMPAIGN_DUPLICATE': {
      const { newCampaign, newAds } = action.payload;
      const adsMap = { ...state.ads };
      for (const ad of newAds) adsMap[ad.id] = ad;
      return {
        ...state,
        campaigns: { ...state.campaigns, [newCampaign.id]: newCampaign },
        ads: adsMap,
        campaignOrder: [newCampaign.id, ...state.campaignOrder],
      };
    }
    case 'CAMPAIGN_TOGGLE_STATUS': {
      const { id } = action.payload;
      const c = state.campaigns[id];
      if (!c) return state;
      return {
        ...state,
        campaigns: {
          ...state.campaigns,
          [id]: { ...c, status: c.status === 'active' ? 'paused' : 'active', updatedAt: nowIso() },
        },
      };
    }
    case 'AD_CREATE': {
      const ad = action.payload;
      const c = state.campaigns[ad.campaignId];
      if (!c) return state;
      return {
        ...state,
        ads: { ...state.ads, [ad.id]: ad },
        campaigns: {
          ...state.campaigns,
          [c.id]: { ...c, adIds: [ad.id, ...c.adIds], updatedAt: nowIso() },
        },
      };
    }
    case 'AD_UPDATE': {
      const { id, patch } = action.payload;
      const existing = state.ads[id];
      if (!existing) return state;
      return {
        ...state,
        ads: {
          ...state.ads,
          [id]: { ...existing, ...patch, updatedAt: nowIso() },
        },
      };
    }
    case 'AD_DELETE': {
      const { id } = action.payload;
      const ad = state.ads[id];
      if (!ad) return state;
      const nextAds = { ...state.ads };
      delete nextAds[id];
      const c = state.campaigns[ad.campaignId];
      const nextCampaigns = c
        ? {
            ...state.campaigns,
            [c.id]: { ...c, adIds: c.adIds.filter((x) => x !== id), updatedAt: nowIso() },
          }
        : state.campaigns;
      return {
        ...state,
        ads: nextAds,
        campaigns: nextCampaigns,
        events: state.events.filter((e) => e.adId !== id),
      };
    }
    case 'AD_DUPLICATE': {
      const { newAd, targetCampaignId } = action.payload;
      const targetCampaign = state.campaigns[targetCampaignId];
      if (!targetCampaign) return state;
      return {
        ...state,
        ads: { ...state.ads, [newAd.id]: newAd },
        campaigns: {
          ...state.campaigns,
          [targetCampaignId]: {
            ...targetCampaign,
            adIds: [newAd.id, ...targetCampaign.adIds],
            updatedAt: nowIso(),
          },
        },
      };
    }
    case 'AD_TOGGLE_STATUS': {
      const { id } = action.payload;
      const ad = state.ads[id];
      if (!ad) return state;
      return {
        ...state,
        ads: {
          ...state.ads,
          [id]: { ...ad, status: ad.status === 'active' ? 'paused' : 'active', updatedAt: nowIso() },
        },
      };
    }
    case 'TARGETING_UPDATE': {
      const { adId, targeting } = action.payload;
      const ad = state.ads[adId];
      if (!ad) return state;
      return {
        ...state,
        ads: {
          ...state.ads,
          [adId]: { ...ad, targeting, updatedAt: nowIso() },
        },
      };
    }
    case 'RESTAURANT_UPDATE': {
      return {
        ...state,
        restaurant: { ...state.restaurant, ...action.payload },
      };
    }
    case 'HYDRATE':
      return action.payload;
    case 'RESET':
      return action.payload;
    default:
      return state;
  }
}
