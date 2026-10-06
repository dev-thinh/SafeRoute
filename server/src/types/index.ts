export type VehicleType = 'motorbike' | 'car';

export type FloodCause = 'high_tide' | 'heavy_rain' | 'combined';

export type DepthLevel = 'ankle' | 'wheel' | 'knee' | 'deep';

export interface Coordinate {
   lat: number;
   lng: number;
}

export interface FloodedSegment {
  coordinates: [number, number][]; // [[lng, lat], ...]
  depthCm: number;
  severity: 'low' | 'medium' | 'high' | 'prohibited';
  streetName?: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  geometry: any;
  floodedSegments?: FloodedSegment[];
}

export interface FloodEvent {
   id: string;
   title: string;
   sourceUrl?: string;
   sourceType: 'news_crawler' | 'admin_manual' | 'tide_forecast' | 'weather_radar';
   cause: FloodCause;
   streetName: string;
   district: string;
   city: string;
   startTime: Date;
   peakTime: Date;
   endTime: Date;
   estimatedDepthCm: number;
   current_depth_cm?: number;
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
   lastVerifiedAt?: Date;
   upvotes: number;
   downvotes: number;
   status: 'active' | 'resolved';
}
