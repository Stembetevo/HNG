const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(___dirname, 'mydb.db'))

db.pragma('foreign-keys = ON');

module.exports = db;