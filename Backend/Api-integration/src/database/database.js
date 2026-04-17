import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.VERCEL
	? path.join("/tmp", "profiles.db")
	: path.join(__dirname, "profiles.db");

const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
	CREATE TABLE IF NOT EXISTS profiles (
		id TEXT PRIMARY KEY,
		normalized_name TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		gender TEXT NOT NULL,
		gender_probability REAL NOT NULL,
		sample_size INTEGER NOT NULL,
		age INTEGER NOT NULL,
		age_group TEXT NOT NULL,
		country_id TEXT NOT NULL,
		country_probability REAL NOT NULL,
		created_at TEXT NOT NULL
	);
`);

export default db;