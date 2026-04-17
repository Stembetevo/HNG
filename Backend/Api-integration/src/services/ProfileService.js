import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import {
    findProfileById,
    findProfileByNormalizedName,
    insertProfile,
    listProfiles,
    deleteProfileById
} from "../repositories/profileRepo.js";

const AGIFY_URL = "https://api.agify.io";
const NATIONALIZE_URL = "https://api.nationalize.io";
const GENDERIZE_URL = "https://api.genderize.io";

const httpClient = axios.create({
    timeout: 5000
});

function normalizeName(name) {
    if (typeof name !== "string") {
        return "";
    }

    return name.trim().toLowerCase();
}

function classifyAgeGroup(age) {
    if (!Number.isFinite(age) || age < 0 || age > 120) {
        return null;
    }

    if (age <= 12) {
        return "child";
    }
    if (age <= 19) {
        return "teenager";
    }
    if (age <= 59) {
        return "adult";
    }
    return "senior";
}

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
        error.message.includes("UNIQUE constraint failed: profiles.normalized_name")
    );
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

    const normalized_name = normalizeName(name);
    const age = agifyData.age;
    const ageGroup = classifyAgeGroup(age);

    if (!ageGroup) {
        throw buildExternalInvalidError("Agify");
    }

    return {
        id: uuidv7(),
        normalized_name,
        name: normalized_name,
        gender,
        gender_probability: genderProbability,
        sample_size: genderCount,
        age,
        age_group: ageGroup,
        country_id: topCountry.country_id,
        country_probability: topCountry.probability,
        created_at: new Date().toISOString()
    };
}

export async function createOrGetProfileByName(name) {
    const normalizedName = normalizeName(name);
    const existing = findProfileByNormalizedName(normalizedName);

    if (existing) {
        return {
            alreadyExists: true,
            profile: existing
        };
    }

    const [genderizeData, agifyData, nationalizeData] = await Promise.all([
        fetchApiData(GENDERIZE_URL, "Genderize", normalizedName),
        fetchApiData(AGIFY_URL, "Agify", normalizedName),
        fetchApiData(NATIONALIZE_URL, "Nationalize", normalizedName)
    ]);

    const profile = validateAndBuildProfilePayload(
        normalizedName,
        genderizeData,
        agifyData,
        nationalizeData
    );

    try {
        insertProfile(profile);
    } catch (error) {
        if (isDuplicateNormalizedNameError(error)) {
            const duplicate = findProfileByNormalizedName(normalizedName);

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

export async function getProfileById(id) {
    return findProfileById(id);
}

export async function getProfiles(filters) {
    return listProfiles(filters);
}

export async function removeProfileById(id) {
    return deleteProfileById(id);
}