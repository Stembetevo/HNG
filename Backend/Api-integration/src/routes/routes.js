import { Router } from "express";
import { classifyName } from "../controllers/controller.js";
import {
	createProfile,
	deleteProfile,
	getProfile,
	listAllProfiles
} from "../controllers/ProfileController.js";

const router = Router();

router.get("/classify", classifyName);
router.post("/profiles", createProfile);
router.get("/profiles/:id", getProfile);
router.get("/profiles", listAllProfiles);
router.delete("/profiles/:id", deleteProfile);

export default router;