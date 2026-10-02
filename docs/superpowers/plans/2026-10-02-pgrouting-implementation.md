# pgRouting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a high-performance local pgRouting engine for SafeRoute using the OpenStreetMap Saigon road network on PostgreSQL/PostGIS to provide 100% natural, mathematically optimal flood-avoidance routing.

**Architecture:** Upgrade the PostGIS container to `pgrouting/pgrouting-extra:16-3.5-3.8.0`, import the 15MB Saigon OSM road network into topology tables `ways` and `ways_vertices_pgr`, build a dedicated `pgRoutingService.ts` running dynamic cost `pgr_dijkstra` routing against active flood polygons, and integrate into `routesRouter.ts` with transparent fallback to Goong.

**Tech Stack:** Docker, PostgreSQL 16, PostGIS 3.5, pgRouting 3.8, osm2pgrouting, Node.js, TypeScript, Turf.js, React Leaflet.

## Global Constraints
- NO parenthetical explanations in Vietnamese responses.
- Clickable markdown links with file:/// scheme for all file references.
- Preserve backward compatibility: Goong API remains available as a fallback when coordinates are outside the Saigon network boundaries.
- All existing tests in `server` must remain green.

---

### Task 1: Upgrade Docker Container to pgRouting & Enable Extensions

**Files:**
- Modify: `docker-compose.yml:3-4`
- Modify: `server/src/db/schema.sql:1-4`

**Interfaces:**
- Produces: PostgreSQL container `saferoute-postgis` with `postgis` and `pgrouting` extensions enabled.

- [ ] **Step 1: Update docker-compose.yml with pgrouting-extra image**
Change `image: postgis/postgis:16-3.4` to `image: pgrouting/pgrouting-extra:16-3.5-3.8.0` in `docker-compose.yml`.

- [ ] **Step 2: Restart container and enable pgrouting extension**
Run `docker compose down` and `docker compose up -d`.
Execute `CREATE EXTENSION IF NOT EXISTS pgrouting;` inside PostgreSQL.

- [ ] **Step 3: Verify extension activation**
Run SQL `SELECT pgr_version();` and confirm output returns version 3.8.0.

---

### Task 2: Download Saigon OSM Road Network & Import via osm2pgrouting

**Files:**
- Create: `server/scripts/import_osm_roads.sh` (or PowerShell script `server/scripts/import_osm_roads.ps1`)
- Target DB Tables: `ways`, `ways_vertices_pgr`, `configuration`

**Interfaces:**
- Consumes: `https://download.bbbike.org/osm/bbbike/Saigon/Saigon.osm.pbf` (15.2 MB)
- Produces: Topology tables `ways` and `ways_vertices_pgr` with spatial indices in `saferoute` database.

- [ ] **Step 1: Download Saigon OSM PBF extract**
Download `https://download.bbbike.org/osm/bbbike/Saigon/Saigon.osm.pbf` into container temporary directory `/tmp/Saigon.osm.pbf`.

- [ ] **Step 2: Convert PBF to OSM XML or run osm2pgrouting directly**
Use `osm2pgrouting` inside `saferoute-postgis` with default `mapconfig.xml` to populate `ways` and `ways_vertices_pgr`.

- [ ] **Step 3: Create spatial and routing indexes**
Execute:
```sql
CREATE INDEX IF NOT EXISTS ways_the_geom_idx ON ways USING GIST (the_geom);
CREATE INDEX IF NOT EXISTS ways_source_idx ON ways (source);
CREATE INDEX IF NOT EXISTS ways_target_idx ON ways (target);
CREATE INDEX IF NOT EXISTS ways_vertices_the_geom_idx ON ways_vertices_pgr USING GIST (the_geom);
```

- [ ] **Step 4: Verify graph topology**
Run SQL:
```sql
SELECT count(*) FROM ways;
SELECT count(*) FROM ways_vertices_pgr;
```
Confirm `ways` table has valid road segments with geometry and topology.

---

### Task 3: Build pgRouting Engine Service

**Files:**
- Create: `server/src/services/pgRoutingService.ts`
- Create: `server/tests/pgRoutingService.test.ts`

**Interfaces:**
- Consumes: `Coordinate`, `VehicleType`, `FloodEvent` from `server/src/types/index.ts`
- Produces: `findPgRoutingSafeRoute(origin: Coordinate, destination: Coordinate, targetTime: Date, vehicleType: VehicleType, events: FloodEvent[]): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult } | null>`

- [ ] **Step 1: Write test for pgRouting Dijkstra routing**
Test that `findPgRoutingSafeRoute` returns non-null route results with valid LineString coordinates between two points in HCMC.
Test that when a flood event is placed on a street segment, the safe route's geometry bypasses the flooded segment while the fastest route intersects it.

- [ ] **Step 2: Implement nearest vertex lookup**
Use `ST_Distance(the_geom, ST_SetSRID(ST_Point(lng, lat), 4326))` to find the closest `source` or `target` node in `ways_vertices_pgr`.

- [ ] **Step 3: Implement dynamic cost pgr_dijkstra query**
Construct dynamic SQL query where edges intersecting active flood buffers (`turf.buffer` 80m) have `cost = -1` (if depth > vehicle threshold) or `cost = cost * 100` (penalty).

- [ ] **Step 4: Reconstruct GeoJSON LineString geometry and duration**
Stitch the path edges returned by `pgr_dijkstra` into a continuous GeoJSON `LineString`, calculate vehicle duration and distance in meters.

- [ ] **Step 5: Run tests and verify PASS**
Run `npm test` in `server` and confirm all tests pass.

---

### Task 4: Integrate pgRouting Service into REST API & Frontend

**Files:**
- Modify: `server/src/routes/routesRouter.ts`
- Test: `server/tests/api.test.ts`

**Interfaces:**
- Consumes: `findPgRoutingSafeRoute` from `server/src/services/pgRoutingService.ts`
- Produces: Enhanced `POST /api/routes/navigate` that prioritizes pgRouting for HCMC with fallback to Goong.

- [ ] **Step 1: Update routesRouter.ts to prioritize pgRouting**
In `POST /api/routes/navigate`, call `findPgRoutingSafeRoute`. If within coverage and successfully computed, return results. If outside coverage or no path found, smoothly fall back to `navigateSafeRoute` (Goong).

- [ ] **Step 2: Run end-to-end API test**
Run `vitest run tests/api.test.ts` to confirm HTTP API returns 200 with valid route coordinates and flood metrics.

- [ ] **Step 3: Verify client build**
Run `npm run build` in `client` to ensure zero compilation or type errors.
