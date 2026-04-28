import { Router } from "express";
import { classifyName } from "../controllers/controller.js";
import {
	createProfile,
	deleteProfile,
	getProfile,
	listAllProfiles,
	searchProfiles,
	exportProfiles
} from "../controllers/ProfileController.js";
import { authMiddleware, requireRole } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrf.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Apply rate limiting to all /api routes
router.use(apiLimiter);

// Public endpoints (no auth required)
router.get("/classify", classifyName);

// Protected endpoints (authentication required)
router.post("/profiles", authMiddleware, requireCsrf, requireRole("admin"), createProfile);
router.get("/profiles/search", authMiddleware, searchProfiles);
router.get("/profiles/export", authMiddleware, requireRole("admin"),exportProfiles);
router.get("/profiles", authMiddleware, listAllProfiles);
router.get("/profiles/:id", authMiddleware, getProfile);
router.delete("/profiles/:id", authMiddleware, requireCsrf, requireRole("admin"), deleteProfile);

export default router;