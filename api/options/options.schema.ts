import { z } from 'zod';

export const socketOptionCategorySchema = z.enum(['screw', 'light']);

export const socketOptionItemSchema = z.object({
    value: z.string().trim().min(1, 'Option value cannot be empty').max(100, 'Option value is too long')
});

export const socketOptionAddSchema = z.object({
    category: socketOptionCategorySchema,
    value: z.string().trim().min(1, 'Option value cannot be empty').max(100, 'Option value is too long')
});

export const socketOptionsUpdateSchema = z.object({
    screwTypes: z.array(z.string().trim().min(1, 'Screw type cannot be empty')).min(1, 'At least one screw type is required'),
    lightTypes: z.array(z.string().trim().min(1, 'Light type cannot be empty')).min(1, 'At least one light type is required')
});

export const siteOptionsUpdateSchema = z.object({
    isNewCollectionActive: z.boolean()
});

export type SocketOptionAddInput = z.infer<typeof socketOptionAddSchema>;
export type SocketOptionsUpdateInput = z.infer<typeof socketOptionsUpdateSchema>;
export type SiteOptionsUpdateInput = z.infer<typeof siteOptionsUpdateSchema>;

