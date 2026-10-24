import crypto from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import { dbService } from '../../services/db.service'
import { loggerService } from '../../services/logger.service'
import { 
    CANONICAL_SLOT_IDS, 
    CanonicalSlotId, 
    DEFAULT_SITE_MEDIA, 
    SiteMediaConfig, 
    SiteMediaLogEntry 
} from '../../model/site-media.model'
import { Miniuser } from '../../model/user.model'
import { PublishMediaInput } from './site-media.schema'

export class VersionConflictError extends Error {
    statusCode = 409
    constructor(message = 'Version conflict: published version has changed.') {
        super(message)
        this.name = 'VersionConflictError'
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_KEY,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const COLLECTION = 'site_media'
const LOG_COLLECTION = 'site_media_log'

export const siteMediaService = {
    getSiteMedia,
    generateUploadSignature,
    publishMedia,
    getMediaLog,
    auditOrphanedUploads
}

async function getSiteMedia(): Promise<SiteMediaConfig> {
    try {
        const collection = await dbService.getCollection<SiteMediaConfig>(COLLECTION)
        let config = await collection.findOne({ _id: 'homepage_media' })
        
        if (!config) {
            const initialDoc: SiteMediaConfig = {
                ...DEFAULT_SITE_MEDIA,
                updatedAt: new Date().toISOString()
            }
            await collection.insertOne(initialDoc as any)
            config = initialDoc
        }
        return config
    } catch (err) {
        loggerService.error('Failed to get site media config', err)
        throw err
    }
}

async function generateUploadSignature(
    slotId: CanonicalSlotId | 'hero_video', 
    resourceType: 'image' | 'video'
) {
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const cloudName = process.env.CLOUDINARY_KEY

    if (!apiSecret || !apiKey || !cloudName) {
        throw new Error('Cloudinary credentials are not fully configured on the server')
    }

    const timestamp = Math.round(new Date().getTime() / 1000)
    const randomSalt = crypto.randomBytes(3).toString('hex')
    const subFolder = resourceType === 'video' ? 'videos' : 'images'
    const folder = `tiran_lasry/homepage/${subFolder}`
    const publicId = `${slotId}_${timestamp}_${randomSalt}`

    const paramsToSign = {
        folder,
        public_id: publicId,
        timestamp
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return {
        signature,
        timestamp,
        apiKey,
        cloudName,
        publicId,
        folder
    }
}

async function publishMedia(
    baseVersion: number, 
    draftConfig: PublishMediaInput['draftConfig'], 
    user: Miniuser
) {
    const collection = await dbService.getCollection<SiteMediaConfig>(COLLECTION)
    const logCollection = await dbService.getCollection<SiteMediaLogEntry>(LOG_COLLECTION)

    let current = await collection.findOne({ _id: 'homepage_media' })

    const publicationId = `pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const now = new Date().toISOString()
    const logEntries: SiteMediaLogEntry[] = []

    const userSummary = {
        _id: user._id ? user._id.toString() : 'admin',
        fullname: user.fullname || 'Admin',
        username: user.username || 'admin',
        role: user.role || 'admin'
    }

    const currentVid = current?.heroVideo || DEFAULT_SITE_MEDIA.heroVideo
    const draftVid = draftConfig.heroVideo || DEFAULT_SITE_MEDIA.heroVideo
    const currentVidPos = currentVid.objectPosition || { x: 50, y: 50 }
    const draftVidPos = draftVid.objectPosition || { x: 50, y: 50 }

    const isVideoChanged = 
        currentVid.url !== draftVid.url ||
        currentVid.posterUrl !== draftVid.posterUrl ||
        currentVidPos.x !== draftVidPos.x ||
        currentVidPos.y !== draftVidPos.y

    if (isVideoChanged) {
        logEntries.push({
            publicationId,
            actionType: 'replacement',
            mediaType: 'hero_video',
            slotId: 'hero_video',
            slotName: { en: 'Hero Main Video', he: 'וידאו ראשי' },
            previousAsset: {
                url: currentVid.url,
                publicId: currentVid.publicId,
                posterUrl: currentVid.posterUrl,
                posterPublicId: currentVid.posterPublicId,
                objectPosition: currentVidPos
            },
            newAsset: {
                url: draftVid.url,
                publicId: draftVid.publicId,
                posterUrl: draftVid.posterUrl,
                posterPublicId: draftVid.posterPublicId,
                objectPosition: draftVidPos
            },
            replacedAt: now,
            replacedBy: userSummary
        })
    }

    // 2. Detect changes in the 5 Gallery Slots
    const updatedGallery: SiteMediaConfig['gallery'] = { ...(current?.gallery || DEFAULT_SITE_MEDIA.gallery) }
    for (const slotId of CANONICAL_SLOT_IDS) {
        const curSlot = current?.gallery?.[slotId] || DEFAULT_SITE_MEDIA.gallery[slotId]
        const dftSlot = draftConfig.gallery?.[slotId] || DEFAULT_SITE_MEDIA.gallery[slotId]
        const curPos = curSlot.objectPosition || { x: 50, y: 50 }
        const dftPos = dftSlot.objectPosition || { x: 50, y: 50 }

        const isSlotChanged = 
            curSlot.url !== dftSlot.url ||
            curPos.x !== dftPos.x ||
            curPos.y !== dftPos.y

        if (isSlotChanged) {
            logEntries.push({
                publicationId,
                actionType: 'replacement',
                mediaType: 'gallery',
                slotId,
                slotName: curSlot.title || DEFAULT_SITE_MEDIA.gallery[slotId].title,
                previousAsset: {
                    url: curSlot.url,
                    publicId: curSlot.publicId,
                    objectPosition: curPos
                },
                newAsset: {
                    url: dftSlot.url,
                    publicId: dftSlot.publicId,
                    objectPosition: dftPos
                },
                replacedAt: now,
                replacedBy: userSummary
            })
        }

        updatedGallery[slotId] = {
            ...curSlot,
            url: dftSlot.url,
            publicId: dftSlot.publicId,
            objectPosition: dftPos,
            title: (dftSlot.title?.en && dftSlot.title?.he) ? { en: dftSlot.title.en, he: dftSlot.title.he } : curSlot.title,
            alt: (dftSlot.alt?.en && dftSlot.alt?.he) ? { en: dftSlot.alt.en, he: dftSlot.alt.he } : curSlot.alt,
            updatedAt: now,
            updatedBy: userSummary
        }
    }

    const currentVersion = current && typeof current.version === 'number' ? current.version : 1
    const newVersion = current ? currentVersion + 1 : 1

    const configToSave: SiteMediaConfig = {
        _id: 'homepage_media',
        version: newVersion,
        publicationId,
        heroVideo: {
            ...currentVid,
            ...draftVid,
            objectPosition: draftVidPos,
            updatedAt: now,
            updatedBy: userSummary
        },
        gallery: updatedGallery,
        updatedAt: now
    }

    if (!current) {
        await collection.insertOne(configToSave as any)
    } else {
        if (baseVersion !== currentVersion && baseVersion !== 0 && typeof current.version === 'number') {
            throw new VersionConflictError(`Conflict: published version is ${currentVersion}, but your draft was based on version ${baseVersion}.`)
        }

        const { _id, ...fieldsToUpdate } = configToSave

        const updateResult = await collection.updateOne(
            { 
                _id: 'homepage_media',
                $or: [
                    { version: baseVersion },
                    { version: currentVersion },
                    { version: { $exists: false } }
                ]
            },
            { $set: fieldsToUpdate as any }
        )

        if (updateResult.matchedCount === 0) {
            const latestDoc = await collection.findOne({ _id: 'homepage_media' })
            const latestVersion = latestDoc?.version ?? 0
            loggerService.warn(`Version conflict during site media publish. Expected: ${baseVersion}, Found: ${latestVersion}`)
            throw new VersionConflictError(`Conflict: published version is ${latestVersion}, but your draft was based on version ${baseVersion}.`)
        }
    }

    // Commit audit log entries
    if (logEntries.length > 0) {
        await logCollection.insertMany(logEntries as any)
    }

    loggerService.info(`Site media published successfully. Version: ${newVersion}, PublicationId: ${publicationId}, Changed slots: ${logEntries.length}`)

    return {
        success: true,
        version: newVersion,
        publicationId,
        config: configToSave
    }
}

async function getMediaLog(filterBy: { slotId?: string; actionType?: string; limit?: number; skip?: number } = {}) {
    try {
        const logCollection = await dbService.getCollection<SiteMediaLogEntry>(LOG_COLLECTION)
        const criteria: any = {}

        if (filterBy.slotId && filterBy.slotId !== 'all') {
            criteria.slotId = filterBy.slotId
        }
        if (filterBy.actionType && filterBy.actionType !== 'all') {
            criteria.actionType = filterBy.actionType
        }

        const limit = Math.min(filterBy.limit || 50, 100)
        const skip = filterBy.skip || 0

        const [items, total] = await Promise.all([
            logCollection.find(criteria).sort({ replacedAt: -1 }).skip(skip).limit(limit).toArray(),
            logCollection.countDocuments(criteria)
        ])

        return { items, total }
    } catch (err) {
        loggerService.error('Failed to query site media log', err)
        throw err
    }
}

async function auditOrphanedUploads(gracePeriodHours = 168) {
    try {
        const collection = await dbService.getCollection<SiteMediaConfig>(COLLECTION)
        const logCollection = await dbService.getCollection<SiteMediaLogEntry>(LOG_COLLECTION)

        const activeDoc = await collection.findOne({ _id: 'homepage_media' })
        const activePublicIds = new Set<string>()

        if (activeDoc) {
            if (activeDoc.heroVideo.publicId) activePublicIds.add(activeDoc.heroVideo.publicId)
            if (activeDoc.heroVideo.posterPublicId) activePublicIds.add(activeDoc.heroVideo.posterPublicId)
            for (const slotId of CANONICAL_SLOT_IDS) {
                if (activeDoc.gallery[slotId]?.publicId) {
                    activePublicIds.add(activeDoc.gallery[slotId].publicId!)
                }
            }
        }

        const historyItems = await logCollection.find({}).project({ 
            'previousAsset.publicId': 1, 
            'previousAsset.posterPublicId': 1, 
            'newAsset.publicId': 1, 
            'newAsset.posterPublicId': 1 
        }).toArray()

        for (const item of historyItems) {
            if (item.previousAsset?.publicId) activePublicIds.add(item.previousAsset.publicId)
            if (item.previousAsset?.posterPublicId) activePublicIds.add(item.previousAsset.posterPublicId)
            if (item.newAsset?.publicId) activePublicIds.add(item.newAsset.publicId)
            if (item.newAsset?.posterPublicId) activePublicIds.add(item.newAsset.posterPublicId)
        }

        // Query Cloudinary for homepage assets (images and videos)
        let cloudinaryResources: any[] = []
        try {
            const resImages = await cloudinary.api.resources({
                type: 'upload',
                prefix: 'tiran_lasry/homepage/',
                max_results: 500
            })
            cloudinaryResources = cloudinaryResources.concat(resImages.resources || [])
        } catch (cErr) {
            loggerService.warn('Cloudinary resource scan warning', cErr)
        }

        const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000
        const cutoffDate = new Date(Date.now() - gracePeriodMs)

        const orphanCandidates = cloudinaryResources.filter(res => {
            if (activePublicIds.has(res.public_id)) return false
            const createdAt = new Date(res.created_at)
            return createdAt < cutoffDate
        }).map(res => ({
            publicId: res.public_id,
            bytes: res.bytes,
            format: res.format,
            createdAt: res.created_at
        }))

        return {
            dryRun: true,
            totalScanned: cloudinaryResources.length,
            referencedCount: activePublicIds.size,
            orphanCandidatesCount: orphanCandidates.length,
            orphanCandidates
        }
    } catch (err) {
        loggerService.error('Failed to run orphan upload audit', err)
        throw err
    }
}

