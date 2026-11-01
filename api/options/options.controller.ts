import { Request, Response } from 'express';
import { optionsService } from './options.service';
import { 
    socketOptionCategorySchema, 
    socketOptionItemSchema, 
    socketOptionsUpdateSchema,
    siteOptionsUpdateSchema
} from './options.schema';
import { loggerService } from '../../services/logger.service';

export const optionsController = {
    getSocketOptions,
    addSocketOption,
    removeSocketOption,
    updateSocketOptions,
    getSiteOptions,
    updateSiteOptions
};

async function getSocketOptions(req: Request, res: Response) {
    try {
        const options = await optionsService.getSocketOptions();
        res.json(options);
    } catch (err: any) {
        loggerService.error('optionsController.getSocketOptions failed', err);
        res.status(500).json({ error: 'Failed to retrieve socket options' });
    }
}

async function addSocketOption(req: Request, res: Response) {
    try {
        const categoryResult = socketOptionCategorySchema.safeParse(req.params.category);
        if (!categoryResult.success) {
            return res.status(400).json({ error: 'Invalid category. Must be "screw" or "light"' });
        }

        const valueResult = socketOptionItemSchema.safeParse(req.body);
        if (!valueResult.success) {
            return res.status(400).json({ 
                error: 'Invalid option value', 
                details: valueResult.error.flatten() 
            });
        }

        const updated = await optionsService.addSocketOption(categoryResult.data, valueResult.data.value);
        res.json(updated);
    } catch (err: any) {
        loggerService.error('optionsController.addSocketOption failed', err);
        res.status(500).json({ error: err.message || 'Failed to add socket option' });
    }
}

async function removeSocketOption(req: Request, res: Response) {
    try {
        const categoryResult = socketOptionCategorySchema.safeParse(req.params.category);
        if (!categoryResult.success) {
            return res.status(400).json({ error: 'Invalid category. Must be "screw" or "light"' });
        }

        const rawValue = req.params.value || req.body?.value;
        const valueResult = socketOptionItemSchema.safeParse({ value: rawValue });
        if (!valueResult.success) {
            return res.status(400).json({ 
                error: 'Invalid option value to remove', 
                details: valueResult.error.flatten() 
            });
        }

        const updated = await optionsService.removeSocketOption(categoryResult.data, valueResult.data.value);
        res.json(updated);
    } catch (err: any) {
        loggerService.error('optionsController.removeSocketOption failed', err);
        res.status(500).json({ error: err.message || 'Failed to remove socket option' });
    }
}

async function updateSocketOptions(req: Request, res: Response) {
    try {
        const validation = socketOptionsUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ 
                error: 'Invalid options payload', 
                details: validation.error.flatten() 
            });
        }

        const updated = await optionsService.updateSocketOptions(validation.data);
        res.json(updated);
    } catch (err: any) {
        loggerService.error('optionsController.updateSocketOptions failed', err);
        res.status(500).json({ error: err.message || 'Failed to update socket options' });
    }
}

async function getSiteOptions(req: Request, res: Response) {
    try {
        const options = await optionsService.getSiteOptions();
        res.json(options);
    } catch (err: any) {
        loggerService.error('optionsController.getSiteOptions failed', err);
        res.status(500).json({ error: 'Failed to retrieve site options' });
    }
}

async function updateSiteOptions(req: Request, res: Response) {
    try {
        const validation = siteOptionsUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ 
                error: 'Invalid site options payload', 
                details: validation.error.flatten() 
            });
        }

        const updated = await optionsService.updateSiteOptions(validation.data);
        res.json(updated);
    } catch (err: any) {
        loggerService.error('optionsController.updateSiteOptions failed', err);
        res.status(500).json({ error: err.message || 'Failed to update site options' });
    }
}

