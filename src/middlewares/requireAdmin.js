import { DEMO_MODE } from '../utils/db.js'

export function requireAdmin(req, res, next) {
	if (DEMO_MODE) return next()
	if (req.user?.role === 'admin') return next()
	return res.status(403).json({ message: 'Admin only' })
}




