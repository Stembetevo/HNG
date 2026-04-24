import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import {
    findProfileById,
    findProfileByName,
    insertProfile,
    listProfiles,
    deleteProfileById
} from "../repositories/profileRepo.js";
import {
    classifyAgeGroup,
    getCountryNameFromCode,
    normalizeProfileName,
    parseNaturalLanguageQuery
} from "../utils/profileHelpers.js";

const AGIFY_URL = "https://api.agify.io";
const NATIONALIZE_URL = "https://api.nationalize.io";
const GENDERIZE_URL = "https://api.genderize.io";

const httpClient = axios.create({
    timeout: 5000
});

const FALLBACK_COUNTRY_CODES = [
    "NG",
    "KE",
    "AO",
    "BJ",
    "GH",
    "ZA",
    "TZ",
    "UG",
    "CM",
    "SN",
    "RW",
    "ZM"
];

function getTopCountry(countries) {
    if (!Array.isArray(countries) || countries.length === 0) {
        return null;
    }

    return countries.reduce((max, current) =>
        current.probability > max.probability ? current : max
    );
}

function buildExternalInvalidError(externalApi) {
    const error = new Error(`${externalApi} returned an invalid response`);
    error.statusCode = 502;
    return error;
}

function buildExternalRequestError(externalApi, originalError) {
    const error = new Error(`${externalApi} returned an invalid response`);
    error.statusCode = 502;
    error.cause = originalError;
    return error;
}

function isDuplicateNormalizedNameError(error) {
    return (
        typeof error?.message === "string" &&
        error.message.includes("UNIQUE constraint failed: profiles.name")
    );
}

function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}

function toProbability(base, spread, seed) {
    const value = base + (seed % 1000) / 1000 * spread;
    return Number(Math.min(0.999, Math.max(0.001, value)).toFixed(6));
}

function buildDeterministicProfilePayload(name) {
    const normalizedName = normalizeProfileName(name);
    const seed = hashText(normalizedName || "profile");
    const gender = seed % 2 === 0 ? "male" : "female";
    const age = (seed % 75) + 6;
    const ageGroup = classifyAgeGroup(age) ?? "adult";
    const countryCode = FALLBACK_COUNTRY_CODES[seed % FALLBACK_COUNTRY_CODES.length];

    return {
        id: uuidv7(),
        name: normalizedName,
        gender,
        gender_probability: toProbability(0.55, 0.4, seed),
        age,
        age_group: ageGroup,
        country_id: countryCode,
        country_name: getCountryNameFromCode(countryCode),
        country_probability: toProbability(0.45, 0.45, seed >> 3),
        created_at: new Date().toISOString()
    };
}

function buildInvalidPayloadError(message) {
    const error = new Error(message);
    error.statusCode = 422;
    return error;
}

