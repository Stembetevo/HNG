import {
    createOrGetProfileByName,
    createOrGetProfileFromPayload,
    getProfileById,
    getProfiles,
    parseProfilesSearchQuery,
    removeProfileById
} from "../services/ProfileService.js";
import { statusError, statusSuccess } from "../utils/response.js";

const LIST_ALLOWED_KEYS = new Set([
    "gender",
    "age_group",
    "country_id",
    "min_age",
    "max_age",
    "min_gender_probability",
    "min_country_probability",
    "sort_by",
    "order",
    "page",
    "limit"
]);

const SEARCH_ALLOWED_KEYS = new Set(["q", "sort_by", "order", "page", "limit"]);
const SORT_COLUMNS = new Set(["age", "created_at", "gender_probability"]);
const ORDER_VALUES = new Set(["asc", "desc"]);
const AGE_GROUP_VALUES = new Set(["child", "teenager", "adult", "senior"]);

function hasUnknownKeys(query, allowedKeys) {
    return Object.keys(query ?? {}).some((key) => !allowedKeys.has(key));
}

function buildValidationError(type) {
    return {
        message: type === "empty" ? "Missing or empty parameter" : "Invalid query parameters",
        statusCode: type === "empty" ? 400 : 422
    };
}

function parseStringParam(query, key, { required = false, allowedValues = null } = {}) {
    const value = query[key];

    if (value === undefined) {
        return required ? { error: buildValidationError("empty") } : { value: undefined };
    }

    if (Array.isArray(value) || typeof value !== "string") {
        return { error: buildValidationError("type") };
    }

    const cleaned = value.trim();
    if (!cleaned) {
        return { error: buildValidationError("empty") };
    }

    if (allowedValues && !allowedValues.has(cleaned.toLowerCase())) {
        return { error: buildValidationError("type") };
    }

    return { value: allowedValues ? cleaned.toLowerCase() : cleaned };
}

function parseNumericParam(query, key, { integer = false, min = null, max = null } = {}) {
    const value = query[key];

    if (value === undefined) {
        return { value: undefined };
    }

    if (Array.isArray(value) || typeof value !== "string") {
        return { error: buildValidationError("type") };
    }

    const cleaned = value.trim();
    if (!cleaned) {
        return { error: buildValidationError("empty") };
    }

    const numberValue = Number(cleaned);
    if (!Number.isFinite(numberValue) || (integer && !Number.isInteger(numberValue))) {
        return { error: buildValidationError("type") };
    }

    if (min !== null && numberValue < min) {
        return { error: buildValidationError("type") };
    }

    if (max !== null && numberValue > max) {
        return { error: buildValidationError("type") };
    }

    return { value: numberValue };
}

