const DEFAULT_CLOUD_ID = 'dhixlriwm';

export function cleanImageName(raw: string): string {
    return raw.replace(/[\r\n\s]+/g, '').replace(/\.[^/.]+$/, '').replace(/^4G8A/i, '');
}

export function getCloudinaryPublicId(imgId: string): string {
    const cleanId = cleanImageName(imgId);
    const upper = cleanId.toUpperCase();
    if (upper.startsWith('C_') || upper.startsWith('H_') || upper.startsWith('S_')) {
        return cleanId;
    }
    return `4G8A${cleanId}`;
}

export function pickPrimaryProductImage(imgsUrl: string[] = []): string | null {
    const rawImgs = Array.isArray(imgsUrl) ? imgsUrl : [];
    const filteredUrls = rawImgs
        .map(cleanImageName)
        .filter((u) => u && u !== 'coming-soon');

    if (filteredUrls.length === 0) return null;

    const cPhoto = filteredUrls.find((u) => u.toUpperCase().startsWith('C_'));
    const hPhoto = filteredUrls.find((u) => u.toUpperCase().startsWith('H_'));
    const otherPhoto = filteredUrls.find((u) => {
        const upper = u.toUpperCase();
        return !upper.startsWith('C_') && !upper.startsWith('H_') && !upper.startsWith('S_');
    });
    const sPhoto = filteredUrls.find((u) => u.toUpperCase().startsWith('S_'));

    return cPhoto || hPhoto || otherPhoto || sPhoto || null;
}

export function buildCloudinaryUrl(imgId: string, transform = '', extension = ''): string {
    const cloudId = process.env.CLOUDINARY_KEY || DEFAULT_CLOUD_ID;
    const publicId = imgId === 'coming-soon' ? 'coming-soon' : getCloudinaryPublicId(imgId);
    const transformSegment = transform ? `${transform}/` : '';
    const extSegment = extension ? `.${extension.replace(/^\./, '')}` : '';
    return `https://res.cloudinary.com/${cloudId}/image/upload/${transformSegment}${publicId}${extSegment}`;
}
