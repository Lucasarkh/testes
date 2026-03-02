import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infra/db/prisma.service';
import { GoogleMapsService, NearbyPlace } from '@/infra/google/google-maps.service';

const CATEGORY_LABELS: Record<string, string> = {
  school: 'Escolas',
  supermarket: 'Supermercados',
  pharmacy: 'Farmácias',
  hospital: 'Hospitais',
  park: 'Parques',
  restaurant: 'Restaurantes',
  gym: 'Academias',
  shopping_mall: 'Shopping Centers',
};

export interface NearbyPublicResponse {
  enabled: boolean;
  center: { lat: number; lng: number } | null;
  radiusMeters: number;
  items: {
    category: string;
    categoryLabel: string;
    name: string;
    distanceLabel: string;
    drivingLabel: string | null;
    walkingLabel: string | null;
    shortAddress: string | null;
    routeUrl: string;
  }[];
}

@Injectable()
export class NearbyService {
  private readonly logger = new Logger(NearbyService.name);

  constructor(
    private prisma: PrismaService,
    private googleMaps: GoogleMapsService,
    private config: ConfigService,
  ) {}

  /**
   * Get cached nearby items for a published project (public endpoint)
   */
  async getPublicNearby(projectSlug: string): Promise<NearbyPublicResponse> {
    const project = await this.prisma.project.findFirst({
      where: { slug: projectSlug, status: 'PUBLISHED' },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        nearbyEnabled: true,
        nearbyStatus: true,
        nearbyItems: {
          orderBy: { distanceMeters: 'asc' },
        },
      },
    });

    if (!project || !project.nearbyEnabled || project.nearbyStatus !== 'ok') {
      return { enabled: false, center: null, radiusMeters: 0, items: [] };
    }

    const radiusMeters = parseInt(this.config.get('NEARBY_RADIUS_METERS') || '3000', 10);

