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

        it('should accept a valid draft configuration containing _id, version, publicationId, and updatedAt', () => {
            const input = {
                baseVersion: 1,
                draftConfig: {
                    _id: 'homepage_media',
                    version: 1,
                    publicationId: 'pub_test_123',
                    updatedAt: new Date().toISOString(),
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: DEFAULT_SITE_MEDIA.gallery
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(true)
        })

        it('should accept draft when photos 3-6 have been updated with new URLs and object positions', () => {
            const updatedGallery = {
                ...DEFAULT_SITE_MEDIA.gallery,
                slot_3: {
                    ...DEFAULT_SITE_MEDIA.gallery.slot_3,
                    url: 'https://res.cloudinary.com/dhixlriwm/image/upload/v1/slot_3_new.jpg',
                    publicId: 'slot_3_new',
                    objectPosition: { x: 30, y: 70 }
                },
                slot_4: {
                    ...DEFAULT_SITE_MEDIA.gallery.slot_4,
                    url: 'https://res.cloudinary.com/dhixlriwm/image/upload/v1/slot_4_new.jpg',
                    publicId: 'slot_4_new',
                    objectPosition: { x: 50, y: 80 }
                },
                slot_5: {
                    ...DEFAULT_SITE_MEDIA.gallery.slot_5,
                    url: 'https://res.cloudinary.com/dhixlriwm/image/upload/v1/slot_5_new.jpg',
                    publicId: 'slot_5_new',
                    objectPosition: { x: 60, y: 40 }
                },
                slot_6: {
                    ...DEFAULT_SITE_MEDIA.gallery.slot_6,
                    url: 'https://res.cloudinary.com/dhixlriwm/image/upload/v1/slot_6_new.jpg',
                    publicId: 'slot_6_new',
                    objectPosition: { x: 50, y: 50 }
                }
            }

            const input = {
                baseVersion: 1,
                draftConfig: {
                    _id: 'homepage_media',
                    version: 1,
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: updatedGallery
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.draftConfig.gallery.slot_3.objectPosition?.x).toBe(30)
                expect(res.data.draftConfig.gallery.slot_4.objectPosition?.y).toBe(80)
            }
        })

        it('should accept draft when publicId, posterUrl, and other optional fields are explicitly null', () => {
            const galleryWithNulls = {
                ...DEFAULT_SITE_MEDIA.gallery,
                slot_1: { ...DEFAULT_SITE_MEDIA.gallery.slot_1, publicId: null },
                slot_4: { ...DEFAULT_SITE_MEDIA.gallery.slot_4, publicId: null },
                slot_5: { ...DEFAULT_SITE_MEDIA.gallery.slot_5, publicId: null },
                slot_6: { ...DEFAULT_SITE_MEDIA.gallery.slot_6, publicId: null }
            }

            const input = {
                baseVersion: 2,
                draftConfig: {
                    _id: 'homepage_media',
                    version: 2,
                    publicationId: null,
                    updatedAt: '2026-10-24T14:18:43.163Z',
                    heroVideo: {
                        ...DEFAULT_SITE_MEDIA.heroVideo,
                        publicId: null,
                        posterUrl: null,
                        posterPublicId: null
                    },
                    gallery: galleryWithNulls
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(true)
        })

        it('should default objectPosition to { x: 50, y: 50 } if omitted', () => {
            const slot1WithoutPos: any = { ...DEFAULT_SITE_MEDIA.gallery.slot_1 }
            delete slot1WithoutPos.objectPosition

            const input = {
                baseVersion: 1,
                draftConfig: {
                    heroVideo: DEFAULT_SITE_MEDIA.heroVideo,
                    gallery: {
                        ...DEFAULT_SITE_MEDIA.gallery,
                        slot_1: slot1WithoutPos
                    }
                }
            }
            const res = publishMediaSchema.safeParse(input)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.draftConfig.gallery.slot_1.objectPosition).toEqual({ x: 50, y: 50 })
            }
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
            expect(sig1.folder).toEqual('tiran_lasry/homepage/images')
            expect(sig1.publicId).toContain('slot_1_')
        })

        it('should route video uploads to the videos subfolder', async () => {
            process.env.CLOUDINARY_KEY = 'test_cloud'
            process.env.CLOUDINARY_API_KEY = '123456789'
            process.env.CLOUDINARY_API_SECRET = 'secret_test_key'

            const sig = await siteMediaService.generateUploadSignature('hero_video', 'video')
            expect(sig.folder).toEqual('tiran_lasry/homepage/videos')
            expect(sig.publicId).toContain('hero_video_')
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

