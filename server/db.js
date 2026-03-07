const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        avatar TEXT,
        points INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        type TEXT,
        duration INTEGER,
        calories INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        meal TEXT,
        calories INTEGER,
        protein INTEGER,
        carbs INTEGER,
        fat INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        timestamp TEXT,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        price REAL,
        image TEXT
      )`);
    });
  }
});

module.exports = db;
