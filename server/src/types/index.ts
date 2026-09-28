export type VehicleType = 'motorbike' | 'car';

export type FloodCause = 'high_tide' | 'heavy_rain' | 'combined';

export type DepthLevel = 'ankle' | 'wheel' | 'knee' | 'deep';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface FloodEvent {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceType: 'news_crawler' | 'admin_manual' | 'tide_forecast';
  cause: FloodCause;
  streetName: string;
  district: string;
  city: string;
  startTime: Date;
  peakTime: Date;
  endTime: Date;
  estimatedDepthCm: number;
  confidenceScore: number;
  geometry: any; // GeoJSON Point or LineString
  bufferPolygon?: any; // GeoJSON Polygon
}

export interface UserReport {
  id: string;
  coordinate: Coordinate;
  depthLevel: DepthLevel;
  depthCm: number;
  description?: string;
  imageUrl?: string;
  reportedAt: Date;
  upvotes: number;
  downvotes: number;
  status: 'active' | 'resolved';
}
