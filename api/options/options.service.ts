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

async function _upsertOptionDoc<T extends Record<string, unknown>>(id: string, data: T): Promise<string> {
    const sql = `
        INSERT INTO public.options (id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        RETURNING updated_at;
    `;
    const res = await dbService.query(sql, [id, JSON.stringify(data)]);
    return res.rows[0]?.updated_at
        ? new Date(res.rows[0].updated_at).toISOString()
        : new Date().toISOString();
}

async function _getOptionDoc<T extends Record<string, unknown>>(
    id: string,
    defaultData: T
): Promise<{ data: T; updatedAt: string }> {
    const sql = `SELECT id, data, updated_at FROM public.options WHERE id = $1;`;
    const res = await dbService.query(sql, [id]);

    if (res.rows.length === 0) {
        const updatedAt = await _upsertOptionDoc(id, defaultData);
        return { data: defaultData, updatedAt };
    }

    const row = res.rows[0];
    return {
        data: (row.data || {}) as T,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
}

async function getSocketOptions(): Promise<SocketOptions> {
    try {
        const { data, updatedAt } = await _getOptionDoc(SOCKET_OPTIONS_ID, {
            lightTypes: [...DEFAULT_SOCKET_OPTIONS.lightTypes],
            screwTypes: [...DEFAULT_SOCKET_OPTIONS.screwTypes]
        });

        const screwTypes = Array.isArray(data.screwTypes)
            ? (data.screwTypes as string[])
            : [...DEFAULT_SOCKET_OPTIONS.screwTypes];
        const lightTypes = Array.isArray(data.lightTypes)
            ? (data.lightTypes as string[])
            : [...DEFAULT_SOCKET_OPTIONS.lightTypes];

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

        const updatedAt = await _upsertOptionDoc(SOCKET_OPTIONS_ID, nextData);
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

        const updatedAt = await _upsertOptionDoc(SOCKET_OPTIONS_ID, nextData);
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

        const updatedAt = await _upsertOptionDoc(SOCKET_OPTIONS_ID, nextData);
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
        const { data, updatedAt } = await _getOptionDoc(SITE_OPTIONS_ID, {
            isNewCollectionActive: DEFAULT_SITE_OPTIONS.isNewCollectionActive
        });

        return {
            _id: SITE_OPTIONS_ID,
            id: SITE_OPTIONS_ID,
            isNewCollectionActive: data.isNewCollectionActive !== false,
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

        const updatedAt = await _upsertOptionDoc(SITE_OPTIONS_ID, nextData);
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
