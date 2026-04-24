const COUNTRY_CODE_TO_NAME = new Map();
const COUNTRY_NAME_TO_CODE = new Map();
const COUNTRY_ALIAS_TO_CODE = new Map();

function normalizeLookupText(value) {
	if (typeof value !== "string") {
		return "";
	}

	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function addCountryAlias(alias, code) {
	const normalizedAlias = normalizeLookupText(alias);

	if (!normalizedAlias || !code) {
		return;
	}

	COUNTRY_ALIAS_TO_CODE.set(normalizedAlias, code);
}

function buildCountryMaps() {
	if (typeof Intl.DisplayNames !== "function") {
		return;
	}

	const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	for (const first of alphabet) {
		for (const second of alphabet) {
			const code = `${first}${second}`;
			const countryName = displayNames.of(code);

			if (countryName && countryName.toUpperCase() !== code) {
				COUNTRY_CODE_TO_NAME.set(code, countryName);
				COUNTRY_NAME_TO_CODE.set(normalizeLookupText(countryName), code);
			}
		}
	}

	[
		["usa", "US"],
		["u s a", "US"],
		["u s", "US"],
		["united states", "US"],
		["united states of america", "US"],
		["uk", "GB"],
		["u k", "GB"],
		["united kingdom", "GB"],
		["great britain", "GB"],
		["britain", "GB"],
		["south korea", "KR"],
		["north korea", "KP"],
		["cote d ivoire", "CI"],
		["ivory coast", "CI"],
		["democratic republic of congo", "CD"],
		["dr congo", "CD"],
		["congo kinshasa", "CD"]
	].forEach(([alias, code]) => addCountryAlias(alias, code));
}

buildCountryMaps();

export function normalizeProfileName(value) {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim().replace(/\s+/g, " ");
}

export function classifyAgeGroup(age) {
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

export function getCountryNameFromCode(code) {
	if (typeof code !== "string") {
		return "";
	}

	const normalizedCode = code.trim().toUpperCase();
	if (!normalizedCode) {
		return "";
	}

	return COUNTRY_CODE_TO_NAME.get(normalizedCode) ?? normalizedCode;
}

export function getCountryCodeFromName(name) {
	if (typeof name !== "string") {
		return "";
	}

	const normalizedName = normalizeLookupText(name);
	if (!normalizedName) {
		return "";
	}

	return COUNTRY_ALIAS_TO_CODE.get(normalizedName) ?? COUNTRY_NAME_TO_CODE.get(normalizedName) ?? "";
}

function textContainsAlias(text, alias) {
	if (!alias) {
		return false;
	}

	const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?:^|\\s)${escapedAlias}(?:\\s|$)`).test(text);
}

function applyAgeRange(filters, minAge, maxAge) {
	if (Number.isFinite(minAge)) {
		filters.min_age = filters.min_age === undefined ? minAge : Math.max(filters.min_age, minAge);
	}

	if (Number.isFinite(maxAge)) {
		filters.max_age = filters.max_age === undefined ? maxAge : Math.min(filters.max_age, maxAge);
	}
}

function parseAgeConstraints(text, filters) {
	let recognized = false;

	if (/\byoung\b/.test(text)) {
		applyAgeRange(filters, 16, 24);
		recognized = true;
	}

	for (const ageGroup of ["child", "teenager", "adult", "senior"]) {
		if (new RegExp(`\\b${ageGroup}s?\\b`).test(text)) {
			filters.age_group = ageGroup;
			recognized = true;
		}
	}

	const betweenMatch = text.match(/\bbetween\s+(\d{1,3})\s+and\s+(\d{1,3})\b/);
	if (betweenMatch) {
		const first = Number(betweenMatch[1]);
		const second = Number(betweenMatch[2]);
		applyAgeRange(filters, Math.min(first, second), Math.max(first, second));
		recognized = true;
	}

	const ageRangePatterns = [
		{ regex: /\b(?:above|over|older than|at least|minimum|min(?:imum)?)\s*(\d{1,3})\b/g, kind: "min" },
		{ regex: /\b(?:below|under|younger than|at most|max(?:imum)?)\s*(\d{1,3})\b/g, kind: "max" },
		{ regex: /\b(\d{1,3})\s*(?:and above|or above|plus)\b/g, kind: "min" },
		{ regex: /\b(\d{1,3})\s*(?:and below|or below)\b/g, kind: "max" }
	];

	for (const { regex, kind } of ageRangePatterns) {
		for (const match of text.matchAll(regex)) {
			const age = Number(match[1]);
			if (!Number.isFinite(age)) {
				continue;
			}

			if (kind === "min") {
				applyAgeRange(filters, age, undefined);
			} else {
				applyAgeRange(filters, undefined, age);
			}

			recognized = true;
		}
	}

	return recognized;
}

function findCountryCodeInText(text) {
	const aliases = Array.from(COUNTRY_ALIAS_TO_CODE.entries()).sort((left, right) => right[0].length - left[0].length);

	for (const [alias, code] of aliases) {
		if (textContainsAlias(text, alias)) {
			return code;
		}
	}

	return "";
}

export function parseNaturalLanguageQuery(query) {
	const normalizedQuery = normalizeLookupText(query);
	if (!normalizedQuery) {
		return null;
	}

	const filters = {};
	let recognized = false;

	const hasMale = /\b(?:male|males|man|men|boy|boys)\b/.test(normalizedQuery);
	const hasFemale = /\b(?:female|females|woman|women|girl|girls)\b/.test(normalizedQuery);
	if (hasMale || hasFemale) {
		recognized = true;
		if (hasMale && !hasFemale) {
			filters.gender = "male";
		}
		if (hasFemale && !hasMale) {
			filters.gender = "female";
		}
	}

	if (parseAgeConstraints(normalizedQuery, filters)) {
		recognized = true;
	}

	const countryCode = findCountryCodeInText(normalizedQuery);
	if (countryCode) {
		filters.country_id = countryCode;
		recognized = true;
	}

	return recognized && Object.keys(filters).length ? filters : null;
}