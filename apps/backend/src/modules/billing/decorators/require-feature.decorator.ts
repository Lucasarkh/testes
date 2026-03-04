/**
 * @deprecated Feature-based gating has been removed.
 * All features are now included with each project.
 * Use BillingGuard to check billing status only.
 *
 * This file is kept for backward compatibility but has no effect.
 */
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * @deprecated No-op decorator. Feature-based billing has been replaced
 * with per-project billing. Use BillingGuard for billing status checks.
 */
export const RequireFeature = (_feature: string) =>
  SetMetadata(REQUIRED_FEATURE_KEY, _feature);
