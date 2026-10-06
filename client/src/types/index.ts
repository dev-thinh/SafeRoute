export type VehicleType = 'motorbike' | 'car';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface FloodedSegment {
  coordinates: [number, number][]; // [[lng, lat], ...]
  depthCm: number;
  severity: 'low' | 'medium' | 'high' | 'prohibited'; // low: yellow, medium: orange, high: red, prohibited: dark red
  streetName?: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  geometry: GeoJSON.LineString;
  floodedSegments?: FloodedSegment[];
}

export interface NavigateResponse {
  safe_route: RouteResult;
  fastest_route: RouteResult;
  target_time: string;
  vehicle_type: VehicleType;
}

export interface FloodEvent {
  id: string;
  title: string;
  cause: 'high_tide' | 'heavy_rain' | 'combined';
  streetName: string;
  district: string;
  estimatedDepthCm: number;
  current_depth_cm?: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface UserReport {
  id: string;
  coordinate: Coordinate;
  depthLevel: 'ankle' | 'wheel' | 'knee' | 'deep';
  depthCm: number;
  description?: string;
  upvotes: number;
  downvotes: number;
  status: 'pending' | 'approved' | 'rejected' | 'resolved' | 'active';
  reportedAt?: string;
  lastVerifiedAt?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  clusterId?: string;
  isAutoApproved?: boolean;
  reviewedBy?: 'ai' | 'admin';
  reviewedAt?: string;
}

export interface ReportCluster {
  clusterId: string;
  streetName?: string;
  district?: string;
  coordinate: Coordinate;
  totalReports: number;
  depthLevel: 'ankle' | 'wheel' | 'knee' | 'deep';
  avgDepthCm: number;
  latestReportedAt: string;
  aiConfidence: number;
  aiReasoning: string;
  canAutoApprove: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reports: UserReport[];
}

export interface AdminSettings {
  isAutoPilotEnabled: boolean;
  autoApproveThreshold: number;
  minClusterCountForAutoApprove: number;
}

export interface ScrapedArticleLocation {
  streetName: string;
  district: string;
  depthCm: number;
  cause: 'high_tide' | 'heavy_rain' | 'combined';
  lat?: number;
  lng?: number;
}

export interface ScrapedArticle {
  id: string;
  source: 'VnExpress' | 'Tuổi Trẻ' | 'Thanh Niên' | 'Dân Trí';
  title: string;
  url: string;
  publishedAt: string;
  crawledAt: string;
  summary: string;
  cause: 'high_tide' | 'heavy_rain' | 'combined';
  extractedLocations: ScrapedArticleLocation[];
  contentSnippet: string;
}

export interface QuadrantWeatherStatus {
  id: string;
  name: string;
  lat: number;
  lng: number;
  precipitationMm: number;
  alertLevel: 'safe' | 'warning' | 'danger';
  alertText: string;
}

export interface HourlyForecastItem {
  time: string;
  precipitationMm: number;
}

export interface CorridorRiskStatus {
  id: string;
  streetName: string;
  district: string;
  rainThresholdMm: number;
  currentRainMm: number;
  estimatedDepthCm: number;
  coordinate: [number, number]; // [lng, lat]
  description: string;
  isCurrentlyFlooded: boolean;
}

export interface TideStatus {
  lunarDay: number;
  peakTideHeightM: number;
  morningPeak: string;
  eveningPeak: string;
  isSpringTide: boolean;
  tideProbability: number;
}

export interface WeatherDashboardData {
  quadrants: QuadrantWeatherStatus[];
  hourlyTimeline: HourlyForecastItem[];
  corridorsAtRisk: CorridorRiskStatus[];
  tideStatus?: TideStatus;
  fetchedAt: string;
}

