import db from "../database/database.js";

const rowToProfile = (row) => {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		name: row.name,
		gender: row.gender,
		gender_probability: row.gender_probability,
		sample_size: row.sample_size,
		age: row.age,
		age_group: row.age_group,
		country_id: row.country_id,
		country_probability: row.country_probability,
		created_at: row.created_at
	};
};

export function findProfileByNormalizedName(normalizedName) {
	const stmt = db.prepare(
		`SELECT * FROM profiles WHERE normalized_name = ? LIMIT 1`
	);

	return rowToProfile(stmt.get(normalizedName));
}

export function findProfileById(id) {
	const stmt = db.prepare(`SELECT * FROM profiles WHERE id = ? LIMIT 1`);
	return rowToProfile(stmt.get(id));
}

export function insertProfile(profile) {
	const stmt = db.prepare(`
		INSERT INTO profiles (
			id,
			normalized_name,
			name,
			gender,
			gender_probability,
			sample_size,
			age,
			age_group,
			country_id,
			country_probability,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	stmt.run(
		profile.id,
		profile.normalized_name,
		profile.name,
		profile.gender,
		profile.gender_probability,
		profile.sample_size,
		profile.age,
		profile.age_group,
		profile.country_id,
		profile.country_probability,
		profile.created_at
	);
}

export function listProfiles(filters = {}) {
	const clauses = [];
	const params = [];

	if (filters.gender) {
		clauses.push("LOWER(gender) = LOWER(?)");
		params.push(filters.gender);
	}

	if (filters.country_id) {
		clauses.push("LOWER(country_id) = LOWER(?)");
		params.push(filters.country_id);
	}

	if (filters.age_group) {
		clauses.push("LOWER(age_group) = LOWER(?)");
		params.push(filters.age_group);
	}

	const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
	const stmt = db.prepare(`
		SELECT id, name, gender, age, age_group, country_id
		FROM profiles
		${whereClause}
		ORDER BY created_at DESC
	`);

	return stmt.all(...params);
}

export function deleteProfileById(id) {
	const stmt = db.prepare(`DELETE FROM profiles WHERE id = ?`);
	return stmt.run(id).changes;
}
