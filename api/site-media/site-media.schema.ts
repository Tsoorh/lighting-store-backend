import { z } from 'zod'

const objectPositionSchema = z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
}).passthrough()

const gallerySlotSchema = z.object({
    id: z.enum(['slot_1', 'slot_3', 'slot_4', 'slot_5', 'slot_6']).nullable().optional(),
    slotIndex: z.number().int().min(0).max(5).nullable().optional(),
    title: z.object({
        en: z.string().nullable().optional(),
        he: z.string().nullable().optional()
    }).nullable().optional(),
    aspectRatioType: z.enum(['wide', 'square']).nullable().optional(),
    targetRatio: z.number().nullable().optional(),
    recommendedResolution: z.string().nullable().optional(),
    url: z.string().min(1),
    publicId: z.string().nullable().optional(),
    objectPosition: objectPositionSchema.nullable().optional().default({ x: 50, y: 50 }),
    alt: z.object({
        en: z.string().nullable().optional(),
        he: z.string().nullable().optional()
    }).nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    updatedBy: z.any().nullable().optional()
}).passthrough()

export const uploadSignatureSchema = z.object({
    target: z.enum(['hero_video', 'gallery']),
    slotId: z.enum(['hero_video', 'slot_1', 'slot_3', 'slot_4', 'slot_5', 'slot_6']),
    resourceType: z.enum(['image', 'video'])
})

export const publishMediaSchema = z.object({
    baseVersion: z.number().int().min(0),
    draftConfig: z.object({
        _id: z.string().nullable().optional(),
        version: z.number().nullable().optional(),
        publicationId: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        heroVideo: z.object({
            url: z.string().min(1),
            publicId: z.string().nullable().optional(),
            posterUrl: z.string().nullable().optional(),
            posterPublicId: z.string().nullable().optional(),
            objectPosition: objectPositionSchema.nullable().optional().default({ x: 50, y: 50 }),
            updatedAt: z.string().nullable().optional(),
            updatedBy: z.any().nullable().optional()
        }).passthrough(),
        gallery: z.object({
            slot_1: gallerySlotSchema,
            slot_3: gallerySlotSchema,
            slot_4: gallerySlotSchema,
            slot_5: gallerySlotSchema,
            slot_6: gallerySlotSchema
        }).passthrough()
    }).passthrough()
})

export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>
export type PublishMediaInput = z.infer<typeof publishMediaSchema>
