import { pool } from './pool';
import { isDbConnected } from './initDb';
import { FloodEvent } from '../types';

export const inMemoryFloodEvents: FloodEvent[] = [];

/**
 * Saves flood events to PostgreSQL (or in-memory fallback).
 */
export async function saveFloodEvent(event: FloodEvent): Promise<void> {
  const existingIdx = inMemoryFloodEvents.findIndex((e) => e.id === event.id);
  if (existingIdx >= 0) {
    inMemoryFloodEvents[existingIdx] = event;
  } else {
    inMemoryFloodEvents.push(event);
  }

  if (isDbConnected) {
    try {
      const coords = event.geometry?.coordinates || [106.7, 10.7];
      await pool.query(
        `INSERT INTO flood_events 
          (id, title, source_url, source_type, cause, street_name, district, city, location_geom, start_time, peak_time, end_time, estimated_depth_cm, confidence_score, created_at)
         VALUES 
          (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10, $11, $12, $13, $14, NOW())`,
        [
          event.title,
          event.sourceUrl || null,
          event.sourceType,
          event.cause,
          event.streetName,
          event.district,
          event.city || 'TP. Hồ Chí Minh',
          coords[0],
          coords[1],
          event.startTime,
          event.peakTime,
          event.endTime,
          event.estimatedDepthCm,
          event.confidenceScore,
        ]
      );
    } catch (err: any) {
      console.warn('Failed to insert flood event into PostgreSQL:', err.message);
    }
  }
}

/**
 * Fetches all dynamic flood events stored in PostgreSQL (or in-memory fallback).
 */
export async function getDynamicFloodEvents(): Promise<FloodEvent[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT 
          id, 
          title, 
          source_url as "sourceUrl", 
          source_type as "sourceType", 
          cause, 
          street_name as "streetName", 
          district, 
          city, 
          ST_X(location_geom) as lng, 
          ST_Y(location_geom) as lat, 
          start_time as "startTime", 
          peak_time as "peakTime", 
          end_time as "endTime", 
          estimated_depth_cm as "estimatedDepthCm", 
          confidence_score as "confidenceScore"
         FROM flood_events 
         ORDER BY created_at DESC 
         LIMIT 100`
      );

      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          sourceUrl: r.sourceUrl,
          sourceType: r.sourceType,
          cause: r.cause,
          streetName: r.streetName,
          district: r.district,
          city: r.city,
          startTime: new Date(r.startTime),
          peakTime: new Date(r.peakTime),
          endTime: new Date(r.endTime),
          estimatedDepthCm: r.estimatedDepthCm,
          confidenceScore: r.confidenceScore,
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(r.lng), parseFloat(r.lat)],
          },
        }));
      }
    } catch (err: any) {
      console.warn('Failed to read flood events from PostgreSQL:', err.message);
    }
  }

  return inMemoryFloodEvents;
}
