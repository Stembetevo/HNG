
CREATE TABLE Profiles(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_name VARCHAR(20) UNIQUE,
    name VARCHAR(20),
    gender VARCHAR(20),
    gender_probability FLOAT,
    sample_size FLOAT,
    age INT ,
    age_group VARCHAR(20) ,
    country_id INT,
    country_probability VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
