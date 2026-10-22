import { uploadSignatureSchema, publishMediaSchema } from '../api/site-media/site-media.schema'
import { VersionConflictError, siteMediaService } from '../api/site-media/site-media.service'
import { DEFAULT_SITE_MEDIA } from '../model/site-media.model'

describe('Site Media CMS Unit Tests', () => {

    describe('Upload Signature Validation', () => {
        it('should accept valid upload signature input for hero video', () => {
            const input = {
                target: 'hero_video',
                slotId: 'hero_video',
                resourceType: 'video'
            }
            const res = uploadSignatureSchema.safeParse(input)
            expect(res.success).toBe(true)
        })

        it('should accept valid upload signature input for gallery slots', () => {
            const input = {
                target: 'gallery',
                slotId: 'slot_1',
                resourceType: 'image'
            }
            const res = uploadSignatureSchema.safeParse(input)
            expect(res.success).toBe(true)
        })

        it('should reject invalid slot ID', () => {
            const input = {
                target: 'gallery',
                slotId: 'slot_invalid',
                resourceType: 'image'
            }
            const res = uploadSignatureSchema.safeParse(input)
            expect(res.success).toBe(false)
        })

        it('should reject invalid resource type', () => {
            const input = {
                target: 'gallery',
                slotId: 'slot_3',
                resourceType: 'audio'
            }
            const res = uploadSignatureSchema.safeParse(input)
            expect(res.success).toBe(false)
        })
    })

    describe('Publish Schema Validation', () => {
        it('should accept a valid default-shaped draft configuration', () => {
            const input = {
                baseVersion: 1,
                draftConfig: {
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: DEFAULT_SITE_MEDIA.gallery
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(true)
        })

        it('should reject when a canonical slot is missing', () => {
            const galleryWithoutSlot6: any = { ...DEFAULT_SITE_MEDIA.gallery }
            delete galleryWithoutSlot6.slot_6

            const input = {
                baseVersion: 1,
                draftConfig: {
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: galleryWithoutSlot6
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(false)
        })

        it('should reject when objectPosition coordinates are out of bounds (> 100 or < 0)', () => {
            const invalidGallery = {
                ...DEFAULT_SITE_MEDIA.gallery,
                slot_1: {
                    ...DEFAULT_SITE_MEDIA.gallery.slot_1,
                    objectPosition: { x: 150, y: 50 } // Invalid > 100
                }
            }

            const input = {
                baseVersion: 1,
                draftConfig: {
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: invalidGallery
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(false)
        })

        it('should reject when baseVersion is negative', () => {
            const input = {
                baseVersion: -1,
                draftConfig: {
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: DEFAULT_SITE_MEDIA.gallery
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(false)
        })
    })

    describe('Unique Public ID Generation', () => {
        it('should generate distinct publicIds on consecutive signature calls', async () => {
            process.env.CLOUDINARY_KEY = 'test_cloud'
            process.env.CLOUDINARY_API_KEY = '123456789'
            process.env.CLOUDINARY_API_SECRET = 'secret_test_key'

            const sig1 = await siteMediaService.generateUploadSignature('slot_1', 'image')
            const sig2 = await siteMediaService.generateUploadSignature('slot_1', 'image')

            expect(sig1.publicId).toBeDefined()
            expect(sig2.publicId).toBeDefined()
            expect(sig1.publicId).not.toEqual(sig2.publicId)
            expect(sig1.publicId).toContain('tiran_lasry/homepage/images/slot_1_')
        })

        it('should route video uploads to the videos subfolder', async () => {
            process.env.CLOUDINARY_KEY = 'test_cloud'
            process.env.CLOUDINARY_API_KEY = '123456789'
            process.env.CLOUDINARY_API_SECRET = 'secret_test_key'

            const sig = await siteMediaService.generateUploadSignature('hero_video', 'video')
            expect(sig.folder).toEqual('tiran_lasry/homepage/videos')
            expect(sig.publicId).toContain('tiran_lasry/homepage/videos/hero_video_')
        })
    })

    describe('VersionConflictError', () => {
        it('should have statusCode 409 and expected name', () => {
            const err = new VersionConflictError('Conflict test')
            expect(err.statusCode).toBe(409)
            expect(err.name).toBe('VersionConflictError')
            expect(err.message).toBe('Conflict test')
        })
    })
})

