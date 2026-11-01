import { dbService } from '../../services/db.service';
import { loggerService } from '../../services/logger.service';
import { 
    SocketOptions, 
    DEFAULT_SOCKET_OPTIONS, 
    SocketOptionCategory,
    SiteOptions,
    DEFAULT_SITE_OPTIONS
} from '../../model/options.model';

const COLLECTION = 'options';
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
        const collection = await dbService.getCollection<SocketOptions>(COLLECTION);
        let options = await collection.findOne({ _id: SOCKET_OPTIONS_ID } as any);

        if (!options) {
            const initialDoc: SocketOptions = {
                ...DEFAULT_SOCKET_OPTIONS,
                updatedAt: new Date().toISOString()
            };
            await collection.insertOne(initialDoc as any);
            options = initialDoc;
        }

        if (!Array.isArray(options.screwTypes)) {
            options.screwTypes = [...DEFAULT_SOCKET_OPTIONS.screwTypes];
        }
        if (!Array.isArray(options.lightTypes)) {
            options.lightTypes = [...DEFAULT_SOCKET_OPTIONS.lightTypes];
        }

        return options;
    } catch (err) {
        loggerService.error('Failed to get socket options config', err);
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
        const collection = await dbService.getCollection<SocketOptions>(COLLECTION);
        const updatedAt = new Date().toISOString();
        
        await collection.updateOne(
            { _id: SOCKET_OPTIONS_ID } as any,
            {
                $push: { [field]: value } as any,
                $set: { updatedAt }
            },
            { upsert: true }
        );

        current[field] = [...list, value];
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
        const collection = await dbService.getCollection<SocketOptions>(COLLECTION);
        const updatedAt = new Date().toISOString();

        await collection.updateOne(
            { _id: SOCKET_OPTIONS_ID } as any,
            {
                $set: {
                    [field]: updatedList,
                    updatedAt
                } as any
            },
            { upsert: true }
        );

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
        const collection = await dbService.getCollection<SocketOptions>(COLLECTION);
        const updatedAt = new Date().toISOString();
        const doc: SocketOptions = {
            _id: SOCKET_OPTIONS_ID,
            screwTypes: newOptions.screwTypes.map(s => s.trim()).filter(Boolean),
            lightTypes: newOptions.lightTypes.map(l => l.trim()).filter(Boolean),
            updatedAt
        };

        await collection.updateOne(
            { _id: SOCKET_OPTIONS_ID } as any,
            { $set: doc as any },
            { upsert: true }
        );

        return doc;
    } catch (err) {
        loggerService.error('Failed to update socket options config', err);
        throw err;
    }
}

async function getSiteOptions(): Promise<SiteOptions> {
    try {
        const collection = await dbService.getCollection<SiteOptions>(COLLECTION);
        let options = await collection.findOne({ _id: SITE_OPTIONS_ID } as any);

        if (!options) {
            const initialDoc: SiteOptions = {
                ...DEFAULT_SITE_OPTIONS,
                updatedAt: new Date().toISOString()
            };
            await collection.insertOne(initialDoc as any);
            options = initialDoc;
        }

        return {
            _id: SITE_OPTIONS_ID,
            isNewCollectionActive: options.isNewCollectionActive !== false,
            updatedAt: options.updatedAt
        };
    } catch (err) {
        loggerService.error('Failed to get site options config', err);
        return {
            ...DEFAULT_SITE_OPTIONS,
            updatedAt: new Date().toISOString()
        };
    }
}

async function updateSiteOptions(updateData: { isNewCollectionActive: boolean }): Promise<SiteOptions> {
    try {
        const collection = await dbService.getCollection<SiteOptions>(COLLECTION);
        const updatedAt = new Date().toISOString();
        const doc: SiteOptions = {
            _id: SITE_OPTIONS_ID,
            isNewCollectionActive: updateData.isNewCollectionActive,
            updatedAt
        };

        await collection.updateOne(
            { _id: SITE_OPTIONS_ID } as any,
            { $set: doc as any },
            { upsert: true }
        );

        return doc;
    } catch (err) {
        loggerService.error('Failed to update site options config', err);
        throw err;
    }
}

