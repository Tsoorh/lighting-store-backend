export type CanonicalSlotId = 'slot_1' | 'slot_3' | 'slot_4' | 'slot_5' | 'slot_6'
export type MediaTarget = 'hero_video' | 'gallery' | 'full_width_banner'

export interface ObjectPosition {
    x: number // 0 to 100, default 50
    y: number // 0 to 100, default 50
}

export interface FullWidthBannerConfig {
    enabled: boolean
    position: number // 1 to 5 (placement slot between sections)
    url: string
    publicId?: string | null
    alt: { en: string; he: string }
    objectPosition: ObjectPosition
    linkUrl?: string | null
    recommendedResolution?: string
    targetRatio?: number
    updatedAt?: string
    updatedBy?: {
        _id: string
        fullname: string
        username: string
    }
}

export interface GallerySlotItem {
    id: CanonicalSlotId
    slotIndex: number // 0, 2, 3, 4, 5 in grid order
    title: { en: string; he: string }
    aspectRatioType: 'wide' | 'square'
    targetRatio: number // 2.113 for wide, 1.000 for square
    recommendedResolution: string
    url: string
    publicId?: string | null
    objectPosition: ObjectPosition
    alt: { en: string; he: string }
    updatedAt?: string
    updatedBy?: {
        _id: string
        fullname: string
        username: string
    }
}

export interface HeroVideoConfig {
    url: string
    publicId?: string | null
    posterUrl?: string | null
    posterPublicId?: string | null
    objectPosition: ObjectPosition
    updatedAt?: string
    updatedBy?: {
        _id: string
        fullname: string
        username: string
    }
}

export interface SiteMediaConfig {
    _id: string // 'homepage_media'
    version: number // Optimistic concurrency version counter
    publicationId?: string
    heroVideo: HeroVideoConfig
    gallery: Record<CanonicalSlotId, GallerySlotItem>
    fullWidthBanner?: FullWidthBannerConfig
    updatedAt: string
}

export interface SiteMediaLogEntry {
    _id?: string
    publicationId: string // Shared across all slots published together
    actionType: 'replacement' | 'restoration'
    mediaType: MediaTarget
    slotId: CanonicalSlotId | 'hero_video' | 'full_width_banner'
    slotName: { en: string; he: string }
    previousAsset: {
        url: string
        publicId?: string | null
        posterUrl?: string | null
        posterPublicId?: string | null
        objectPosition?: ObjectPosition
    }
    newAsset: {
        url: string
        publicId?: string | null
        posterUrl?: string | null
        posterPublicId?: string | null
        objectPosition?: ObjectPosition
    }
    restoredFromLogId?: string
    replacedAt: string
    replacedBy: {
        _id: string
        fullname: string
        username: string
        role: string
    }
}

export const CANONICAL_SLOT_IDS: CanonicalSlotId[] = [
    'slot_1',
    'slot_3',
    'slot_4',
    'slot_5',
    'slot_6'
]

export const DEFAULT_FULL_WIDTH_BANNER: FullWidthBannerConfig = {
    enabled: false,
    position: 2,
    url: '/images/Figma/Living_room.png',
    publicId: null,
    alt: { en: 'Handcrafted architectural lighting', he: 'גופי תאורה אדריכליים בעבודת יד' },
    objectPosition: { x: 50, y: 50 },
    linkUrl: '',
    recommendedResolution: '1920 x 800 px',
    targetRatio: 2.4
}

export const DEFAULT_SITE_MEDIA: SiteMediaConfig = {
    _id: 'homepage_media',
    version: 1,
    heroVideo: {
        url: '/images/Figma/Main_video.mp4',
        posterUrl: '',
        objectPosition: { x: 50, y: 50 }
    },
    fullWidthBanner: DEFAULT_FULL_WIDTH_BANNER,
    gallery: {
        slot_1: {
            id: 'slot_1',
            slotIndex: 0,
            title: { en: 'Top Wide (Slot 1)', he: 'עליון רחב (משבצת 1)' },
            aspectRatioType: 'wide',
            targetRatio: 2.113,
            recommendedResolution: '1724 x 816 px',
            url: '/images/Figma/Tiran_Frame.png',
            objectPosition: { x: 50, y: 50 },
            alt: { en: 'Tiran frame', he: 'מסגרת טירן' }
        },
        slot_3: {
            id: 'slot_3',
            slotIndex: 2,
            title: { en: 'Middle Square (Slot 3)', he: 'מרכז ריבועי (משבצת 3)' },
            aspectRatioType: 'square',
            targetRatio: 1.0,
            recommendedResolution: '816 x 816 px',
            url: '/images/Figma/Green_light.png',
            objectPosition: { x: 50, y: 50 },
            alt: { en: 'Green light', he: 'תאורה ירוקה' }
        },
        slot_4: {
            id: 'slot_4',
            slotIndex: 3,
            title: { en: 'Middle Wide (Slot 4)', he: 'מרכז רחב (משבצת 4)' },
            aspectRatioType: 'wide',
            targetRatio: 2.113,
            recommendedResolution: '1724 x 816 px',
            url: '/images/Figma/Living_room.png',
            objectPosition: { x: 50, y: 50 },
            alt: { en: 'Living room', he: 'סלון' }
        },
        slot_5: {
            id: 'slot_5',
            slotIndex: 4,
            title: { en: 'Bottom Wide (Slot 5)', he: 'תחתון רחב (משבצת 5)' },
            aspectRatioType: 'wide',
            targetRatio: 2.113,
            recommendedResolution: '1724 x 816 px',
            url: '/images/Figma/Table_light.png',
            objectPosition: { x: 50, y: 50 },
            alt: { en: 'Table light', he: 'מנורת שולחן' }
        },
        slot_6: {
            id: 'slot_6',
            slotIndex: 5,
            title: { en: 'Bottom Square (Slot 6)', he: 'תחתון ריבועי (משבצת 6)' },
            aspectRatioType: 'square',
            targetRatio: 1.0,
            recommendedResolution: '816 x 816 px',
            url: '/images/Figma/Wall_light.png',
            objectPosition: { x: 50, y: 50 },
            alt: { en: 'Wall light', he: 'מנורת קיר' }
        }
    },
    updatedAt: new Date(0).toISOString()
}