function buildListFilters(query) {
    if (hasUnknownKeys(query, LIST_ALLOWED_KEYS)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    const filters = {};

    const gender = parseStringParam(query, "gender", {
        allowedValues: new Set(["male", "female"])
    });
    if (gender.error) {
        return { error: gender.error };
    }
    if (gender.value !== undefined) {
        filters.gender = gender.value;
    }

    const ageGroup = parseStringParam(query, "age_group", {
        allowedValues: AGE_GROUP_VALUES
    });
    if (ageGroup.error) {
        return { error: ageGroup.error };
    }
    if (ageGroup.value !== undefined) {
        filters.age_group = ageGroup.value;
    }

    const countryId = parseStringParam(query, "country_id");
    if (countryId.error) {
        return { error: countryId.error };
    }
    if (countryId.value !== undefined) {
        if (!/^[a-z]{2}$/i.test(countryId.value)) {
            return { error: { message: "Invalid query parameters", statusCode: 422 } };
        }
        filters.country_id = countryId.value.toUpperCase();
    }

    for (const key of ["min_age", "max_age"]) {
        const result = parseNumericParam(query, key, { integer: true, min: 0, max: 120 });
        if (result.error) {
            return { error: result.error };
        }
        if (result.value !== undefined) {
            filters[key] = result.value;
        }
    }

    for (const key of ["min_gender_probability", "min_country_probability"]) {
        const result = parseNumericParam(query, key, { min: 0, max: 1 });
        if (result.error) {
            return { error: result.error };
        }
        if (result.value !== undefined) {
            filters[key] = result.value;
        }
    }

    const page = parseNumericParam(query, "page", { integer: true, min: 1 });
    if (page.error) {
        return { error: page.error };
    }

    const limit = parseNumericParam(query, "limit", { integer: true, min: 1 });
    if (limit.error) {
        return { error: limit.error };
    }

    const sortBy = parseStringParam(query, "sort_by");
    if (sortBy.error) {
        return { error: sortBy.error };
    }
    if (sortBy.value !== undefined && !SORT_COLUMNS.has(sortBy.value)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    const order = parseStringParam(query, "order");
    if (order.error) {
        return { error: order.error };
    }
    if (order.value !== undefined && !ORDER_VALUES.has(order.value)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    return {
        filters,
        page: page.value ?? 1,
        limit: Math.min(limit.value ?? 10, 50),
        sortBy: sortBy.value ?? "created_at",
        order: order.value ?? "desc"
    };
}

function buildSearchQuery(query) {
    if (hasUnknownKeys(query, SEARCH_ALLOWED_KEYS)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    const searchQuery = parseStringParam(query, "q", { required: true });
    if (searchQuery.error) {
        return { error: searchQuery.error };
    }

    const page = parseNumericParam(query, "page", { integer: true, min: 1 });
    if (page.error) {
        return { error: page.error };
    }

    const limit = parseNumericParam(query, "limit", { integer: true, min: 1 });
    if (limit.error) {
        return { error: limit.error };
    }

    const sortBy = parseStringParam(query, "sort_by");
    if (sortBy.error) {
        return { error: sortBy.error };
    }
    if (sortBy.value !== undefined && !SORT_COLUMNS.has(sortBy.value)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    const order = parseStringParam(query, "order");
    if (order.error) {
        return { error: order.error };
    }
    if (order.value !== undefined && !ORDER_VALUES.has(order.value)) {
        return { error: { message: "Invalid query parameters", statusCode: 422 } };
    }

    const parsedFilters = parseProfilesSearchQuery(searchQuery.value);
    if (!parsedFilters) {
        return { error: { message: "Unable to interpret query", statusCode: 400 } };
    }

    return {
        filters: parsedFilters,
        page: page.value ?? 1,
        limit: Math.min(limit.value ?? 10, 50),
        sortBy: sortBy.value ?? "created_at",
        order: order.value ?? "desc"
    };
}

export async function createProfile(req, res, next) {
    try {
        const body = req.body ?? {};
        const { name } = body;

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

        const hasManualProfileFields = [
            "gender",
            "gender_probability",
            "age",
            "age_group",
            "country_id",
            "country_probability"
        ].some((key) => body[key] !== undefined);

        const result = hasManualProfileFields
            ? await createOrGetProfileFromPayload(body)
            : await createOrGetProfileByName(cleanedName);

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

        if (error.statusCode === 422) {
            return statusError(res, error.message, 422);
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
        const parsed = buildListFilters(req.query ?? {});
        if (parsed.error) {
            return statusError(res, parsed.error.message, parsed.error.statusCode);
        }

        const result = await getProfiles(parsed);

        return res.status(200).json({
            status: "success",
            page: parsed.page,
            limit: parsed.limit,
            total: result.total,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function searchProfiles(req, res, next) {
    try {
        const parsed = buildSearchQuery(req.query ?? {});
        if (parsed.error) {
            return statusError(res, parsed.error.message, parsed.error.statusCode);
        }

        const result = await getProfiles(parsed);

        return res.status(200).json({
            status: "success",
            page: parsed.page,
            limit: parsed.limit,
            total: result.total,
            data: result.data
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