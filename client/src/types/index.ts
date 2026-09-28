export type VehicleType = 'motorbike' | 'car';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  geometry: GeoJSON.LineString;
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
  status: 'active' | 'resolved';
}
