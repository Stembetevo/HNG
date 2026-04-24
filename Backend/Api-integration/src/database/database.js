import { DatabaseSync } from "node:sqlite";
import { seedProfilesFromAvailableFile } from "./seedProfiles.js";
import path from "path";
import { fileURLToPath } from "url";
import { getCountryNameFromCode } from "../utils/profileHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.VERCEL
	? path.join("/tmp", "profiles.db")
	: path.join(__dirname, "profiles.db");

const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

function createProfilesTable() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS profiles (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE COLLATE NOCASE,
			gender TEXT NOT NULL COLLATE NOCASE,
			gender_probability REAL NOT NULL,
			age INTEGER NOT NULL,
			age_group TEXT NOT NULL COLLATE NOCASE,
			country_id TEXT NOT NULL COLLATE NOCASE,
			country_name TEXT NOT NULL,
			country_probability REAL NOT NULL,
			created_at TEXT NOT NULL
		);
	`);
}

function createProfilesIndexes() {
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
		CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON profiles(age_group);
		CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
		CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
		CREATE INDEX IF NOT EXISTS idx_profiles_gender_probability ON profiles(gender_probability);
		CREATE INDEX IF NOT EXISTS idx_profiles_country_probability ON profiles(country_probability);
		CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
	`);
}

function getProfilesTableColumns() {
	const tableExists = db
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles' LIMIT 1")
		.get();

	if (!tableExists) {
		return [];
	}

	return db.prepare("PRAGMA table_info(profiles)").all().map((column) => column.name);
}

function legacyProfilesTableExists() {
	return Boolean(
		db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles_legacy' LIMIT 1").get()
	);
}

function restoreLegacyProfilesTable() {
	if (!legacyProfilesTableExists()) {
		return;
	}

	const legacyRows = db.prepare("SELECT * FROM profiles_legacy").all();
	if (!legacyRows.length) {
		db.exec("DROP TABLE profiles_legacy;");
		return;
	}

	const insertProfile = db.prepare(`
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

	try {
		db.exec("BEGIN");
		for (const row of legacyRows) {
			insertProfile.run(
				row.id,
				row.name,
				row.gender,
				row.gender_probability,
				row.age,
				row.age_group,
				row.country_id,
				getCountryNameFromCode(row.country_id),
				row.country_probability,
				row.created_at ?? new Date().toISOString()
			);
		}
		db.exec("DROP TABLE profiles_legacy;");
		db.exec("COMMIT");
	} catch (error) {
		try {
			db.exec("ROLLBACK");
		} catch {
			// ignore rollback failures
		}
		throw error;
	}
}

function migrateProfilesTable() {
	const columns = getProfilesTableColumns();
	const requiredColumns = [
		"id",
		"name",
		"gender",
		"gender_probability",
		"age",
		"age_group",
		"country_id",
		"country_name",
		"country_probability",
		"created_at"
	];

	const schemaMatches =
		columns.length === requiredColumns.length &&
		requiredColumns.every((column) => columns.includes(column));

	if (!columns.length) {
		createProfilesTable();
		createProfilesIndexes();
		return;
	}

	if (schemaMatches) {
		createProfilesIndexes();
		restoreLegacyProfilesTable();
		return;
	}

	const legacyRows = db.prepare("SELECT * FROM profiles").all();
	db.exec("ALTER TABLE profiles RENAME TO profiles_legacy;");
	createProfilesTable();
	createProfilesIndexes();

	const insertProfile = db.prepare(`
		INSERT INTO profiles (
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

	try {
		db.exec("BEGIN");
		for (const row of legacyRows) {
			insertProfile.run(
				row.id,
				row.name,
				row.gender,
				row.gender_probability,
				row.age,
				row.age_group,
				row.country_id,
				getCountryNameFromCode(row.country_id),
				row.country_probability,
				row.created_at ?? new Date().toISOString()
			);
		}
		db.exec("DROP TABLE profiles_legacy;");
		db.exec("COMMIT");
	} catch (error) {
		try {
			db.exec("ROLLBACK");
		} catch {
			// ignore rollback failures
		}
		throw error;
	}
}

migrateProfilesTable();
seedProfilesFromAvailableFile(db);

export default db;