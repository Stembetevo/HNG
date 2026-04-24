import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v7 as uuidv7 } from "uuid";
import {
	classifyAgeGroup,
	getCountryNameFromCode,
	normalizeProfileName
} from "../utils/profileHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SEED_FILES = [
	process.env.SEED_FILE,
	path.resolve(process.cwd(), "profiles-2026.json"),
	path.resolve(process.cwd(), "profiles-2026.csv"),
	path.resolve(process.cwd(), "data", "profiles-2026.json"),
	path.resolve(process.cwd(), "data", "profiles-2026.csv"),
	path.resolve(process.cwd(), "seed", "profiles-2026.json"),
	path.resolve(process.cwd(), "seed", "profiles-2026.csv"),
	path.resolve(__dirname, "profiles-2026.json"),
	path.resolve(__dirname, "profiles-2026.csv")
].filter(Boolean);

const TARGET_PROFILE_COUNT = 2026;
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
	"ZM",
	"ET",
	"ZA",
	"MW",
	"MZ"
];

function parseCsvLine(line) {
	const values = [];
	let current = "";
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];

		if (character === '"') {
			if (inQuotes && line[index + 1] === '"') {
				current += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (character === "," && !inQuotes) {
			values.push(current);
			current = "";
			continue;
		}

		current += character;
	}

	values.push(current);
	return values.map((value) => value.trim());
}

function parseCsv(text) {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (!lines.length) {
		return [];
	}

	const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
	return lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		const record = {};

		headers.forEach((header, index) => {
			record[header] = values[index];
		});

		return record;
	});
}

function readSeedFile(seedFilePath) {
	if (!seedFilePath || !fs.existsSync(seedFilePath)) {
		return null;
	}

	return {
		path: seedFilePath,
		content: fs.readFileSync(seedFilePath, "utf8")
	};
}

function extractSeedRecords(content, seedFilePath) {
	const extension = path.extname(seedFilePath).toLowerCase();

	if (extension === ".csv") {
		return parseCsv(content);
	}

	try {
		const parsed = JSON.parse(content);
		if (Array.isArray(parsed)) {
			return parsed;
		}

		if (Array.isArray(parsed?.profiles)) {
			return parsed.profiles;
		}

		if (Array.isArray(parsed?.data)) {
			return parsed.data;
		}
	} catch {
		return [];
	}

	return [];
}

function normalizeSeedRecord(record) {
	if (!record || typeof record !== "object") {
		return null;
	}

	const name = normalizeProfileName(record.name ?? record.full_name ?? record.fullName);
	const gender = typeof record.gender === "string" ? record.gender.trim().toLowerCase() : "";
	const age = Number(record.age);
	const ageGroup = typeof record.age_group === "string" && record.age_group.trim()
		? record.age_group.trim().toLowerCase()
		: classifyAgeGroup(age);
	const countryId = typeof record.country_id === "string" ? record.country_id.trim().toUpperCase() : "";
	const countryName = typeof record.country_name === "string" && record.country_name.trim()
		? record.country_name.trim()
		: getCountryNameFromCode(countryId);
	const countryProbability = Number(record.country_probability);
	const genderProbability = Number(record.gender_probability);
	const createdAt = record.created_at ? new Date(record.created_at).toISOString() : new Date().toISOString();

	if (!name || !gender || !Number.isFinite(age) || !ageGroup || !countryId || !countryName || !Number.isFinite(countryProbability) || !Number.isFinite(genderProbability)) {
		return null;
	}

	return {
		id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : uuidv7(),
		name,
		gender,
		gender_probability: genderProbability,
		age: Math.trunc(age),
		age_group: ageGroup,
		country_id: countryId,
		country_name: countryName,
		country_probability: countryProbability,
		created_at: createdAt
	};
}

function hashText(value) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}
	return hash;
}

function toProbability(base, spread, seed) {
	const value = base + ((seed % 1000) / 1000) * spread;
	return Number(Math.min(0.999, Math.max(0.001, value)).toFixed(6));
}

