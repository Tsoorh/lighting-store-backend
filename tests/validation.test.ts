jest.mock('../services/logger.service', () => ({
    loggerService: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { loginSchema, registerSchema } from '../api/auth/auth.schema';
import { bulkMultiplierSchema, saveUserSchema } from '../api/user/user.schema';
import { isSafeLinkUrl, publishMediaSchema } from '../api/site-media/site-media.schema';
import { cloudinary } from '../services/cloudinary.service';

describe('Zod security validations and crypto algorithms', () => {
    it('validates login and register schemas safely', () => {
        expect(loginSchema.safeParse({ credentials: { username: 'tiran', password: 'secret' } }).success).toBe(true);
        expect(loginSchema.safeParse({ credentials: { username: ' ', password: 'secret' } }).success).toBe(false);

        expect(
            registerSchema.safeParse({
                newuser: {
                    fullname: 'New User',
                    username: 'newuser',
                    password: 'strongpassword',
                    role: 'architect',
                },
            }).success
        ).toBe(true);

        expect(
            registerSchema.safeParse({
                newuser: {
                    fullname: 'Escalator',
                    username: 'esc',
                    password: 'strongpassword',
                    role: 'superadmin',
                },
            }).success
        ).toBe(false);
    });

    it('validates user creation password requirement while allowing blank password on update', () => {
        expect(
            saveUserSchema.safeParse({
                user: {
                    fullname: 'Created User',
                    username: 'created1',
                    password: '123',
                    role: 'supplier',
                },
            }).success
        ).toBe(false);

        expect(
            saveUserSchema.safeParse({
                user: {
                    _id: 'u-existing',
                    fullname: 'Updated User',
                    username: 'updated1',
                    role: 'supplier',
                    priceMultiplier: 1.5,
                },
            }).success
        ).toBe(true);

        expect(bulkMultiplierSchema.safeParse({ role: 'architect', multiplier: 0.9 }).success).toBe(true);
        expect(bulkMultiplierSchema.safeParse({ role: 'invalid', multiplier: 0.9 }).success).toBe(false);
    });

    it('blocks javascript: and data: URIs in fullWidthBanner.linkUrl while allowing safe URLs', () => {
        expect(isSafeLinkUrl('/products')).toBe(true);
        expect(isSafeLinkUrl('https://tiranlasry.com/catalog')).toBe(true);
        expect(isSafeLinkUrl('')).toBe(true);
        expect(isSafeLinkUrl(null)).toBe(true);

        expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeLinkUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isSafeLinkUrl('//evil.example.com')).toBe(false);

        const baseSlot = { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' };
        const badPayload = publishMediaSchema.safeParse({
            baseVersion: 1,
            draftConfig: {
                heroVideo: { url: 'https://res.cloudinary.com/demo/video/upload/sample.mp4' },
                fullWidthBanner: {
                    enabled: true,
                    position: 2,
                    url: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
                    linkUrl: 'javascript:alert(document.cookie)',
                },
                gallery: {
                    slot_1: baseSlot,
                    slot_3: baseSlot,
                    slot_4: baseSlot,
                    slot_5: baseSlot,
                    slot_6: baseSlot,
                },
            },
        });
        expect(badPayload.success).toBe(false);
    });

    it('configures Cloudinary signature_algorithm to sha256', () => {
        expect(cloudinary.config().signature_algorithm).toBe('sha256');
    });
});
