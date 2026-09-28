CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE IF NOT EXISTS flood_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    source_url TEXT,
    source_type VARCHAR(50) NOT NULL DEFAULT 'news_crawler',
    cause VARCHAR(50) NOT NULL DEFAULT 'high_tide',
    street_name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    location_geom GEOMETRY(Geometry, 4326) NOT NULL,
    buffer_geom GEOMETRY(Polygon, 4326),
    start_time TIMESTAMPTZ NOT NULL,
    peak_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    estimated_depth_cm INTEGER NOT NULL,
    confidence_score REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flood_events_geom ON flood_events USING GIST(location_geom);
CREATE INDEX IF NOT EXISTS idx_flood_events_buffer ON flood_events USING GIST(buffer_geom);
CREATE INDEX IF NOT EXISTS idx_flood_events_time ON flood_events(start_time, end_time);

CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_geom GEOMETRY(Point, 4326) NOT NULL,
    address_text VARCHAR(255),
    depth_level VARCHAR(20) NOT NULL,
    depth_cm INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    upvotes INTEGER NOT NULL DEFAULT 1,
    downvotes INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_geom ON user_reports USING GIST(location_geom);

CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_parsed BOOLEAN NOT NULL DEFAULT FALSE,
    raw_ai_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
