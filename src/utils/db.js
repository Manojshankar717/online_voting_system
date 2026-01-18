import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const DEMO_MODE = String(process.env.DEMO_MODE || 'false').toLowerCase() === 'true';
