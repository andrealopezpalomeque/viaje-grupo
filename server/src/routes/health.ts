import { Router, type Request, type Response } from 'express'

const router = Router()

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

export default router
