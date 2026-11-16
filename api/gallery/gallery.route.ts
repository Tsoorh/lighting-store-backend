import express from 'express';
import { galleryController } from './gallery.controller';
import { requireAdmin } from '../../middlewares/requireAuth.middleware';

const router = express.Router();

router.get('/', galleryController.getGallery);
router.post('/upload-signature', requireAdmin, galleryController.createUploadSignature);
router.put('/', requireAdmin, galleryController.updateGallery);

export const galleryRoutes = router;
