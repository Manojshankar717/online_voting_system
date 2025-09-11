import mysql from 'mysql2/promise'

const databaseUrl = process.env.DATABASE_URL
export const DEMO_MODE = String(process.env.DEMO_MODE || '').toLowerCase() === 'true'

export const pool = DEMO_MODE
	? null
	: mysql.createPool(databaseUrl)
