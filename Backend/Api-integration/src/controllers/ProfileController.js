import {
    createOrGetProfileByName,
    getProfileById,
    getProfiles,
    removeProfileById
} from "../services/ProfileService.js";
import { statusError, statusSuccess } from "../utils/response.js";

function normalizeFilter(value) {
    if (value === undefined) {
        return undefined;
    }

    if (Array.isArray(value) || typeof value !== "string") {
        return null;
    }

    const cleaned = value.trim();
    return cleaned ? cleaned : null;
}

export async function createProfile(req, res, next) {
    try {
        const { name } = req.body ?? {};

        if (name === undefined || name === null) {
            return statusError(res, "name is required", 400);
        }

        if (Array.isArray(name) || typeof name !== "string") {
            return statusError(res, "name must be a string", 422);
        }

        const cleanedName = name.trim();

        if (!cleanedName) {
            return statusError(res, "name cannot be empty", 400);
        }

        const result = await createOrGetProfileByName(cleanedName);

        if (result.alreadyExists) {
            return res.status(200).json({
                status: "success",
                message: "Profile already exists",
                data: result.profile
            });
        }

        return statusSuccess(res, result.profile, 201);
    } catch (error) {
        if (error.statusCode === 502) {
            return statusError(res, error.message, 502);
        }

        return next(error);
    }
}

export async function getProfile(req, res, next) {
    try {
        const { id } = req.params;
        const profile = await getProfileById(id);

        if (!profile) {
            return statusError(res, "Profile not found", 404);
        }

        return statusSuccess(res, profile);
    } catch (error) {
        return next(error);
    }
}

export async function listAllProfiles(req, res, next) {
    try {
        const gender = normalizeFilter(req.query.gender);
        const country_id = normalizeFilter(req.query.country_id);
        const age_group = normalizeFilter(req.query.age_group);

        if (
            (req.query.gender !== undefined && gender === null) ||
            (req.query.country_id !== undefined && country_id === null) ||
            (req.query.age_group !== undefined && age_group === null)
        ) {
            return statusError(res, "Invalid query parameter type", 422);
        }

        const profiles = await getProfiles({ gender, country_id, age_group });

        return res.status(200).json({
            status: "success",
            count: profiles.length,
            data: profiles
        });
    } catch (error) {
        return next(error);
    }
}

export async function deleteProfile(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await removeProfileById(id);

        if (!deleted) {
            return statusError(res, "Profile not found", 404);
        }

        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
}

export const classifyProfile = createProfile;