// src/controllers/authController.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../utils/db.js';
import { generateOtp, saveOtp, verifyOtp } from '../utils/otp.js';
import nodemailer from 'nodemailer';

// ----------------- Helper: send email -----------------
async function sendEmail(to, subject, text) {
  if (!process.env.MAIL_HOST) return;
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: false,
    auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    to,
    subject,
    text,
  });
}

// ----------------- Registration -----------------
export async function registerController(req, res) {
  const { name, email, password, role = 'voter' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing[0]) return res.status(409).json({ message: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
    [name, email, hash, role]
  );

  // Generate OTP for email verification
  const otp = generateOtp();
  saveOtp(email, otp);
  await sendEmail(email, 'Verify your email', `Your OTP to verify your account is: ${otp}`);

  return res.status(201).json({ message: 'Registered! Check your email for verification OTP.' });
}

// ----------------- Verify Email OTP -----------------
export async function verifyEmailOtpController(req, res) {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ message: 'Missing fields' });

  const ok = verifyOtp(email, String(otp));
  if (!ok) return res.status(401).json({ message: 'Invalid OTP' });

  await pool.query('UPDATE users SET is_verified = TRUE WHERE email = ?', [email]);
  return res.json({ message: 'Email verified successfully!' });
}

// ----------------- Request Login OTP -----------------
export async function requestLoginOtpController(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Missing email' });

  const [rows] = await pool.query('SELECT id, is_verified FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) return res.status(404).json({ message: 'No account found for email' });
  if (!user.is_verified) return res.status(403).json({ message: 'Email not verified' });

  const otp = generateOtp();
  saveOtp(email, otp);
  await sendEmail(email, 'Your login OTP', `Your OTP to login is: ${otp}`);

  return res.json({ message: 'Login OTP sent to your email.' });
}

// ----------------- Login -----------------
export async function loginController(req, res) {
  const { email, password, otp } = req.body || {};
  if (!email || (!password && !otp)) return res.status(400).json({ message: 'Missing credentials' });

  const [rows] = await pool.query('SELECT id, password_hash, role, is_verified, refresh_token FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.is_verified) return res.status(403).json({ message: 'Email not verified' });

  let isValid = false;
  if (password) isValid = await bcrypt.compare(password, user.password_hash);
  else if (otp) isValid = verifyOtp(email, String(otp));

  if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

  // Generate access & refresh tokens
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

  return res.json({ accessToken, refreshToken });
}

// ----------------- Refresh Token -----------------
export async function refreshTokenController(req, res) {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Missing refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [rows] = await pool.query('SELECT id, role, refresh_token FROM users WHERE id = ?', [payload.sub]);
    const user = rows[0];
    if (!user || user.refresh_token !== token) return res.status(403).json({ message: 'Invalid refresh token' });

    const accessToken = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
}
