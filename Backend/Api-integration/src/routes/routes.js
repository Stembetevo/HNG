import { Router } from "express";
import { classifyName } from "../controllers/controller.js";
import {
	createProfile,
	deleteProfile,
	getProfile,
	listAllProfiles,
	searchProfiles
} from "../controllers/ProfileController.js";

const router = Router();

router.get("/classify", classifyName);
router.post("/profiles", createProfile);
router.get("/profiles/search", searchProfiles);
router.get("/profiles", listAllProfiles);
router.get("/profiles/:id", getProfile);
router.delete("/profiles/:id", deleteProfile);

export default router;