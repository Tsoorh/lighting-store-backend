import { z } from 'zod';

const HebrewEnglishSchema = z.object({
    he: z.string().min(1, 'Hebrew field is required'),
    en: z.string().min(1, 'English field is required'),
});

const ProductSizeSchema = z.object({
    height: z.number().nonnegative(),
    radius: z.number().nonnegative(),
});

const SocketTypeSchema = z.object({
    screwType: z.string(),
    lightType: z.string(),
});

export const ProductSaveSchema = z.object({
    _id: z.string().optional(),
    name: HebrewEnglishSchema,
    description: HebrewEnglishSchema,
    price: z.number().nonnegative().optional(),
    isActive: z.boolean().optional().default(true),
    category: z.array(HebrewEnglishSchema).min(1, 'At least one category is required'),
    material: z.array(HebrewEnglishSchema),
    woodType: z.array(HebrewEnglishSchema),
    imgsUrl: z.array(z.string()),
    size: z.array(ProductSizeSchema).min(1, 'At least one size is required'),
    socketType: SocketTypeSchema,
    radius: z.number().optional(), // FullProduct has radius: number but also size[]
});
