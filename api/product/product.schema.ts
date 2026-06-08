import { z } from 'zod';

const HebrewEnglishSchema = z.object({
    he: z.string().min(1, 'Hebrew field is required'),
    en: z.string().min(1, 'English field is required'),
});

const OptionalHebrewEnglishSchema = z.object({
    he: z.string().optional().default(''),
    en: z.string().optional().default(''),
});

const ProductSizeSchema = z.object({
    height: z.number().nonnegative().nullable().optional(),
    diameter: z.number().nonnegative().nullable().optional(),
    length: z.number().nonnegative().nullable().optional(),
    width: z.number().nonnegative().nullable().optional(),
    upTo: z.number().nonnegative().nullable().optional(),
});

const SocketTypeSchema = z.object({
    screwType: z.string().optional().default(''),
    lightType: z.string().optional().default(''),
});

export const ProductSaveSchema = z.object({
    _id: z.string().optional(),
    name: HebrewEnglishSchema,
    description: OptionalHebrewEnglishSchema,
    price: z.number().nonnegative().nullable().optional(),
    isActive: z.boolean().nullable().optional().default(true),
    category: z.array(HebrewEnglishSchema).min(1, 'At least one category is required'),
    material: z.array(HebrewEnglishSchema).optional().default([]),
    woodType: z.array(HebrewEnglishSchema).optional().default([]),
    imgsUrl: z.array(z.string()).optional().default([]),
    size: z.array(ProductSizeSchema).min(1, 'At least one size is required'),
    socketType: SocketTypeSchema.optional(),
    diameter: z.number().nullable().optional(), // FullProduct has diameter: number but also size[]
});
