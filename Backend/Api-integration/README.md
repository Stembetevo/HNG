## Intelligence Query Engine

This backend exposes a queryable profiles API with:

- advanced filtering
- sorting
- pagination
- rule-based natural language search

Base URL: `/api`

## Endpoints

### Create Profile

`POST /api/profiles`

Accepted payload modes:

- name-only:

```json
{
	"name": "Amina"
}
```

This mode attempts upstream enrichment (`genderize`, `agify`, `nationalize`) and falls back to deterministic local profile generation when upstream is unavailable.

- full profile payload (useful for deterministic seeding):

```json
{
	"name": "Amina Bello",
	"gender": "female",
	"gender_probability": 0.93,
	"age": 28,
	"age_group": "adult",
	"country_id": "NG",
	"country_name": "Nigeria",
	"country_probability": 0.88
}
```

Name is unique (case-insensitive). Re-creating the same name returns the existing profile.

### List Profiles

`GET /api/profiles`

Supported filters (combinable):

- `gender`
- `age_group`
- `country_id`
- `min_age`
- `max_age`
- `min_gender_probability`
- `min_country_probability`

Sorting:

- `sort_by`: `age | created_at | gender_probability`
- `order`: `asc | desc`

Pagination:

- `page` default `1`
- `limit` default `10`, capped at `50`

Response envelope:

```json
{
	"status": "success",
	"page": 1,
	"limit": 10,
	"total": 2026,
	"data": []
}
```

### Natural Language Search

`GET /api/profiles/search?q=<query>`

Rule-based parsing only (no AI/LLM).

Examples:

- `young males` -> `gender=male + min_age=16 + max_age=24`
- `females above 30` -> `gender=female + min_age=30`
- `people from angola` -> `country_id=AO`
- `adult males from kenya` -> `gender=male + age_group=adult + country_id=KE`

`page`, `limit`, `sort_by`, and `order` also apply to search.

Uninterpretable queries return:

```json
{
	"status": "error",
	"message": "Unable to interpret query"
}
```

## Validation and Errors

All errors use:

```json
{
	"status": "error",
	"message": "<error message>"
}
```

Used status codes:

- `400` missing/empty parameter
- `422` invalid parameter type or invalid query values
- `404` profile not found
- `500` internal server failure
- `502` upstream dependency failure

## Data and Schema

`profiles` table fields:

- `id`
- `name` (unique)
- `gender`
- `gender_probability`
- `age`
- `age_group`
- `country_id`
- `country_name`
- `country_probability`
- `created_at`

Database startup includes schema migration and optional idempotent seed-file loading.


