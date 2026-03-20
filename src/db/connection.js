const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  uri: process.env.MYSQL_PUBLIC_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query("SELECT 1");
    console.log("Conexión a base de datos exitosa");
    connection.release();
  } catch (error) {
    console.error("Error al conectar:", error.message);
  }
};

testConnection();

module.exports = pool;