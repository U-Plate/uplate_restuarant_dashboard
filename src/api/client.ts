// Typed dashboard client. One method per endpoint documented in /backend.md.
// Pages and the store should depend on this interface, not on `fetch` directly,
// so the implementation can be swapped (HTTP, localStorage adapter for dev,
// in-memory mock for tests) without touching React code.

import type {
  AdDetailResponse,
  AdInput,
  AdListQuery,
  AdListResponse,
  AdPatch,
  AnalyticsOverviewQuery,
  AnalyticsOverviewResponse,
  AnalyticsSeriesQuery,
  AnalyticsSeriesResponse,
  AudienceInsightsResponse,
  AuthSessionResponse,
  BootstrapResponse,
  CampaignComparisonResponse,
  CampaignDetailResponse,
  CampaignInput,
  CampaignListResponse,
  CampaignPatch,
  ClickSignalsResponse,
  CreateAdResponse,
  CreateCampaignResponse,
  DeleteAdResponse,
  DeleteCampaignResponse,
  DuplicateAdRequest,
  DuplicateAdResponse,
  DuplicateCampaignRequest,
  DuplicateCampaignResponse,
  RegisterRequest,
  RegisterResponse,
  RestaurantPatch,
  RestaurantProfile,
  SetStatusRequest,
  Status,
  UpdateAdRequest,
  ValidateAccessCodeRequest,
  ValidateAccessCodeResponse,
} from './types';

export interface ApiClient {
  auth: {
    /** Read-only check that an access code is valid. Does NOT consume the code. */
    validateAccessCode(input: ValidateAccessCodeRequest): Promise<ValidateAccessCodeResponse>;
    /**
     * Consume the access code and bind the authenticated Firebase user to a restaurant.
     * Throws ApiError(404 access_code_not_found | 410 access_code_consumed | 403)
     * if the code is invalid or already used.
     */
    register(input: RegisterRequest): Promise<RegisterResponse>;
    /**
     * Resolve the authenticated user's restaurant binding. Throws ApiError(404
     * `restaurant_not_found`) if the Firebase user has no binding — the client
     * MUST sign the user out and return to the login screen.
     */
    session(): Promise<AuthSessionResponse>;
  };

  bootstrap(): Promise<BootstrapResponse>;

  restaurant: {
    get(): Promise<RestaurantProfile>;
    patch(input: RestaurantPatch): Promise<RestaurantProfile>;
  };

  campaigns: {
    list(opts?: { status?: Status }): Promise<CampaignListResponse>;
    create(input: CampaignInput): Promise<CreateCampaignResponse>;
    detail(id: string): Promise<CampaignDetailResponse>;
    patch(id: string, input: CampaignPatch, ifMatch?: string): Promise<CreateCampaignResponse>;
    remove(id: string, ifMatch?: string): Promise<DeleteCampaignResponse>;
    duplicate(id: string, input?: DuplicateCampaignRequest): Promise<DuplicateCampaignResponse>;
    setStatus(id: string, input: SetStatusRequest): Promise<CreateCampaignResponse>;
    
  };

  ads: {
    list(query?: AdListQuery): Promise<AdListResponse>;
    create(input: AdInput): Promise<CreateAdResponse>;
    detail(id: string): Promise<AdDetailResponse>;
    update(id: string, input: UpdateAdRequest, ifMatch?: string): Promise<CreateAdResponse>;
    patch(id: string, input: AdPatch, ifMatch?: string): Promise<CreateAdResponse>;
    remove(id: string, ifMatch?: string): Promise<DeleteAdResponse>;
    duplicate(id: string, input: DuplicateAdRequest): Promise<DuplicateAdResponse>;
    setStatus(id: string, input: SetStatusRequest): Promise<CreateAdResponse>;
  };

  analytics: {
    overview(query?: AnalyticsOverviewQuery): Promise<AnalyticsOverviewResponse>;
    campaignComparison(): Promise<CampaignComparisonResponse>;
    series(query: AnalyticsSeriesQuery): Promise<AnalyticsSeriesResponse>;
    audienceInsights(): Promise<AudienceInsightsResponse>;
    clickSignals(adId: string): Promise<ClickSignalsResponse>;
  };
}
