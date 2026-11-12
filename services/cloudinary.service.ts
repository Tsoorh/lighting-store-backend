import { v2 as cloudinary } from 'cloudinary';
import { loggerService } from './logger.service';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_KEY,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    signature_algorithm: 'sha256',
});

export { cloudinary };

export const cloudinaryService = {
    removeImage
};

async function removeImage(publicId: string) {
    try {
        return await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        loggerService.error('Failed to remove image from Cloudinary', err);
        throw err;
    }
}