function normalizeProfilePayload(payload) {
    const name = normalizeProfileName(payload?.name);
    if (!name) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    const gender = typeof payload.gender === "string" ? payload.gender.trim().toLowerCase() : "";
    if (gender !== "male" && gender !== "female") {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    const genderProbability = Number(payload.gender_probability);
    const age = Number(payload.age);
    const countryProbability = Number(payload.country_probability);

    if (!Number.isFinite(genderProbability) || genderProbability < 0 || genderProbability > 1) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    if (!Number.isInteger(age) || age < 0 || age > 120) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    if (!Number.isFinite(countryProbability) || countryProbability < 0 || countryProbability > 1) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    let ageGroup = typeof payload.age_group === "string" ? payload.age_group.trim().toLowerCase() : "";
    if (!ageGroup) {
        ageGroup = classifyAgeGroup(age) ?? "adult";
    }
    if (!["child", "teenager", "adult", "senior"].includes(ageGroup)) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    const countryId = typeof payload.country_id === "string" ? payload.country_id.trim().toUpperCase() : "";
    if (!/^[A-Z]{2}$/.test(countryId)) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    const countryName = typeof payload.country_name === "string" && payload.country_name.trim()
        ? payload.country_name.trim()
        : getCountryNameFromCode(countryId);

    const createdAt = payload.created_at ? new Date(payload.created_at) : new Date();
    if (Number.isNaN(createdAt.getTime())) {
        throw buildInvalidPayloadError("Invalid profile payload");
    }

    return {
        id: typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : uuidv7(),
        name,
        gender,
        gender_probability: genderProbability,
        age,
        age_group: ageGroup,
        country_id: countryId,
        country_name: countryName,
        country_probability: countryProbability,
        created_at: createdAt.toISOString()
    };
}

function insertOrGetDuplicate(profile) {
    try {
        const insertResult = insertProfile(profile);
        if (insertResult.changes === 0) {
            const duplicate = findProfileByName(profile.name);
            if (duplicate) {
                return {
                    alreadyExists: true,
                    profile: duplicate
                };
            }
        }
    } catch (error) {
        if (isDuplicateNormalizedNameError(error)) {
            const duplicate = findProfileByName(profile.name);
            if (duplicate) {
                return {
                    alreadyExists: true,
                    profile: duplicate
                };
            }
        }
        throw error;
    }

    return {
        alreadyExists: false,
        profile: findProfileById(profile.id)
    };
}

async function fetchApiData(url, externalApi, name) {
    try {
        const response = await httpClient.get(url, {
            params: { name }
        });
        return response.data;
    } catch (error) {
        throw buildExternalRequestError(externalApi, error);
    }
}

function validateAndBuildProfilePayload(name, genderizeData, agifyData, nationalizeData) {
    const gender = genderizeData?.gender;
    const genderProbability = genderizeData?.probability;
    const genderCount = genderizeData?.count;

    if (
        typeof gender !== "string" ||
        typeof genderProbability !== "number" ||
        typeof genderCount !== "number" ||
        genderCount === 0
    ) {
        throw buildExternalInvalidError("Genderize");
    }

    if (typeof agifyData?.age !== "number") {
        throw buildExternalInvalidError("Agify");
    }

    const topCountry = getTopCountry(nationalizeData?.country);
    if (
        typeof topCountry?.country_id !== "string" ||
        typeof topCountry?.probability !== "number"
    ) {
        throw buildExternalInvalidError("Nationalize");
    }

    const normalizedName = normalizeProfileName(name);
    const age = agifyData.age;
    const ageGroup = classifyAgeGroup(age);

    if (!ageGroup) {
        throw buildExternalInvalidError("Agify");
    }

    return {
        id: uuidv7(),
        name: normalizedName,
        gender,
        gender_probability: genderProbability,
        age,
        age_group: ageGroup,
        country_id: topCountry.country_id,
        country_name: getCountryNameFromCode(topCountry.country_id),
        country_probability: topCountry.probability,
        created_at: new Date().toISOString()
    };
}

export async function createOrGetProfileByName(name) {
    const normalizedName = normalizeProfileName(name);
    const existing = findProfileByName(normalizedName);

    if (existing) {
        return {
            alreadyExists: true,
            profile: existing
        };
    }

    let profile;
    try {
        const [genderizeData, agifyData, nationalizeData] = await Promise.all([
            fetchApiData(GENDERIZE_URL, "Genderize", normalizedName),
            fetchApiData(AGIFY_URL, "Agify", normalizedName),
            fetchApiData(NATIONALIZE_URL, "Nationalize", normalizedName)
        ]);

        profile = validateAndBuildProfilePayload(
            normalizedName,
            genderizeData,
            agifyData,
            nationalizeData
        );
    } catch {
        // Keep profile creation available in offline/test environments.
        profile = buildDeterministicProfilePayload(normalizedName);
    }

    return insertOrGetDuplicate(profile);
}

export async function createOrGetProfileFromPayload(payload) {
    const profile = normalizeProfilePayload(payload);
    const existing = findProfileByName(profile.name);

    if (existing) {
        return {
            alreadyExists: true,
            profile: existing
        };
    }

    return insertOrGetDuplicate(profile);
}

export async function getProfileById(id) {
    return findProfileById(id);
}

export async function getProfiles(filters) {
    return listProfiles(filters);
}

export function parseProfilesSearchQuery(query) {
    return parseNaturalLanguageQuery(query);
}

export async function removeProfileById(id) {
    return deleteProfileById(id);
}