import express from 'express'
import { siteMediaController } from './site-media.controller'
import { requireAdmin } from '../../middlewares/requireAuth.middleware'

const router = express.Router()

router.get('/', siteMediaController.getSiteMedia)
router.post('/upload-signature', requireAdmin, siteMediaController.createUploadSignature)
router.put('/publish', requireAdmin, siteMediaController.publishMedia)
router.get('/log', requireAdmin, siteMediaController.getMediaLog)
router.get('/orphan-audit', requireAdmin, siteMediaController.auditOrphans)

export const siteMediaRoutes = router

