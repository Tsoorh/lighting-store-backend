import { z } from 'zod'

const objectPositionSchema = z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
})

const gallerySlotSchema = z.object({
    id: z.enum(['slot_1', 'slot_3', 'slot_4', 'slot_5', 'slot_6']),
    slotIndex: z.number().int().min(0).max(5),
    title: z.object({
        en: z.string(),
        he: z.string()
    }),
    aspectRatioType: z.enum(['wide', 'square']),
    targetRatio: z.number(),
    recommendedResolution: z.string(),
    url: z.string().min(1),
    publicId: z.string().optional(),
    objectPosition: objectPositionSchema,
    alt: z.object({
        en: z.string(),
        he: z.string()
    }),
    updatedAt: z.string().optional(),
    updatedBy: z.object({
        _id: z.string(),
        fullname: z.string(),
        username: z.string()
    }).optional()
}).strict()

export const uploadSignatureSchema = z.object({
    target: z.enum(['hero_video', 'gallery']),
    slotId: z.enum(['hero_video', 'slot_1', 'slot_3', 'slot_4', 'slot_5', 'slot_6']),
    resourceType: z.enum(['image', 'video'])
})

export const publishMediaSchema = z.object({
    baseVersion: z.number().int().min(0),
    draftConfig: z.object({
        heroVideo: z.object({
            url: z.string().min(1),
            publicId: z.string().optional(),
            posterUrl: z.string().optional(),
            posterPublicId: z.string().optional(),
            objectPosition: objectPositionSchema,
            updatedAt: z.string().optional(),
            updatedBy: z.object({
                _id: z.string(),
                fullname: z.string(),
                username: z.string()
            }).optional()
        }).strict(),
        gallery: z.object({
            slot_1: gallerySlotSchema,
            slot_3: gallerySlotSchema,
            slot_4: gallerySlotSchema,
            slot_5: gallerySlotSchema,
            slot_6: gallerySlotSchema
        }).strict()
    }).strict()
})

export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>
export type PublishMediaInput = z.infer<typeof publishMediaSchema>

