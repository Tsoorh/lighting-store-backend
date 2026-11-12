import crypto from 'crypto'
import { cloudinary } from '../../services/cloudinary.service'
import { dbService } from '../../services/db.service'
import { loggerService } from '../../services/logger.service'
import { 
    CANONICAL_SLOT_IDS, 
    CanonicalSlotId, 
    DEFAULT_SITE_MEDIA, 
    DEFAULT_FULL_WIDTH_BANNER,
    FullWidthBannerConfig,
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

const HOMEPAGE_MEDIA_ID = 'homepage_media'

export const siteMediaService = {
    getSiteMedia,
    generateUploadSignature,
    publishMedia,
    getMediaLog,
    auditOrphanedUploads
}

function _mapRowToSiteMedia(row: Record<string, unknown>): SiteMediaConfig {
    return {
        _id: String(row.id),
        id: String(row.id),
        version: row.version as number,
        publicationId: row.publication_id as string,
        heroVideo: (row.hero_video as SiteMediaConfig['heroVideo']) || DEFAULT_SITE_MEDIA.heroVideo,
        gallery: (row.gallery as SiteMediaConfig['gallery']) || DEFAULT_SITE_MEDIA.gallery,
        fullWidthBanner: (row.full_width_banner as SiteMediaConfig['fullWidthBanner']) || DEFAULT_FULL_WIDTH_BANNER,
        updatedAt: row.updated_at ? new Date(row.updated_at as string | Date).toISOString() : new Date().toISOString()
    }
}

function _mapRowToLog(row: Record<string, unknown>): SiteMediaLogEntry {
    return {
        _id: String(row.id),
        id: String(row.id),
        publicationId: row.publication_id as string,
        actionType: row.action_type as SiteMediaLogEntry['actionType'],
        mediaType: row.media_type as SiteMediaLogEntry['mediaType'],
        slotId: row.slot_id as SiteMediaLogEntry['slotId'],
        slotName: row.slot_name as SiteMediaLogEntry['slotName'],
        previousAsset: row.previous_asset as SiteMediaLogEntry['previousAsset'],
        newAsset: row.new_asset as SiteMediaLogEntry['newAsset'],
        replacedAt: row.replaced_at ? new Date(row.replaced_at as string | Date).toISOString() : new Date().toISOString(),
        replacedBy: row.replaced_by as SiteMediaLogEntry['replacedBy']
    }
}

async function getSiteMedia(): Promise<SiteMediaConfig> {
    try {
        const sql = `
            SELECT id, version, hero_video, gallery, full_width_banner, publication_id, updated_at 
            FROM public.site_media 
            WHERE id = $1;
        `
        const res = await dbService.query(sql, [HOMEPAGE_MEDIA_ID])

        if (res.rows.length === 0) {
            const initialDoc: SiteMediaConfig = {
                ...DEFAULT_SITE_MEDIA,
                updatedAt: new Date().toISOString()
            }
            const insertSql = `
                INSERT INTO public.site_media (
                    id, version, publication_id, hero_video, full_width_banner, gallery, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (id) DO UPDATE SET 
                    version = EXCLUDED.version,
                    hero_video = EXCLUDED.hero_video,
                    gallery = EXCLUDED.gallery,
                    full_width_banner = EXCLUDED.full_width_banner,
                    updated_at = EXCLUDED.updated_at
                RETURNING *;
            `
            const insertRes = await dbService.query(insertSql, [
                HOMEPAGE_MEDIA_ID,
                initialDoc.version || 1,
                initialDoc.publicationId || 'pub_init',
                JSON.stringify(initialDoc.heroVideo),
                JSON.stringify(initialDoc.fullWidthBanner || DEFAULT_FULL_WIDTH_BANNER),
                JSON.stringify(initialDoc.gallery)
            ])
            return _mapRowToSiteMedia(insertRes.rows[0])
        }

        const config = _mapRowToSiteMedia(res.rows[0])
        if (!config.fullWidthBanner) {
            config.fullWidthBanner = DEFAULT_FULL_WIDTH_BANNER
        }
        return config
    } catch (err) {
        loggerService.error('Failed to get site media config from PostgreSQL', err)
        throw err
    }
}

async function generateUploadSignature(
    slotId: CanonicalSlotId | 'hero_video' | 'full_width_banner', 
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
    const checkSql = `
        SELECT id, version, hero_video, gallery, full_width_banner, publication_id, updated_at 
        FROM public.site_media 
        WHERE id = $1;
    `
    const currentRes = await dbService.query(checkSql, [HOMEPAGE_MEDIA_ID])
    const current = currentRes.rows.length > 0 ? _mapRowToSiteMedia(currentRes.rows[0]) : null

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

    // Detect changes in the 5 Gallery Slots
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

    // Detect changes in Full-Width Banner
    const currentBanner = current?.fullWidthBanner || DEFAULT_FULL_WIDTH_BANNER
    const draftBanner = draftConfig.fullWidthBanner || DEFAULT_FULL_WIDTH_BANNER
    const currentBannerPos = currentBanner.objectPosition || { x: 50, y: 50 }
    const draftBannerPos = draftBanner.objectPosition || { x: 50, y: 50 }

    const isBannerChanged = 
        currentBanner.enabled !== draftBanner.enabled ||
        currentBanner.position !== draftBanner.position ||
        currentBanner.url !== draftBanner.url ||
        currentBanner.linkUrl !== draftBanner.linkUrl ||
        currentBannerPos.x !== draftBannerPos.x ||
        currentBannerPos.y !== draftBannerPos.y

    if (isBannerChanged) {
        logEntries.push({
            publicationId,
            actionType: 'replacement',
            mediaType: 'full_width_banner',
            slotId: 'full_width_banner',
            slotName: { en: 'Full-Width Banner', he: 'באנר תמונה ברוחב מלא' },
            previousAsset: {
                url: currentBanner.url,
                publicId: currentBanner.publicId,
                objectPosition: currentBannerPos
            },
            newAsset: {
                url: draftBanner.url,
                publicId: draftBanner.publicId,
                objectPosition: draftBannerPos
            },
            replacedAt: now,
            replacedBy: userSummary
        })
    }

    const updatedBanner: FullWidthBannerConfig = {
        ...currentBanner,
        enabled: typeof draftBanner.enabled === 'boolean' ? draftBanner.enabled : currentBanner.enabled,
        position: typeof draftBanner.position === 'number' ? draftBanner.position : currentBanner.position,
        url: draftBanner.url || currentBanner.url,
        publicId: draftBanner.publicId !== undefined ? draftBanner.publicId : currentBanner.publicId,
        objectPosition: draftBannerPos,
        linkUrl: draftBanner.linkUrl !== undefined ? (draftBanner.linkUrl || '') : currentBanner.linkUrl,
        alt: (draftBanner.alt?.en && draftBanner.alt?.he) ? { en: draftBanner.alt.en, he: draftBanner.alt.he } : currentBanner.alt,
        recommendedResolution: draftBanner.recommendedResolution || currentBanner.recommendedResolution,
        targetRatio: draftBanner.targetRatio || currentBanner.targetRatio,
        updatedAt: now,
        updatedBy: userSummary
    }

    const currentVersion = current && typeof current.version === 'number' ? current.version : 1
    const newVersion = current ? currentVersion + 1 : 1

    const configToSave: SiteMediaConfig = {
        _id: HOMEPAGE_MEDIA_ID,
        id: HOMEPAGE_MEDIA_ID,
        version: newVersion,
        publicationId,
        heroVideo: {
            ...currentVid,
            ...draftVid,
            objectPosition: draftVidPos,
            updatedAt: now,
            updatedBy: userSummary
        },
        fullWidthBanner: updatedBanner,
        gallery: updatedGallery,
        updatedAt: now
    }

    if (!current) {
        const insertSql = `
            INSERT INTO public.site_media (
                id, version, publication_id, hero_video, full_width_banner, gallery, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW());
        `
        await dbService.query(insertSql, [
            HOMEPAGE_MEDIA_ID,
            newVersion,
            publicationId,
            JSON.stringify(configToSave.heroVideo),
            JSON.stringify(configToSave.fullWidthBanner),
            JSON.stringify(configToSave.gallery)
        ])
    } else {
        if (baseVersion !== currentVersion && baseVersion !== 0 && typeof current.version === 'number') {
            throw new VersionConflictError(`Conflict: published version is ${currentVersion}, but your draft was based on version ${baseVersion}.`)
        }

        const updateSql = `
            UPDATE public.site_media SET
                version = $1,
                publication_id = $2,
                hero_video = $3,
                full_width_banner = $4,
                gallery = $5,
                updated_at = NOW()
            WHERE id = $6 AND (version = $7 OR version = $8 OR version IS NULL)
            RETURNING version;
        `
        const updateResult = await dbService.query(updateSql, [
            newVersion,
            publicationId,
            JSON.stringify(configToSave.heroVideo),
            JSON.stringify(configToSave.fullWidthBanner),
            JSON.stringify(configToSave.gallery),
            HOMEPAGE_MEDIA_ID,
            baseVersion,
            currentVersion
        ])

        if (updateResult.rowCount === 0) {
            const latestDoc = await getSiteMedia()
            const latestVersion = latestDoc?.version ?? 0
            loggerService.warn(`Version conflict during site media publish. Expected: ${baseVersion}, Found: ${latestVersion}`)
            throw new VersionConflictError(`Conflict: published version is ${latestVersion}, but your draft was based on version ${baseVersion}.`)
        }
    }

    // Commit audit log entries
    if (logEntries.length > 0) {
        for (const entry of logEntries) {
            const entryId = crypto.randomBytes(12).toString('hex')
            const logSql = `
                INSERT INTO public.site_media_logs (
                    id, publication_id, action_type, media_type, slot_id, slot_name, previous_asset, new_asset, replaced_at, replaced_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
            `
            await dbService.query(logSql, [
                entryId,
                entry.publicationId,
                entry.actionType,
                entry.mediaType,
                entry.slotId,
                JSON.stringify(entry.slotName),
                JSON.stringify(entry.previousAsset),
                JSON.stringify(entry.newAsset),
                entry.replacedAt,
                JSON.stringify(entry.replacedBy)
            ])
        }
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
        const conditions: string[] = []
        const values: unknown[] = []

        if (filterBy.slotId && filterBy.slotId !== 'all') {
            values.push(filterBy.slotId)
            conditions.push(`slot_id = $${values.length}`)
        }
        if (filterBy.actionType && filterBy.actionType !== 'all') {
            values.push(filterBy.actionType)
            conditions.push(`action_type = $${values.length}`)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        
        const countSql = `SELECT COUNT(*) AS total FROM public.site_media_logs ${whereClause};`
        const countRes = await dbService.query(countSql, values)
        const total = parseInt(countRes.rows[0]?.total || '0', 10)

        const limit = Math.min(filterBy.limit || 50, 100)
        const skip = filterBy.skip || 0

        const dataValues = [...values, limit, skip]
        const dataSql = `
            SELECT id, publication_id, action_type, media_type, slot_id, slot_name, previous_asset, new_asset, replaced_at, replaced_by
            FROM public.site_media_logs
            ${whereClause}
            ORDER BY replaced_at DESC
            LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
        `
        const dataRes = await dbService.query(dataSql, dataValues)
        const items = dataRes.rows.map(_mapRowToLog)

        return { items, total }
    } catch (err) {
        loggerService.error('Failed to query site media log from PostgreSQL', err)
        throw err
    }
}

async function auditOrphanedUploads(gracePeriodHours = 168) {
    try {
        const activeDoc = await getSiteMedia()
        const activePublicIds = new Set<string>()

        if (activeDoc) {
            if (activeDoc.heroVideo?.publicId) activePublicIds.add(activeDoc.heroVideo.publicId)
            if (activeDoc.heroVideo?.posterPublicId) activePublicIds.add(activeDoc.heroVideo.posterPublicId)
            for (const slotId of CANONICAL_SLOT_IDS) {
                if (activeDoc.gallery?.[slotId]?.publicId) {
                    activePublicIds.add(activeDoc.gallery[slotId].publicId!)
                }
            }
        }

        const historyRes = await dbService.query(`SELECT previous_asset, new_asset FROM public.site_media_logs;`)
        for (const item of historyRes.rows) {
            const prev = item.previous_asset
            const next = item.new_asset
            if (prev?.publicId) activePublicIds.add(prev.publicId)
            if (prev?.posterPublicId) activePublicIds.add(prev.posterPublicId)
            if (next?.publicId) activePublicIds.add(next.publicId)
            if (next?.posterPublicId) activePublicIds.add(next.posterPublicId)
        }

        // Query Cloudinary for homepage assets (images and videos)
        let cloudinaryResources: Array<{ public_id: string; created_at: string; format?: string; bytes?: number }> = []
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
