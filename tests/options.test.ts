import { 
    socketOptionCategorySchema, 
    socketOptionItemSchema, 
    socketOptionsUpdateSchema 
} from '../api/options/options.schema';
import { DEFAULT_SOCKET_OPTIONS, SocketOptions } from '../model/options.model';
import { optionsService } from '../api/options/options.service';
import { dbService } from '../services/db.service';

describe('Socket Options Unit Tests', () => {

    describe('Category Validation', () => {
        it('should accept "screw" and "light"', () => {
            expect(socketOptionCategorySchema.safeParse('screw').success).toBe(true);
            expect(socketOptionCategorySchema.safeParse('light').success).toBe(true);
        });

        it('should reject invalid categories', () => {
            expect(socketOptionCategorySchema.safeParse('invalid').success).toBe(false);
            expect(socketOptionCategorySchema.safeParse('').success).toBe(false);
        });
    });

    describe('Item Value Validation', () => {
        it('should accept valid non-empty string and trim whitespace', () => {
            const res = socketOptionItemSchema.safeParse({ value: '  E14  ' });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.value).toBe('E14');
            }
        });

        it('should reject empty or whitespace-only value', () => {
            expect(socketOptionItemSchema.safeParse({ value: '' }).success).toBe(false);
            expect(socketOptionItemSchema.safeParse({ value: '   ' }).success).toBe(false);
        });

        it('should reject strings that exceed maximum length', () => {
            const longStr = 'a'.repeat(101);
            expect(socketOptionItemSchema.safeParse({ value: longStr }).success).toBe(false);
        });
    });

    describe('Options Update Schema Validation', () => {
        it('should accept valid arrays of screwTypes and lightTypes', () => {
            const payload = {
                screwTypes: ['E27', 'G9'],
                lightTypes: ['LED - Max 5W', 'LED - Max 10W']
            };
            const res = socketOptionsUpdateSchema.safeParse(payload);
            expect(res.success).toBe(true);
        });

        it('should reject when screwTypes or lightTypes is empty', () => {
            expect(socketOptionsUpdateSchema.safeParse({
                screwTypes: [],
                lightTypes: ['LED - Max 5W']
            }).success).toBe(false);

            expect(socketOptionsUpdateSchema.safeParse({
                screwTypes: ['E27'],
                lightTypes: []
            }).success).toBe(false);
        });
    });

    describe('Service Logic with Mocked DB', () => {
        let mockDoc: SocketOptions | null = null;
        let queryMock: jest.SpyInstance;

        beforeEach(() => {
            mockDoc = {
                _id: 'socket_options',
                screwTypes: ['E27', 'G9'],
                lightTypes: ['LED - Max 5W'],
                updatedAt: new Date().toISOString()
            };

            queryMock = jest.spyOn(dbService, 'query').mockImplementation((async (sql: string, params?: unknown[]) => {
                if (sql.includes('SELECT') && params && params[0] === 'socket_options') {
                    if (!mockDoc) return { rows: [], rowCount: 0 };
                    return {
                        rows: [{
                            id: 'socket_options',
                            data: {
                                screwTypes: mockDoc.screwTypes,
                                lightTypes: mockDoc.lightTypes
                            },
                            updated_at: mockDoc.updatedAt
                        }],
                        rowCount: 1
                    };
                }

                if (sql.includes('INSERT INTO public.options') && params) {
                    const parsedData = typeof params[1] === 'string' ? JSON.parse(params[1]) : (params[1] as { screwTypes?: string[]; lightTypes?: string[] });
                    const now = new Date().toISOString();
                    mockDoc = {
                        _id: 'socket_options',
                        screwTypes: parsedData.screwTypes || [],
                        lightTypes: parsedData.lightTypes || [],
                        updatedAt: now
                    };
                    return {
                        rows: [{
                            id: 'socket_options',
                            data: parsedData,
                            updated_at: now
                        }],
                        rowCount: 1
                    };
                }

                return { rows: [], rowCount: 0 };
            }) as unknown as typeof dbService.query);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should retrieve existing socket options', async () => {
            const options = await optionsService.getSocketOptions();
            expect(options.screwTypes).toEqual(['E27', 'G9']);
            expect(options.lightTypes).toEqual(['LED - Max 5W']);
        });

        it('should seed default options when collection is empty', async () => {
            mockDoc = null;
            const options = await optionsService.getSocketOptions();
            expect(options.screwTypes).toEqual(DEFAULT_SOCKET_OPTIONS.screwTypes);
            expect(options.lightTypes).toEqual(DEFAULT_SOCKET_OPTIONS.lightTypes);
            expect(queryMock).toHaveBeenCalled();
        });

        it('should add a new screw option and avoid duplicates case-insensitively', async () => {
            const updated = await optionsService.addSocketOption('screw', 'E14');
            expect(updated.screwTypes).toContain('E14');

            // Trying to add duplicate with different case
            const repeat = await optionsService.addSocketOption('screw', 'e14');
            const count = repeat.screwTypes.filter(s => s.toLowerCase() === 'e14').length;
            expect(count).toBe(1);
        });

        it('should remove a socket option', async () => {
            const updated = await optionsService.removeSocketOption('screw', 'G9');
            expect(updated.screwTypes).not.toContain('G9');
            expect(updated.screwTypes).toContain('E27');
        });
    });
});
