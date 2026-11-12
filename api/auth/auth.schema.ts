import { z } from 'zod';

const roleEnum = z.enum(['admin', 'supplier', 'architect']);

export const loginSchema = z.object({
    credentials: z.object({
        username: z.string().trim().min(1, 'Username is required').max(120),
        password: z.string().min(1, 'Password is required').max(256),
    }),
});

export const registerSchema = z.object({
    newuser: z.object({
        fullname: z.string().trim().min(1, 'Fullname is required').max(120),
        username: z.string().trim().min(2, 'Username must be at least 2 characters').max(120),
        password: z.string().min(6, 'Password must be at least 6 characters').max(256),
        role: roleEnum.optional().default('supplier'),
        priceMultiplier: z.coerce.number().min(0).max(1000).optional(),
        showPrices: z.boolean().optional(),
    }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
