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
		age: row.age,
		age_group: row.age_group,
		country_id: row.country_id,
		country_name: row.country_name,
		country_probability: row.country_probability,
		created_at: row.created_at
	};
};

export function findProfileByName(name) {
	const stmt = db.prepare(`SELECT * FROM profiles WHERE name = ? COLLATE NOCASE LIMIT 1`);

	return rowToProfile(stmt.get(name));
}

export function findProfileById(id) {
	const stmt = db.prepare(`SELECT * FROM profiles WHERE id = ? LIMIT 1`);
	return rowToProfile(stmt.get(id));
}

export function insertProfile(profile) {
	const stmt = db.prepare(`
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

	return stmt.run(
		profile.id,
		profile.name,
		profile.gender,
		profile.gender_probability,
		profile.age,
		profile.age_group,
		profile.country_id,
		profile.country_name,
		profile.country_probability,
		profile.created_at
	);
}

function buildWhereClause(filters = {}) {
	const clauses = [];
	const params = [];

	if (filters.gender) {
		clauses.push("gender = ? COLLATE NOCASE");
		params.push(filters.gender);
	}

	if (filters.country_id) {
		clauses.push("country_id = ? COLLATE NOCASE");
		params.push(filters.country_id);
	}

	if (filters.age_group) {
		clauses.push("age_group = ? COLLATE NOCASE");
		params.push(filters.age_group);
	}

	if (Number.isFinite(filters.min_age)) {
		clauses.push("age >= ?");
		params.push(filters.min_age);
	}

	if (Number.isFinite(filters.max_age)) {
		clauses.push("age <= ?");
		params.push(filters.max_age);
	}

	if (Number.isFinite(filters.min_gender_probability)) {
		clauses.push("gender_probability >= ?");
		params.push(filters.min_gender_probability);
	}

	if (Number.isFinite(filters.min_country_probability)) {
		clauses.push("country_probability >= ?");
		params.push(filters.min_country_probability);
	}

	return {
		whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
		params
	};
}

export function listProfiles({ filters = {}, sortBy = "created_at", order = "desc", page = 1, limit = 10 } = {}) {
	const sortColumn = {
		age: "age",
		created_at: "created_at",
		gender_probability: "gender_probability"
	}[sortBy] ?? "created_at";
	const sortDirection = order === "asc" ? "ASC" : "DESC";
	const offset = (page - 1) * limit;
	const { whereClause, params } = buildWhereClause(filters);
	const totalStmt = db.prepare(`SELECT COUNT(*) AS total FROM profiles ${whereClause}`);
	const total = totalStmt.get(...params).total;
	const stmt = db.prepare(`
		SELECT
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
		FROM profiles
		${whereClause}
		ORDER BY ${sortColumn} ${sortDirection}, id ${sortDirection}
		LIMIT ? OFFSET ?
	`);

	return {
		total,
		data: stmt.all(...params, limit, offset).map(rowToProfile)
	};
}

export function deleteProfileById(id) {
	const stmt = db.prepare(`DELETE FROM profiles WHERE id = ?`);
	return stmt.run(id).changes;
}
