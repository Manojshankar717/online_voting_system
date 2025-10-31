import bcrypt from 'bcrypt';
import { pool } from '../utils/db.js';
import nodemailer from 'nodemailer';
import { generateOtp, saveOtp } from '../utils/otp.js';

export async function registerController(req, res) {
  const { name, email, password, role = 'voter' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing[0]) return res.status(409).json({ message: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
    [name, email, hash, role]
  );

  // ----------------- Send OTP for Email Verification -----------------
  const otp = generateOtp();
  saveOtp(email, otp); // Your existing otp.js function

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Verify your email',
    text: `Your OTP to verify your account is: ${otp}`,
  });

  return res.status(201).json({ message: 'Registered! Check your email for verification OTP.' });
};
