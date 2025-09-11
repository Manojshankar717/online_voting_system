import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { DEMO_MODE, pool } from '../utils/db.js'
import { writeAudit } from '../utils/audit.js'
import { findDemoUserByEmail, createDemoUser } from '../utils/demoStore.js'
import nodemailer from 'nodemailer'
import { generateOtp, saveOtp, verifyOtp } from '../utils/otp.js'

export async function registerController(req, res) {
	const { email, password, name, role = 'voter' } = req.body || {}
	if (!email || !password || !name) return res.status(400).json({ message: 'Missing fields' })
	if (!['voter', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
	
	if (DEMO_MODE) {
		const exists = findDemoUserByEmail(email)
		if (exists) return res.status(409).json({ message: 'Email already registered' })
		const hash = await bcrypt.hash(password, 12)
		createDemoUser({ name, email, password_hash: hash, role })
		await writeAudit('user.register', { email, role }, null)
		return res.status(201).json({ message: 'Registered' })
	}
	const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
	if (existing[0]) return res.status(409).json({ message: 'Email already registered' })
	const hash = await bcrypt.hash(password, 12)
	await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', [name, email, hash, role])
	await writeAudit('user.register', { email, role }, null)
	return res.status(201).json({ message: 'Registered' })
}

export async function loginController(req, res) {
	const { email, password } = req.body || {}
	if (!email || !password) return res.status(400).json({ message: 'Missing fields' })
	if (DEMO_MODE) {
		const user = findDemoUserByEmail(email)
		if (!user) return res.status(401).json({ message: 'Invalid credentials' })
		const ok = await bcrypt.compare(password, user.password_hash)
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
		const token = jwt.sign({ sub: user.id, role: user.role || 'voter' }, process.env.JWT_SECRET, { expiresIn: '2h' })
		return res.json({ token })
	}
	const [rows] = await pool.query('SELECT id, password_hash, role FROM users WHERE email = ?', [email])
	const user = rows[0]
	if (!user) return res.status(401).json({ message: 'Invalid credentials' })
	const ok = await bcrypt.compare(password, user.password_hash)
	if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
	const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' })
	await writeAudit('user.login', { email }, user.id)
	return res.json({ token })
}

export async function requestOtpController(req, res) {
	const { email } = req.body || {}
	if (!email) return res.status(400).json({ message: 'Missing email' })
	const user = DEMO_MODE ? findDemoUserByEmail(email) : (await pool.query('SELECT id, role FROM users WHERE email = ?', [email]))[0][0]
	if (!user) return res.status(404).json({ message: 'No account for email' })
	const code = generateOtp()
	saveOtp(email, code)
	try {
		if (process.env.MAIL_HOST) {
			const transporter = nodemailer.createTransport({
				host: process.env.MAIL_HOST,
				port: Number(process.env.MAIL_PORT || 587),
				secure: false,
				auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
			})
			await transporter.sendMail({
				from: process.env.MAIL_FROM || 'no-reply@example.com',
				to: email,
				subject: 'Your login code',
				text: `Your OTP is ${code}`,
			})
		}
		return res.json({ message: 'OTP sent' })
	} catch (e) {
		return res.status(500).json({ message: 'Failed to send OTP' })
	}
}

export async function verifyOtpController(req, res) {
	const { email, otp } = req.body || {}
	if (!email || !otp) return res.status(400).json({ message: 'Missing fields' })
	const ok = verifyOtp(email, String(otp))
	if (!ok) return res.status(401).json({ message: 'Invalid OTP' })
	const user = DEMO_MODE ? findDemoUserByEmail(email) : (await pool.query('SELECT id, role FROM users WHERE email = ?', [email]))[0][0]
	if (!user) return res.status(404).json({ message: 'No account for email' })
	const token = jwt.sign({ sub: user.id, role: user.role || 'voter' }, process.env.JWT_SECRET, { expiresIn: '2h' })
	return res.json({ token })
}
