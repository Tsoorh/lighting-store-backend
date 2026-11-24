import { z } from 'zod';

function isTrustedGalleryImageUrl(url: string): boolean {
    const trimmed = url.trim();
    if (trimmed.startsWith('/images/') && !trimmed.includes('..')) {
        return true;
    }
    try {
        const parsed = new URL(trimmed);
        return (
            (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
            parsed.hostname === 'res.cloudinary.com'
        );
    } catch {
        return false;
    }
}

export const galleryCategorySchema = z.enum(['pendant', 'wall', 'ceiling', 'projects']);

export const galleryItemSchema = z.object({
    id: z.string().trim().min(1, 'Gallery item id is required').max(100),
    url: z.string().trim().min(1, 'Image URL is required').max(1000).refine(
        isTrustedGalleryImageUrl,
        { message: 'Image URL must be a valid Cloudinary or local /images/ URL' }
    ),
    publicId: z.string().trim().max(300).nullable().optional(),
    title: z.object({
        en: z.string().trim().max(120).nullable().optional(),
        he: z.string().trim().max(120).nullable().optional(),
    }).nullable().optional(),
    category: galleryCategorySchema.nullable().optional(),
    productId: z.string().trim().max(100).nullable().optional(),
    isVisible: z.boolean().optional().default(true),
    order: z.number().int().min(0),
    createdAt: z.string().max(64).optional(),
});

export const galleryUpdateSchema = z.object({
    items: z.array(galleryItemSchema).max(200),
});

export type GalleryUpdateInput = z.infer<typeof galleryUpdateSchema>;
