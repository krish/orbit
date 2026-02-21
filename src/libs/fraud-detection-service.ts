import {getConnection} from 'typeorm';
import {logger} from '@libs/logger-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FraudCheckResult {
  passed: boolean;
  reason?: string;
  alertId?: string;
}

interface GeoLocation {
  lat: number;
  lng: number;
  country?: string;
}

interface LoginHistoryRecord {
  ip_address: string;
  geo_lat: number;
  geo_lng: number;
  created_at: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Maximum speed (km/h) a human can physically travel between two logins.
// Commercial flight top speed ~900 km/h — we use 1000 to give a small buffer.
const MAX_TRAVEL_SPEED_KMH = 1000;

// Free IP geolocation API — replace with your licensed provider in production.
const GEO_API_URL = 'http://ip-api.com/json';

// ─── Module 1: Active Fraud Alert Check ───────────────────────────────────────

/**
 * Checks PostgreSQL for any open (unresolved) fraud alert on this user.
 * If one exists, all API access is blocked regardless of token validity.
 *
 * Table: fraud_alerts
 *   - user_id       UUID
 *   - status        TEXT  ('open' | 'resolved' | 'dismissed')
 *   - created_at    TIMESTAMP
 *   - alert_type    TEXT
 *   - id            UUID (primary key)
 */
export async function checkActiveFraudAlert(userId: string): Promise<FraudCheckResult> {
  try {
    const connection = getConnection();

    const result = await connection.query(
      `SELECT id, alert_type, created_at
       FROM fraud_alerts
       WHERE user_id = $1
         AND status = 'open'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (result.length > 0) {
      const alert = result[0];
      logger.warn({userId, alertId: alert.id, alertType: alert.alert_type}, 'Active fraud alert found — blocking request');
      return {
        passed: false,
        reason: `Active fraud alert on account (type: ${alert.alert_type}, raised: ${alert.created_at})`,
        alertId: alert.id,
      };
    }

    logger.info({userId}, 'No active fraud alerts found');
    return {passed: true};
  } catch (err) {
    // Fail-secure: if we cannot check, we block the request.
    // This prevents fraud checks being bypassed by DB unavailability.
    logger.error({err, userId}, 'Failed to query fraud_alerts table — failing secure');
    return {
      passed: false,
      reason: 'Fraud alert check unavailable — request denied (fail-secure)',
    };
  }
}

// ─── Module 2: Impossible Travel Detection ───────────────────────────────────

/**
 * Compares the current request IP geo-location against the user's last
 * recorded login location. If the implied travel speed between the two
 * points exceeds MAX_TRAVEL_SPEED_KMH, the request is flagged as
 * impossible travel and a new fraud alert is raised in the database.
 *
 * Table: login_history
 *   - user_id       UUID
 *   - ip_address    TEXT
 *   - geo_lat       DECIMAL
 *   - geo_lng       DECIMAL
 *   - created_at    TIMESTAMP
 */
export async function checkImpossibleTravel(userId: string, currentIp: string): Promise<FraudCheckResult> {
  try {
    // Step 1: Resolve current IP to geo-coordinates
    const currentGeo = await resolveIpToGeo(currentIp);
    if (!currentGeo) {
      // Cannot resolve IP — allow but log warning (don't block on geo lookup failure)
      logger.warn({userId, currentIp}, 'Could not resolve current IP to geo-location — skipping travel check');
      return {passed: true};
    }

    // Step 2: Fetch last login record from DB
    const connection = getConnection();
    const rows: LoginHistoryRecord[] = await connection.query(
      `SELECT ip_address, geo_lat, geo_lng, created_at
       FROM login_history
       WHERE user_id = $1
         AND geo_lat IS NOT NULL
         AND geo_lng IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      // First login — store geo and allow
      logger.info({userId, currentIp}, 'No prior login history — allowing and recording location');
      await recordLoginLocation(userId, currentIp, currentGeo);
      return {passed: true};
    }

    const lastLogin = rows[0];
    const lastGeo: GeoLocation = {lat: lastLogin.geo_lat, lng: lastLogin.geo_lng};

    // Step 3: Calculate distance and implied travel speed
    const distanceKm = haversineDistanceKm(currentGeo, lastGeo);
    const elapsedMs = Date.now() - new Date(lastLogin.created_at).getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const impliedSpeedKmh = elapsedHours > 0 ? distanceKm / elapsedHours : Infinity;

    logger.info(
      {userId, distanceKm: distanceKm.toFixed(1), elapsedHours: elapsedHours.toFixed(2), impliedSpeedKmh: impliedSpeedKmh.toFixed(1)},
      'Travel check calculated',
    );

    // Step 4: Evaluate against threshold
    if (impliedSpeedKmh > MAX_TRAVEL_SPEED_KMH) {
      logger.warn({userId, currentIp, lastIp: lastLogin.ip_address, distanceKm, impliedSpeedKmh}, 'Impossible travel detected — raising fraud alert');

      // Step 5: Raise fraud alert in DB
      await raiseFraudAlert(userId, 'impossible_travel', {
        currentIp,
        lastIp: lastLogin.ip_address,
        distanceKm: distanceKm.toFixed(1),
        impliedSpeedKmh: impliedSpeedKmh.toFixed(1),
        currentGeo,
        lastGeo,
      });

      return {
        passed: false,
        reason: `Impossible travel detected: ${distanceKm.toFixed(0)} km in ${(elapsedHours * 60).toFixed(0)} minutes (implied speed: ${impliedSpeedKmh.toFixed(0)} km/h)`,
      };
    }

    // Step 6: Passed — update login location record
    await recordLoginLocation(userId, currentIp, currentGeo);
    return {passed: true};
  } catch (err) {
    // Non-critical check — allow on unexpected errors but log
    logger.error({err, userId, currentIp}, 'Unexpected error in impossible travel check — allowing request');
    return {passed: true};
  }
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Haversine formula — calculates great-circle distance between two lat/lng
 * coordinates in kilometres.
 */
function haversineDistanceKm(a: GeoLocation, b: GeoLocation): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Resolve an IP address to geographic coordinates via geo-IP API. */
async function resolveIpToGeo(ip: string): Promise<GeoLocation | null> {
  try {
    // Skip private/loopback IPs (local dev / internal AWS traffic)
    if (isPrivateIp(ip)) {
      logger.info({ip}, 'Private IP detected — skipping geo lookup');
      return null;
    }

    const response = await fetch(`${GEO_API_URL}/${ip}`);
    if (!response.ok) {
      logger.warn({ip, status: response.status}, 'Geo-IP API returned non-200');
      return null;
    }

    const data = (await response.json()) as {status: string; lat: number; lon: number; country: string};
    if (data.status !== 'success') {
      logger.warn({ip, data}, 'Geo-IP API returned failure status');
      return null;
    }

    return {lat: data.lat, lng: data.lon, country: data.country};
  } catch (err) {
    logger.warn({err, ip}, 'Geo-IP API call failed');
    return null;
  }
}

function isPrivateIp(ip: string): boolean {
  return ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') || ip === '127.0.0.1' || ip === '::1';
}

/** Insert a new login location record into login_history. */
async function recordLoginLocation(userId: string, ip: string, geo: GeoLocation): Promise<void> {
  try {
    const connection = getConnection();
    await connection.query(
      `INSERT INTO login_history (user_id, ip_address, geo_lat, geo_lng, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, ip, geo.lat, geo.lng],
    );
  } catch (err) {
    logger.error({err, userId}, 'Failed to record login location');
  }
}

/** Insert a new open fraud alert into fraud_alerts. */
async function raiseFraudAlert(userId: string, alertType: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    const connection = getConnection();
    await connection.query(
      `INSERT INTO fraud_alerts (user_id, alert_type, status, metadata, created_at)
       VALUES ($1, $2, 'open', $3, NOW())`,
      [userId, alertType, JSON.stringify(metadata)],
    );
  } catch (err) {
    logger.error({err, userId}, 'Failed to raise fraud alert in DB');
  }
}
