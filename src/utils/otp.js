// Simple in-memory OTP store with expiration

const otpByEmail = new Map()

export function generateOtp() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

export function saveOtp(email, code, ttlMs = 5 * 60 * 1000) {
	const expiresAt = Date.now() + ttlMs
	otpByEmail.set(email.toLowerCase(), { code, expiresAt })
}

export function verifyOtp(email, code) {
	const entry = otpByEmail.get(email.toLowerCase())
	if (!entry) return false
	if (Date.now() > entry.expiresAt) {
		otpByEmail.delete(email.toLowerCase())
		return false
	}
	const ok = entry.code === code
	if (ok) otpByEmail.delete(email.toLowerCase())
	return ok
}





