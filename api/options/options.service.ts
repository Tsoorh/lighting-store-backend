import { dbService } from '../../services/db.service';
import { loggerService } from '../../services/logger.service';
import { 
    SocketOptions, 
    DEFAULT_SOCKET_OPTIONS, 
    SocketOptionCategory,
    SiteOptions,
    DEFAULT_SITE_OPTIONS
} from '../../model/options.model';

const SOCKET_OPTIONS_ID = 'socket_options';
const SITE_OPTIONS_ID = 'site_options';

export const optionsService = {
    getSocketOptions,
    addSocketOption,
    removeSocketOption,
    updateSocketOptions,
    getSiteOptions,
    updateSiteOptions
};

async function getSocketOptions(): Promise<SocketOptions> {
    try {
        const sql = `SELECT id, data, updated_at FROM public.options WHERE id = $1;`;
        const res = await dbService.query(sql, [SOCKET_OPTIONS_ID]);

        if (res.rows.length === 0) {
            const initialDoc: SocketOptions = {
                ...DEFAULT_SOCKET_OPTIONS,
                updatedAt: new Date().toISOString()
            };
            const insertSql = `
                INSERT INTO public.options (id, data, updated_at) 
                VALUES ($1, $2, NOW()) 
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
                RETURNING *;
            `;
            await dbService.query(insertSql, [
                SOCKET_OPTIONS_ID,
                JSON.stringify({
                    lightTypes: initialDoc.lightTypes,
                    screwTypes: initialDoc.screwTypes
                })
            ]);
            return initialDoc;
        }

        const row = res.rows[0];
        const data = row.data || {};
        const screwTypes = Array.isArray(data.screwTypes) ? data.screwTypes : [...DEFAULT_SOCKET_OPTIONS.screwTypes];
        const lightTypes = Array.isArray(data.lightTypes) ? data.lightTypes : [...DEFAULT_SOCKET_OPTIONS.lightTypes];
        const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();

        return {
            _id: SOCKET_OPTIONS_ID,
            id: SOCKET_OPTIONS_ID,
            screwTypes,
            lightTypes,
            updatedAt
        };
    } catch (err) {
        loggerService.error('Failed to get socket options config from PostgreSQL', err);
        return {
            ...DEFAULT_SOCKET_OPTIONS,
            updatedAt: new Date().toISOString()
        };
    }
}

async function addSocketOption(category: SocketOptionCategory, rawValue: string): Promise<SocketOptions> {
    const value = rawValue.trim();
    if (!value) throw new Error('Option value cannot be empty');

    const current = await getSocketOptions();
    const field: 'screwTypes' | 'lightTypes' = category === 'screw' ? 'screwTypes' : 'lightTypes';
    const list = current[field] || [];

    // Case-insensitive duplicate check
    const exists = list.some(item => item.trim().toLowerCase() === value.toLowerCase());
    if (exists) {
        return current;
    }

    try {
        const updatedList = [...list, value];
        const nextData = {
            screwTypes: category === 'screw' ? updatedList : current.screwTypes,
            lightTypes: category === 'light' ? updatedList : current.lightTypes
        };

        const sql = `
            INSERT INTO public.options (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
            RETURNING updated_at;
        `;
        const res = await dbService.query(sql, [SOCKET_OPTIONS_ID, JSON.stringify(nextData)]);
        const updatedAt = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString();

        current[field] = updatedList;
        current.updatedAt = updatedAt;
        return current;
    } catch (err) {
        loggerService.error(`Failed to add socket option to ${category}: ${value}`, err);
        throw err;
    }
}

async function removeSocketOption(category: SocketOptionCategory, rawValue: string): Promise<SocketOptions> {
    const value = rawValue.trim();
    if (!value) throw new Error('Option value cannot be empty');

    const current = await getSocketOptions();
    const field: 'screwTypes' | 'lightTypes' = category === 'screw' ? 'screwTypes' : 'lightTypes';
    const list = current[field] || [];

    const updatedList = list.filter(item => item.trim().toLowerCase() !== value.toLowerCase());

    try {
        const nextData = {
            screwTypes: category === 'screw' ? updatedList : current.screwTypes,
            lightTypes: category === 'light' ? updatedList : current.lightTypes
        };

        const sql = `
            INSERT INTO public.options (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
            RETURNING updated_at;
        `;
        const res = await dbService.query(sql, [SOCKET_OPTIONS_ID, JSON.stringify(nextData)]);
        const updatedAt = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString();

        current[field] = updatedList;
        current.updatedAt = updatedAt;
        return current;
    } catch (err) {
        loggerService.error(`Failed to remove socket option from ${category}: ${value}`, err);
        throw err;
    }
}

async function updateSocketOptions(newOptions: { screwTypes: string[]; lightTypes: string[] }): Promise<SocketOptions> {
    try {
        const nextData = {
            screwTypes: newOptions.screwTypes.map(s => s.trim()).filter(Boolean),
            lightTypes: newOptions.lightTypes.map(l => l.trim()).filter(Boolean)
        };

        const sql = `
            INSERT INTO public.options (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
            RETURNING updated_at;
        `;
        const res = await dbService.query(sql, [SOCKET_OPTIONS_ID, JSON.stringify(nextData)]);
        const updatedAt = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString();

        return {
            _id: SOCKET_OPTIONS_ID,
            id: SOCKET_OPTIONS_ID,
            ...nextData,
            updatedAt
        };
    } catch (err) {
        loggerService.error('Failed to update socket options config', err);
        throw err;
    }
}

async function getSiteOptions(): Promise<SiteOptions> {
    try {
        const sql = `SELECT id, data, updated_at FROM public.options WHERE id = $1;`;
        const res = await dbService.query(sql, [SITE_OPTIONS_ID]);

        if (res.rows.length === 0) {
            const initialDoc: SiteOptions = {
                ...DEFAULT_SITE_OPTIONS,
                updatedAt: new Date().toISOString()
            };
            const insertSql = `
                INSERT INTO public.options (id, data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
                RETURNING *;
            `;
            await dbService.query(insertSql, [
                SITE_OPTIONS_ID,
                JSON.stringify({ isNewCollectionActive: initialDoc.isNewCollectionActive })
            ]);
            return initialDoc;
        }

        const row = res.rows[0];
        const data = row.data || {};
        const isNewCollectionActive = data.isNewCollectionActive !== false;
        const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();

        return {
            _id: SITE_OPTIONS_ID,
            id: SITE_OPTIONS_ID,
            isNewCollectionActive,
            updatedAt
        };
    } catch (err) {
        loggerService.error('Failed to get site options config from PostgreSQL', err);
        return {
            ...DEFAULT_SITE_OPTIONS,
            updatedAt: new Date().toISOString()
        };
    }
}

async function updateSiteOptions(updateData: { isNewCollectionActive: boolean }): Promise<SiteOptions> {
    try {
        const nextData = {
            isNewCollectionActive: updateData.isNewCollectionActive
        };

        const sql = `
            INSERT INTO public.options (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
            RETURNING updated_at;
        `;
        const res = await dbService.query(sql, [SITE_OPTIONS_ID, JSON.stringify(nextData)]);
        const updatedAt = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString();

        return {
            _id: SITE_OPTIONS_ID,
            id: SITE_OPTIONS_ID,
            isNewCollectionActive: updateData.isNewCollectionActive,
            updatedAt
        };
    } catch (err) {
        loggerService.error('Failed to update site options config', err);
        throw err;
    }
}
