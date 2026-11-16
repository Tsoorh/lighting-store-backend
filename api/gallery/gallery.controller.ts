import { Request, Response } from 'express';
import { galleryService } from './gallery.service';
import { galleryUpdateSchema } from './gallery.schema';
import { loggerService } from '../../services/logger.service';

export const galleryController = {
    getGallery,
    createUploadSignature,
    updateGallery,
};

async function getGallery(req: Request, res: Response) {
    try {
        const config = await galleryService.getGalleryConfig();
        res.json(config);
    } catch (err: unknown) {
        loggerService.error('galleryController.getGallery failed', err);
        res.status(500).json({ error: 'Failed to retrieve gallery configuration' });
    }
}

async function createUploadSignature(req: Request, res: Response) {
    try {
        const signatureData = galleryService.generateUploadSignature();
        res.json(signatureData);
    } catch (err: unknown) {
        loggerService.error('galleryController.createUploadSignature failed', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Failed to generate upload signature',
        });
    }
}

async function updateGallery(req: Request, res: Response) {
    try {
        const validation = galleryUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid gallery payload',
                details: validation.error.flatten(),
            });
        }

        const updated = await galleryService.updateGalleryConfig(validation.data.items);
        res.json(updated);
    } catch (err: unknown) {
        loggerService.error('galleryController.updateGallery failed', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Failed to update gallery configuration',
        });
    }
}
