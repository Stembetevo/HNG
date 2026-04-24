
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE COLLATE NOCASE,
    gender VARCHAR(20) NOT NULL COLLATE NOCASE,
    gender_probability FLOAT NOT NULL,
    age INT NOT NULL,
    age_group VARCHAR(20) NOT NULL COLLATE NOCASE,
    country_id VARCHAR(2) NOT NULL COLLATE NOCASE,
    country_name VARCHAR(255) NOT NULL,
    country_probability FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
