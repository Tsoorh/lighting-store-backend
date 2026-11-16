import crypto from 'crypto';
import { cloudinary } from '../../services/cloudinary.service';
import { loggerService } from '../../services/logger.service';
import { optionsService } from '../options/options.service';
import { DEFAULT_GALLERY_CONFIG, GalleryConfig, GalleryItem } from '../../model/gallery.model';

const GALLERY_DOC_ID = 'gallery_items';

export const galleryService = {
    getGalleryConfig,
    updateGalleryConfig,
    generateUploadSignature,
};

async function getGalleryConfig(): Promise<GalleryConfig> {
    try {
        const { data, updatedAt } = await optionsService.getOptionDoc(GALLERY_DOC_ID, {
            items: [] as GalleryItem[],
        });

        const items = Array.isArray(data.items)
            ? [...(data.items as GalleryItem[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            : [];

        return {
            _id: GALLERY_DOC_ID,
            id: GALLERY_DOC_ID,
            items,
            updatedAt,
        };
    } catch (err) {
        loggerService.error('Failed to get gallery config from PostgreSQL', err);
        return {
            ...DEFAULT_GALLERY_CONFIG,
            updatedAt: new Date().toISOString(),
        };
    }
}

async function updateGalleryConfig(items: GalleryItem[]): Promise<GalleryConfig> {
    try {
        const normalizedItems: GalleryItem[] = items.map((item, idx) => ({
            ...item,
            isVisible: item.isVisible !== false,
            order: idx,
            createdAt: item.createdAt || new Date().toISOString(),
        }));

        const updatedAt = await optionsService.upsertOptionDoc(GALLERY_DOC_ID, {
            items: normalizedItems,
        });

        return {
            _id: GALLERY_DOC_ID,
            id: GALLERY_DOC_ID,
            items: normalizedItems,
            updatedAt,
        };
    } catch (err) {
        loggerService.error('Failed to update gallery config in PostgreSQL', err);
        throw err;
    }
}

function generateUploadSignature() {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_KEY;

    if (!apiSecret || !apiKey || !cloudName) {
        throw new Error('Cloudinary credentials are not fully configured on the server');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const randomSalt = crypto.randomBytes(4).toString('hex');
    const folder = 'tiran_lasry/gallery/images';
    const publicId = `gallery_${timestamp}_${randomSalt}`;

    const paramsToSign = {
        folder,
        public_id: publicId,
        timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
        signature,
        timestamp,
        apiKey,
        cloudName,
        publicId,
        folder,
    };
}
