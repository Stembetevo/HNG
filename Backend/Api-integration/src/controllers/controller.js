import { fetchGenderPrediction } from "../services/service.js";
import { statusSuccess, statusError } from "../utils/response.js";

export async function classifyName(req, res, next) {
    try {
        const { name } = req.query;

        if (name === undefined || name === null) {
            return statusError(res, "name query parameter is required", 400);
        }

        if (Array.isArray(name) || typeof name !== "string") {
            return statusError(res, "name must be a string", 422);
        }

        const cleanedName = name.trim();

        if (!cleanedName) {
            return statusError(res, "name query parameter cannot be empty", 400);
        }

        const apiData = await fetchGenderPrediction(cleanedName);
        const { gender, probability, count } = apiData;

        if (gender === null || count === 0) {
            return statusError(
                res,
                "No prediction available for the provided name",
                200
            );
        }

        const sample_size = count;
        const is_confident = probability >= 0.7 && sample_size >= 100;
        const processed_at = new Date().toISOString();

        return statusSuccess(res, {
            name: cleanedName,
            gender,
            probability,
            sample_size,
            is_confident,
            processed_at
        });
    } catch (error) {
        if (error.code === "ECONNABORTED" || error.response || error.request) {
            return statusError(
                res,
                "Failed to fetch prediction from upstream service",
                502
            );
        }

        return next(error);
    }
}