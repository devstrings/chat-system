import asyncHandler from "express-async-handler";
import { appSettingService } from "#services";

export const requireFeatureEnabled = (feature) =>
  asyncHandler(async (_req, res, next) => {
    const settings = await getSettings();
    const enabled = settings?.aiFeatures?.[feature]?.enabled;
    if (!enabled) {
      return res.status(403).json({ message: `${feature} feature is disabled` });
    }
    next();
  });
