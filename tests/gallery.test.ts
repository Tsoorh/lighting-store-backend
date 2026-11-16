jest.mock('../services/logger.service', () => ({
    loggerService: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { siteOptionsUpdateSchema } from '../api/options/options.schema';
import { optionsService } from '../api/options/options.service';
import { dbService } from '../services/db.service';
import { galleryUpdateSchema } from '../api/gallery/gallery.schema';
import { galleryRoutes } from '../api/gallery/gallery.route';
import { requireAdmin } from '../middlewares/requireAuth.middleware';

describe('Site Options & Gallery Unit Tests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('siteOptionsUpdateSchema & merge behavior', () => {
        it('accepts partial updates and rejects empty payload', () => {
            expect(siteOptionsUpdateSchema.safeParse({ isGalleryActive: true }).success).toBe(true);
            expect(siteOptionsUpdateSchema.safeParse({ isNewCollectionActive: false }).success).toBe(true);
            expect(
                siteOptionsUpdateSchema.safeParse({ isNewCollectionActive: false, isGalleryActive: true }).success
            ).toBe(true);
            expect(siteOptionsUpdateSchema.safeParse({}).success).toBe(false);
        });

        it('defaults isGalleryActive to false when missing from stored doc and merges updates cleanly', async () => {
            let storedDoc: Record<string, unknown> = { isNewCollectionActive: true };

            jest.spyOn(dbService, 'query').mockImplementation((async (sql: string, params?: unknown[]) => {
                if (sql.includes('SELECT') && params?.[0] === 'site_options') {
                    return {
                        rows: [{ id: 'site_options', data: storedDoc, updated_at: new Date().toISOString() }],
                        rowCount: 1,
                    };
                }
                if (sql.includes('INSERT INTO public.options') && params?.[0] === 'site_options') {
                    storedDoc = JSON.parse(String(params[1]));
                    return { rows: [{ updated_at: new Date().toISOString() }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }) as never);

            const initial = await optionsService.getSiteOptions();
            expect(initial.isNewCollectionActive).toBe(true);
            expect(initial.isGalleryActive).toBe(false);

            const updated = await optionsService.updateSiteOptions({ isGalleryActive: true });
            expect(updated.isNewCollectionActive).toBe(true);
            expect(updated.isGalleryActive).toBe(true);

            const updated2 = await optionsService.updateSiteOptions({ isNewCollectionActive: false });
            expect(updated2.isNewCollectionActive).toBe(false);
            expect(updated2.isGalleryActive).toBe(true);
        });
    });

    describe('galleryUpdateSchema & route protection', () => {
        it('validates gallery items and rejects unsafe URLs', () => {
            const validRes = galleryUpdateSchema.safeParse({
                items: [
                    {
                        id: 'g1',
                        url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
                        title: { en: 'Living Room', he: 'סלון' },
                        category: 'pendant',
                        productId: 'prod-1',
                        order: 0,
                    },
                ],
            });
            expect(validRes.success).toBe(true);

            const badUrlRes = galleryUpdateSchema.safeParse({
                items: [
                    {
                        id: 'g2',
                        url: 'javascript:alert(1)',
                        order: 0,
                    },
                ],
            });
            expect(badUrlRes.success).toBe(false);

            const badCategoryRes = galleryUpdateSchema.safeParse({
                items: [
                    {
                        id: 'g3',
                        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                        category: 'unknown-category',
                        order: 0,
                    },
                ],
            });
            expect(badCategoryRes.success).toBe(false);
        });

        it('protects POST /upload-signature and PUT / with requireAdmin', () => {
            interface RouteLayer {
                route?: {
                    path: string;
                    methods: Record<string, boolean>;
                    stack: Array<{ handle: unknown }>;
                };
            }

            const layers = (galleryRoutes as unknown as { stack: RouteLayer[] }).stack;
            const getRoute = layers.find((l) => l.route?.path === '/' && l.route.methods.get)?.route;
            const putRoute = layers.find((l) => l.route?.path === '/' && l.route.methods.put)?.route;
            const signRoute = layers.find((l) => l.route?.path === '/upload-signature' && l.route.methods.post)?.route;

            expect(getRoute).toBeDefined();
            expect(getRoute!.stack.map((s) => s.handle)).not.toContain(requireAdmin);

            expect(putRoute).toBeDefined();
            expect(putRoute!.stack.map((s) => s.handle)).toContain(requireAdmin);

            expect(signRoute).toBeDefined();
            expect(signRoute!.stack.map((s) => s.handle)).toContain(requireAdmin);
        });
    });
});