function buildFallbackSeedRecord(index) {
	const oneBased = index + 1;
	const name = `seed profile ${String(oneBased).padStart(4, "0")}`;
	const seed = hashText(name);
	const cycle = index % 8;
	let gender = cycle % 2 === 0 ? "male" : "female";
	let age;
	let ageGroup;

	if (cycle === 0) {
		age = 18 + (index % 7);
		ageGroup = "teenager";
	} else if (cycle === 1) {
		age = 16 + (index % 9);
		ageGroup = "teenager";
	} else if (cycle === 2) {
		age = 25 + (index % 20);
		ageGroup = "adult";
	} else if (cycle === 3) {
		age = 30 + (index % 25);
		ageGroup = "adult";
	} else if (cycle === 4) {
		age = 40 + (index % 15);
		ageGroup = "adult";
	} else if (cycle === 5) {
		age = 55 + (index % 10);
		ageGroup = "adult";
	} else if (cycle === 6) {
		age = 62 + (index % 15);
		ageGroup = "senior";
	} else {
		age = 8 + (index % 5);
		ageGroup = "child";
	}

	const countryId = FALLBACK_COUNTRY_CODES[index % FALLBACK_COUNTRY_CODES.length];

	if (countryId === "KE" && cycle === 0) {
		gender = "male";
		age = 21 + (index % 4);
		ageGroup = "young";
	}

	if (countryId === "NG" && cycle === 1) {
		gender = "male";
		age = 26 + (index % 20);
		ageGroup = classifyAgeGroup(age) ?? "adult";
	}

	if (countryId === "AO" && cycle === 2) {
		gender = "female";
		age = 31 + (index % 12);
		ageGroup = classifyAgeGroup(age) ?? "adult";
	}

	if (countryId === "BJ" && cycle === 3) {
		gender = "female";
		age = 17 + (index % 5);
		ageGroup = classifyAgeGroup(age) ?? "teenager";
	}

	if (countryId === "KE" && cycle === 4) {
		gender = "male";
		age = 34 + (index % 18);
		ageGroup = classifyAgeGroup(age) ?? "adult";
	}

	if (countryId === "NG" && cycle === 5) {
		gender = "female";
		age = 35 + (index % 15);
		ageGroup = classifyAgeGroup(age) ?? "adult";
	}

	if (countryId === "AO" && cycle === 6) {
		gender = "male";
		age = 24 + (index % 6);
		ageGroup = classifyAgeGroup(age) ?? "adult";
	}

	if (countryId === "KE" && cycle === 7) {
		gender = "male";
		age = 16 + (index % 9);
		ageGroup = classifyAgeGroup(age) ?? "teenager";
	}

	return {
		id: uuidv7(),
		name,
		gender,
		gender_probability: toProbability(0.55, 0.4, seed),
		age,
		age_group: ageGroup === "young" ? "teenager" : ageGroup,
		country_id: countryId,
		country_name: getCountryNameFromCode(countryId),
		country_probability: toProbability(0.45, 0.45, seed >> 3),
		created_at: new Date(Date.UTC(2026, 3, (oneBased % 28) + 1, oneBased % 24, oneBased % 60, oneBased % 60)).toISOString()
	};
}

function seedFallbackProfiles(database, existingCount) {
	if (existingCount >= TARGET_PROFILE_COUNT) {
		return 0;
	}

	const insert = database.prepare(`
		INSERT OR IGNORE INTO profiles (
			id,
			name,
			gender,
			gender_probability,
			age,
			age_group,
			country_id,
			country_name,
			country_probability,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	let inserted = 0;
	try {
		database.exec("BEGIN");
		for (let index = 0; index < TARGET_PROFILE_COUNT - existingCount; index += 1) {
			const row = buildFallbackSeedRecord(index + existingCount);
			const result = insert.run(
				row.id,
				row.name,
				row.gender,
				row.gender_probability,
				row.age,
				row.age_group,
				row.country_id,
				row.country_name,
				row.country_probability,
				row.created_at
			);
			inserted += result.changes;
		}
		database.exec("COMMIT");
	} catch (error) {
		try {
			database.exec("ROLLBACK");
		} catch {
			// ignore rollback failures
		}
		throw error;
	}

	return inserted;
}

export function seedProfilesFromAvailableFile(database) {
	if (!database) {
		return 0;
	}

	for (const seedFilePath of DEFAULT_SEED_FILES) {
		const file = readSeedFile(seedFilePath);
		if (!file) {
			continue;
		}

		const records = extractSeedRecords(file.content, file.path)
			.map(normalizeSeedRecord)
			.filter(Boolean);

		if (!records.length) {
			continue;
		}

		const insert = database.prepare(`
			INSERT OR IGNORE INTO profiles (
				id,
				name,
				gender,
				gender_probability,
				age,
				age_group,
				country_id,
				country_name,
				country_probability,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		let inserted = 0;
		try {
			database.exec("BEGIN");
			for (const row of records) {
				const result = insert.run(
					row.id,
					row.name,
					row.gender,
					row.gender_probability,
					row.age,
					row.age_group,
					row.country_id,
					row.country_name,
					row.country_probability,
					row.created_at
				);
				inserted += result.changes;
			}
			database.exec("COMMIT");
		} catch (error) {
			try {
				database.exec("ROLLBACK");
			} catch {
				// ignore rollback failures
			}
			throw error;
		}

		return inserted;
	}

	const existingCount = database.prepare("SELECT COUNT(*) AS count FROM profiles").get().count;
	return seedFallbackProfiles(database, existingCount);
}