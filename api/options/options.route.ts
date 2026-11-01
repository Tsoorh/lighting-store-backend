import express from 'express';
import { optionsController } from './options.controller';
import { requireAdmin } from '../../middlewares/requireAuth.middleware';

const router = express.Router();

router.get('/socket', optionsController.getSocketOptions);
router.post('/socket/:category', requireAdmin, optionsController.addSocketOption);
router.delete('/socket/:category/:value', requireAdmin, optionsController.removeSocketOption);
router.delete('/socket/:category', requireAdmin, optionsController.removeSocketOption);
router.put('/socket', requireAdmin, optionsController.updateSocketOptions);

router.get('/site', optionsController.getSiteOptions);
router.put('/site', requireAdmin, optionsController.updateSiteOptions);

export const optionsRoutes = router;

