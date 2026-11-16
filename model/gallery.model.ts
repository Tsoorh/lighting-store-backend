export interface GalleryBilingualText {
    en?: string | null;
    he?: string | null;
}

export type GalleryCategory = 'pendant' | 'wall' | 'ceiling' | 'projects';

export interface GalleryItem {
    id: string;
    url: string;
    publicId?: string | null;
    title?: GalleryBilingualText | null;
    category?: GalleryCategory | null;
    productId?: string | null;
    isVisible?: boolean;
    order: number;
    createdAt?: string;
}

export interface GalleryConfig {
    _id: string;
    id?: string;
    items: GalleryItem[];
    updatedAt?: string;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
    _id: 'gallery_items',
    id: 'gallery_items',
    items: [],
};
