import { Request, Response } from 'express'
import { siteMediaService, VersionConflictError } from './site-media.service'
import { uploadSignatureSchema, publishMediaSchema } from './site-media.schema'
import { asyncLocalStorage } from '../../services/als.service'
import { Miniuser } from '../../model/user.model'
import { loggerService } from '../../services/logger.service'

export const siteMediaController = {
    getSiteMedia,
    createUploadSignature,
    publishMedia,
    getMediaLog,
    auditOrphans
}

async function getSiteMedia(req: Request, res: Response) {
    try {
        const config = await siteMediaService.getSiteMedia()
        res.json(config)
    } catch (err: any) {
        loggerService.error('siteMediaController.getSiteMedia failed', err)
        res.status(500).json({ error: 'Failed to retrieve site media configuration' })
    }
}

async function createUploadSignature(req: Request, res: Response) {
    try {
        const validation = uploadSignatureSchema.safeParse(req.body)
        if (!validation.success) {
            return res.status(400).json({ 
                error: 'Invalid upload signature parameters', 
                details: validation.error.flatten() 
            })
        }

        const { slotId, resourceType } = validation.data
        const signatureData = await siteMediaService.generateUploadSignature(slotId, resourceType)
        res.json(signatureData)
    } catch (err: any) {
        loggerService.error('siteMediaController.createUploadSignature failed', err)
        res.status(500).json({ error: err.message || 'Failed to generate upload signature' })
    }
}

async function publishMedia(req: Request, res: Response) {
    try {
        const validation = publishMediaSchema.safeParse(req.body)
        if (!validation.success) {
            return res.status(400).json({ 
                error: 'Invalid publish media payload', 
                details: validation.error.flatten() 
            })
        }

        const { baseVersion, draftConfig } = validation.data
        const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
        const user = store?.loggedinUser || { fullname: 'Admin', username: 'admin', role: 'admin' }

        const result = await siteMediaService.publishMedia(baseVersion, draftConfig, user)
        res.json(result)
    } catch (err: any) {
        if (err instanceof VersionConflictError || err.statusCode === 409) {
            return res.status(409).json({ error: err.message, isConflict: true })
        }
        loggerService.error('siteMediaController.publishMedia failed', err)
        res.status(500).json({ error: err.message || 'Failed to publish media updates' })
    }
}

async function getMediaLog(req: Request, res: Response) {
    try {
        const { slotId, actionType, limit, skip } = req.query
        const filterBy = {
            slotId: typeof slotId === 'string' ? slotId : undefined,
            actionType: typeof actionType === 'string' ? actionType : undefined,
            limit: limit ? parseInt(limit as string, 10) : undefined,
            skip: skip ? parseInt(skip as string, 10) : undefined
        }

        const data = await siteMediaService.getMediaLog(filterBy)
        res.json(data)
    } catch (err: any) {
        loggerService.error('siteMediaController.getMediaLog failed', err)
        res.status(500).json({ error: 'Failed to retrieve media history log' })
    }
}

async function auditOrphans(req: Request, res: Response) {
    try {
        const report = await siteMediaService.auditOrphanedUploads()
        res.json(report)
    } catch (err: any) {
        loggerService.error('siteMediaController.auditOrphans failed', err)
        res.status(500).json({ error: 'Failed to run orphan audit' })
    }
}

