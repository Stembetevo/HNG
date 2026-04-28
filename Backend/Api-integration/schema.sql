
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

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    github_id TEXT NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'analyst',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
