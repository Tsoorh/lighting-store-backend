import { z } from 'zod';

const roleEnum = z.enum(['admin', 'supplier', 'architect']);

export const saveUserSchema = z.object({
    user: z.object({
        _id: z.string().trim().min(1).optional(),
        id: z.string().trim().min(1).optional(),
        fullname: z.string().trim().min(1, 'Fullname is required').max(120),
        username: z.string().trim().min(2, 'Username must be at least 2 characters').max(120),
        password: z.string().max(256).optional(),
        role: roleEnum.optional().default('supplier'),
        priceMultiplier: z.coerce.number().min(0).max(1000).optional(),
        showPrices: z.boolean().optional(),
    }).superRefine((user, ctx) => {
        const isUpdate = Boolean(user._id || user.id);
        const hasPassword = Boolean(user.password && user.password.length > 0);
        if (!isUpdate && (!user.password || user.password.length < 6)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message: 'Password must be at least 6 characters',
            });
        } else if (isUpdate && hasPassword && user.password!.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message: 'Password must be at least 6 characters',
            });
        }
    }),
});

export const bulkMultiplierSchema = z.object({
    role: roleEnum,
    multiplier: z.coerce.number().min(0).max(1000),
});

export type SaveUserInput = z.infer<typeof saveUserSchema>;
export type BulkMultiplierInput = z.infer<typeof bulkMultiplierSchema>;
