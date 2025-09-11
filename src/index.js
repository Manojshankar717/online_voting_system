import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { router as apiRouter } from './routes/index.js'
import { globalLimiter } from './middlewares/rateLimiter.js'

const app = express()

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Rate limiting
app.use(globalLimiter)

// CORS configuration
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Logging
app.use(morgan('combined'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/health', (_req, res) => {
	res.json({ 
    status: 'ok', 
    demo: String(process.env.DEMO_MODE || '').toLowerCase() === 'true',
    timestamp: new Date().toISOString()
  })
})

app.use('/api', apiRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message 
  })
})

const port = process.env.PORT || 4000
app.listen(port, () => {
	console.log(`🚀 API listening on port ${port}`)
  console.log(`📊 Demo mode: ${process.env.DEMO_MODE || 'false'}`)
  console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
})