    return {
      enabled: true,
      center:
        project.latitude && project.longitude
          ? { lat: project.latitude, lng: project.longitude }
          : null,
      radiusMeters,
      items: project.nearbyItems.map((item) => ({
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.category] || item.category,
        name: item.name,
        distanceLabel: item.distanceLabel,
        drivingLabel: item.drivingLabel,
        walkingLabel: item.walkingLabel,
        shortAddress: item.shortAddress,
        routeUrl: item.routeUrl,
      })),
    };
  }

  /**
   * Main generation pipeline: geocode → nearby search → distance matrix → persist
   */
  async generateNearby(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, address: true, latitude: true, longitude: true },
    });

    if (!project) {
      this.logger.warn(`Project ${projectId} not found`);
      return;
    }

    if (!project.address) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          nearbyStatus: 'error',
          nearbyErrorMessage: 'Endereço não informado',
          nearbyGeneratedAt: new Date(),
        },
      });
      return;
    }

    try {
      // Step 1: Geocode
      this.logger.log(`Geocoding address for project ${projectId}`);
      const geo = await this.googleMaps.geocode(project.address);

      if (!geo) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            nearbyStatus: 'error',
            nearbyErrorMessage: 'Não foi possível geocodificar o endereço',
            nearbyGeneratedAt: new Date(),
          },
        });
        return;
      }

      // Save lat/lng
      await this.prisma.project.update({
        where: { id: projectId },
        data: { latitude: geo.lat, longitude: geo.lng },
      });

      // Step 2: Nearby Search per category
      const categoriesStr =
        this.config.get('NEARBY_CATEGORIES') ||
        'school,supermarket,pharmacy,hospital,park,restaurant,gym,shopping_mall';
      const categories = categoriesStr.split(',').map((c: string) => c.trim());
      const radiusMeters = parseInt(this.config.get('NEARBY_RADIUS_METERS') || '3000', 10);
      const maxPerCategory = parseInt(this.config.get('NEARBY_MAX_RESULTS_PER_CATEGORY') || '2', 10);
      const maxTotal = parseInt(this.config.get('NEARBY_MAX_TOTAL_RESULTS') || '8', 10);
      const walkingEnabled = this.config.get('NEARBY_WALKING_MODE_ENABLED') !== 'false';

      // Over-fetch from API: request 2x per category (capped at 20) so that
      // any places filtered out by distance-matrix still leave enough results.
      const apiFetchCount = Math.min(maxPerCategory * 2, 20);
      this.logger.log(`Searching nearby places in ${categories.length} categories (fetching up to ${apiFetchCount} per category)`);

      const allPlaces: NearbyPlace[] = [];
      for (const category of categories) {
        const places = await this.googleMaps.nearbySearch(
          geo.lat,
          geo.lng,
          category,
          radiusMeters,
          apiFetchCount,
        );
        this.logger.log(`  ${category}: ${places.length} results from API`);
        allPlaces.push(...places);
      }

      if (!allPlaces.length) {
        // Clear old items and mark as ok but empty
        await this.prisma.nearbyItem.deleteMany({ where: { projectId } });
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            nearbyStatus: 'ok',
            nearbyErrorMessage: null,
            nearbyGeneratedAt: new Date(),
          },
        });
        return;
      }

      // Step 3: Distance Matrix (driving)
      this.logger.log(`Computing distances for ${allPlaces.length} places`);
      const drivingDistances = await this.googleMaps.distanceMatrix(
        geo.lat,
        geo.lng,
        allPlaces.map((p) => ({ lat: p.lat, lng: p.lng })),
        'driving',
      );

      // Optionally compute walking distances
      let walkingDistances: (ReturnType<typeof this.googleMaps.distanceMatrix> extends Promise<infer T> ? T : never) | null = null;
      if (walkingEnabled) {
        walkingDistances = await this.googleMaps.distanceMatrix(
          geo.lat,
          geo.lng,
          allPlaces.map((p) => ({ lat: p.lat, lng: p.lng })),
          'walking',
        );
      }

      // Step 4: Normalize, sort, apply limits
      type EnrichedPlace = NearbyPlace & {
        distanceMeters: number;
        durationSecondsDriving: number | null;
        durationSecondsWalking: number | null;
        distanceLabel: string;
        drivingLabel: string | null;
        walkingLabel: string | null;
        routeUrl: string;
      };

      const enriched: EnrichedPlace[] = allPlaces
        .map((place, i): EnrichedPlace | null => {
          const driving = drivingDistances[i];
          const walking = walkingDistances?.[i] || null;

          if (!driving) return null;

          return {
            ...place,
            distanceMeters: driving.distanceMeters,
            durationSecondsDriving: driving.durationSeconds,
            durationSecondsWalking: walking?.durationSeconds ?? null,
            distanceLabel: driving.distanceText,
            drivingLabel: driving.durationText,
            walkingLabel: walking?.durationText ?? null,
            routeUrl: `https://www.google.com/maps/dir/?api=1&origin=${geo.lat},${geo.lng}&destination=${place.lat},${place.lng}`,
          };
        })
        .filter((p): p is EnrichedPlace => p !== null)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

      // Apply per-category + total limits
      const selected: EnrichedPlace[] = [];
      const categoryCount: Record<string, number> = {};

      for (const place of enriched) {
        if (selected.length >= maxTotal) break;
        const count = categoryCount[place.category] || 0;
        if (count >= maxPerCategory) continue;
        selected.push(place);
        categoryCount[place.category] = count + 1;
      }

      // Step 5: Persist
      this.logger.log(`Persisting ${selected.length} nearby items for project ${projectId}`);

      await this.prisma.$transaction(async (tx) => {
        await tx.nearbyItem.deleteMany({ where: { projectId } });

        for (const item of selected) {
          await tx.nearbyItem.create({
            data: {
              projectId,
              category: item.category,
              placeId: item.placeId,
              name: item.name,
              shortAddress: item.vicinity || null,
              lat: item.lat,
              lng: item.lng,
              distanceMeters: item.distanceMeters,
              durationSecondsDriving: item.durationSecondsDriving,
              durationSecondsWalking: item.durationSecondsWalking,
              distanceLabel: item.distanceLabel,
              drivingLabel: item.drivingLabel,
              walkingLabel: item.walkingLabel,
              routeUrl: item.routeUrl,
            },
          });
        }

        await tx.project.update({
          where: { id: projectId },
          data: {
            nearbyStatus: 'ok',
            nearbyErrorMessage: null,
            nearbyGeneratedAt: new Date(),
          },
        });
      });

      this.logger.log(`Nearby generation completed for project ${projectId}`);
    } catch (err: any) {
      this.logger.error(`Nearby generation failed for project ${projectId}: ${err.message}`);
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          nearbyStatus: 'error',
          nearbyErrorMessage: err.message?.substring(0, 500) || 'Erro desconhecido',
          nearbyGeneratedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get nearby status for admin panel
   */
  async getNearbyStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        nearbyEnabled: true,
        nearbyStatus: true,
        nearbyErrorMessage: true,
        nearbyGeneratedAt: true,
        latitude: true,
        longitude: true,
        nearbyItems: {
          orderBy: { distanceMeters: 'asc' },
          select: {
            category: true,
            name: true,
            distanceLabel: true,
            drivingLabel: true,
            walkingLabel: true,
            routeUrl: true,
          },
        },
      },
    });

    return {
      enabled: project?.nearbyEnabled ?? true,
      status: project?.nearbyStatus || null,
      errorMessage: project?.nearbyErrorMessage || null,
      generatedAt: project?.nearbyGeneratedAt || null,
      hasCoordinates: !!(project?.latitude && project?.longitude),
      itemCount: project?.nearbyItems?.length || 0,
      items: (project?.nearbyItems || []).map((item) => ({
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.category] || item.category,
        name: item.name,
        distanceLabel: item.distanceLabel,
        drivingLabel: item.drivingLabel,
        walkingLabel: item.walkingLabel,
        routeUrl: item.routeUrl,
      })),
    };
  }

  /**
   * Toggle nearby section on/off
   */
  async toggleNearby(projectId: string, enabled: boolean) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { nearbyEnabled: enabled },
      select: { nearbyEnabled: true },
    });
  }
}
