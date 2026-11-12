import {
    cleanImageName,
    getCloudinaryPublicId,
    pickPrimaryProductImage,
    buildCloudinaryUrl
} from '../services/cloudinary-url.util';

describe('cloudinary-url.util', () => {
    it('strips whitespace, extension, and 4G8A prefix cleanly', () => {
        expect(cleanImageName(' 4G8A1234.webp\n')).toBe('1234');
        expect(cleanImageName('C_card_photo.png')).toBe('C_card_photo');
    });

    it('preserves C_, H_, S_ prefixes and restores 4G8A prefix for numbered ids', () => {
        expect(getCloudinaryPublicId('C_pendant.webp')).toBe('C_pendant');
        expect(getCloudinaryPublicId('h_hero.jpg')).toBe('h_hero');
        expect(getCloudinaryPublicId('S_sketch.png')).toBe('S_sketch');
        expect(getCloudinaryPublicId('4G8A5678.webp')).toBe('4G8A5678');
        expect(getCloudinaryPublicId('5678.webp')).toBe('4G8A5678');
    });

    it('picks primary product image with C_ > H_ > numbered > S_ priority', () => {
        expect(pickPrimaryProductImage(['S_1.jpg', '4G8A12.jpg', 'H_1.jpg', 'C_1.jpg'])).toBe('C_1');
        expect(pickPrimaryProductImage(['S_1.jpg', '4G8A12.jpg', 'H_1.jpg'])).toBe('H_1');
        expect(pickPrimaryProductImage(['S_1.jpg', '4G8A12.jpg'])).toBe('12');
        expect(pickPrimaryProductImage(['S_1.jpg'])).toBe('S_1');
        expect(pickPrimaryProductImage(['coming-soon'])).toBeNull();
    });

    it('builds Cloudinary URLs with transforms and extensions', () => {
        const url = buildCloudinaryUrl('C_test.webp', 'w_1200,h_630,f_jpg', 'jpg');
        expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/w_1200,h_630,f_jpg\/C_test\.jpg$/);

        const comingSoonUrl = buildCloudinaryUrl('coming-soon', 'f_webp');
        expect(comingSoonUrl).toMatch(/\/image\/upload\/f_webp\/coming-soon$/);
    });
});
