const fs = require('fs');
const path = require('path');
const pool = require('./connection');

const migrationsDir = path.join(__dirname, 'migrations');

const migrationFiles = [
  'users.sql',
];

const runMigrations = async () => {
  try {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log(` Migración ejecutada: ${file}`);
    }
    console.log(' Todas las migraciones completadas');
    process.exit(0);
  } catch (error) {
    console.error(' Error en migración:', error.message);
    process.exit(1);
  }
};

runMigrations();