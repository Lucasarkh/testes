import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  precision: string; // ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  category: string;
}

export interface DistanceResult {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
}

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY') || '';
    this.http = axios.create({ timeout: 15000 });
  }

  // ─── Step 1: Geocode (legacy Geocoding API — still works) ───────────

  async geocode(address: string): Promise<GeocodeResult | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await this.http.get(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: {
              address,
              key: this.apiKey,
              language: 'pt-BR',
            },
          },
        );

        if (resp.data.status !== 'OK' || !resp.data.results?.length) {
          this.logger.warn(`Geocode failed for "${address}": ${resp.data.status}`);
          return null;
        }

        const result = resp.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          precision: result.geometry.location_type || 'APPROXIMATE',
        };
      } catch (err: any) {
        if (attempt === 0 && (err.response?.status === 429 || err.response?.status >= 500)) {
          this.logger.warn(`Geocode attempt ${attempt + 1} failed, retrying...`);
          await this.sleep(1000);
          continue;
        }
        this.logger.error(`Geocode error: ${err.message}`);
        return null;
      }
    }
    return null;
  }

  // ─── Step 2: Nearby Search — Places API (New) ──────────────────────

  /**
   * Types that indicate a retail / commercial establishment — used to detect
   * false-positives when Google miscategorises a store as a hospital, school, etc.
   */
  private static readonly RETAIL_TYPES = new Set([
    'store',
    'clothing_store',
    'home_goods_store',
    'furniture_store',
    'beauty_salon',
    'hair_care',
    'jewelry_store',
    'shoe_store',
    'electronics_store',
    'book_store',
    'pet_store',
    'florist',
    'gift_shop',
    'convenience_store',
    'shopping_mall',
    'department_store',
    'discount_store',
    'wholesaler',
    'auto_parts_store',
    'bicycle_store',
    'cell_phone_store',
    'hardware_store',
    'liquor_store',
    'sporting_goods_store',
    'toy_store',
  ]);

  /**
   * Categories where having retail types in the secondary types should
   * disqualify the result (medical, educational, recreational).
   */
  private static readonly NON_RETAIL_CATEGORIES = new Set([
    'hospital',
    'school',
    'park',
    'gym',
  ]);

  /**
   * Suspicious name patterns per category. If the place's name matches any of
   * these regexes it is almost certainly a misclassification.
   */
  private static readonly SUSPICIOUS_NAME_PATTERNS: Record<string, RegExp> = {
    hospital: /ateli[eê]|bordado|artesanato|sal[aã]o|barbearia|costura|enxoval|cabeleireiro|tattoo|tatuagem|pet\s?shop|veteri/i,
    school:   /ateli[eê]|bordado|sal[aã]o|barbearia|tattoo|tatuagem|pet\s?shop/i,
    park:     /ateli[eê]|bordado|sal[aã]o|loja|store/i,
    gym:      /ateli[eê]|bordado|sal[aã]o|barbearia|tattoo|pet\s?shop/i,
  };

  async nearbySearch(
    lat: number,
    lng: number,
    category: string,
    radiusMeters: number,
    maxResults: number,
  ): Promise<NearbyPlace[]> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await this.http.post(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            includedPrimaryTypes: [category],
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
              },
            },
            maxResultCount: Math.min(maxResults, 20),
            rankPreference: 'DISTANCE',
            languageCode: 'pt-BR',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.primaryType,places.types',
            },
          },
        );

        const places = resp.data.places || [];

        const filtered = places.filter((p: any) => {
          const name: string = p.displayName?.text || '';
          const types: string[] = Array.isArray(p.types) ? p.types : [];

          // 1. Check name-based suspicious patterns
          const suspiciousRe = GoogleMapsService.SUSPICIOUS_NAME_PATTERNS[category];
          if (suspiciousRe && suspiciousRe.test(name)) {
            this.logger.warn(
              `Filtering out "${name}" — name matches suspicious pattern for ${category}`,
            );
            return false;
          }

          // 2. Check contaminating types (e.g. a "store" showing as hospital)
          if (GoogleMapsService.NON_RETAIL_CATEGORIES.has(category)) {
            const hasRetailType = types.some((t) =>
              GoogleMapsService.RETAIL_TYPES.has(t),
            );
            if (hasRetailType) {
              this.logger.warn(
                `Filtering out "${name}" (types=${types.join(',')}) — has retail type, incompatible with ${category}`,
              );
              return false;
            }
          }

          // 3. Basic type match (safety net)
          if (p.primaryType !== category && !types.includes(category)) {
            this.logger.warn(
              `Filtering out "${name}" (primaryType=${p.primaryType}) — doesn't match ${category}`,
            );
            return false;
          }

          return true;
        });

        this.logger.log(
          `nearbySearch(${category}): ${places.length} raw → ${filtered.length} after filter`,
        );

        return filtered.map((p: any) => ({
          placeId: p.id || '',
          name: p.displayName?.text || '',
          vicinity: p.shortFormattedAddress || p.formattedAddress || '',
          lat: p.location?.latitude ?? 0,
          lng: p.location?.longitude ?? 0,
          category,
        }));
      } catch (err: any) {
        if (attempt === 0 && (err.response?.status === 429 || err.response?.status >= 500)) {
          this.logger.warn(`NearbySearch attempt ${attempt + 1} failed for ${category}, retrying...`);
          await this.sleep(1000);
          continue;
        }
        const apiMsg = err.response?.data?.error?.message || err.message;
        this.logger.error(`NearbySearch error for ${category}: ${apiMsg}`);
        return [];
      }
    }
    return [];
  }

  // ─── Step 3: Distance Matrix — Routes API (New) ────────────────────

  async distanceMatrix(
    originLat: number,
    originLng: number,
    destinations: { lat: number; lng: number }[],
    mode: 'driving' | 'walking' = 'driving',
  ): Promise<(DistanceResult | null)[]> {
    if (!destinations.length) return [];

    const travelMode = mode === 'driving' ? 'DRIVE' : 'WALK';

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body: Record<string, any> = {
          origins: [
            {
              waypoint: {
                location: {
                  latLng: { latitude: originLat, longitude: originLng },
                },
              },
            },
          ],
          destinations: destinations.map((d) => ({
            waypoint: {
              location: {
                latLng: { latitude: d.lat, longitude: d.lng },
              },
            },
          })),
          travelMode,
        };

        // TRAFFIC_AWARE only valid for DRIVE
        if (mode === 'driving') {
          body.routingPreference = 'TRAFFIC_AWARE';
        }

        const resp = await this.http.post(
          'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
          body,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask':
                'originIndex,destinationIndex,duration,distanceMeters,status,condition',
            },
          },
        );

        // Response is an array of RouteMatrixElement
        const elements: any[] = Array.isArray(resp.data) ? resp.data : [resp.data];

        const results: (DistanceResult | null)[] = destinations.map(() => null);

        for (const el of elements) {
          if (el.condition !== 'ROUTE_EXISTS') continue;
          const destIdx = el.destinationIndex ?? 0;
          const meters = el.distanceMeters ?? 0;
          const seconds = this.parseDuration(el.duration);

          results[destIdx] = {
            distanceMeters: meters,
            distanceText: this.formatDistance(meters),
            durationSeconds: seconds,
            durationText: this.formatDuration(seconds),
          };
        }

        return results;
      } catch (err: any) {
        if (attempt === 0 && (err.response?.status === 429 || err.response?.status >= 500)) {
          this.logger.warn(`DistanceMatrix attempt ${attempt + 1} failed, retrying...`);
          await this.sleep(1000);
          continue;
        }
        const apiMsg = err.response?.data?.error?.message || err.message;
        this.logger.error(`DistanceMatrix error: ${apiMsg}`);
        return destinations.map(() => null);
      }
    }
    return destinations.map(() => null);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /** Parse protobuf Duration string like "567s" → seconds */
  private parseDuration(duration: string | undefined): number {
    if (!duration) return 0;
    const match = String(duration).match(/^(\d+)s$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Format meters → "1,2 km" or "350 m" */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
    }
    return `${meters} m`;
  }

  /** Format seconds → "5 min" or "1 h 23 min" */
  private formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
