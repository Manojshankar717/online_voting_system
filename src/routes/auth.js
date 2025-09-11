import { Router } from 'express'
import { loginController, registerController, requestOtpController, verifyOtpController } from '../controllers/authController.js'
import { authLimiter } from '../middlewares/rateLimiter.js'
import { validate, registerSchema, loginSchema, requestOtpSchema, verifyOtpSchema } from '../middlewares/validation.js'

export const router = Router()
router.post('/register', authLimiter, validate(registerSchema), registerController)
router.post('/login', authLimiter, validate(loginSchema), loginController)
router.post('/request-otp', authLimiter, validate(requestOtpSchema), requestOtpController)
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtpController)
