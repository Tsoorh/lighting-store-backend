import { getProductCardImageUrl, injectProductOpenGraph } from '../services/og-meta.service';

describe('OG Meta Service', () => {
    describe('getProductCardImageUrl', () => {
        it('should prioritize catalog card photo (C_ prefix)', () => {
            const imgs = [
                'H_pendant_hero.webp',
                '4G8A1234.webp',
                'C_card_photo.webp',
                'S_sketch.webp'
            ];
            const url = getProductCardImageUrl(imgs);
            expect(url).toContain('C_card_photo');
            expect(url).toContain('f_jpg');
            expect(url).toContain('w_1200,h_630');
            expect(url).toContain('c_pad,b_white');
        });

        it('should fallback to hero photo (H_) when C_ is not present', () => {
            const imgs = [
                '4G8A1234.webp',
                'H_hero_photo.webp',
                'S_sketch.webp'
            ];
            const url = getProductCardImageUrl(imgs);
            expect(url).toContain('H_hero_photo');
        });

        it('should fallback to numbered photo when neither C_ nor H_ is present', () => {
            const imgs = [
                '4G8A5678.webp',
                'S_sketch.webp'
            ];
            const url = getProductCardImageUrl(imgs);
            expect(url).toContain('4G8A5678');
        });

        it('should fallback to default logo when no valid images exist', () => {
            const url = getProductCardImageUrl([]);
            expect(url).toContain('Tiran_T_Grey_Logo.png');
        });

        it('should ignore coming-soon placeholder', () => {
            const imgs = ['coming-soon', 'C_real_product.webp'];
            const url = getProductCardImageUrl(imgs);
            expect(url).toContain('C_real_product');
        });
    });

    describe('injectProductOpenGraph', () => {
        const baseHtml = `<!doctype html><html><head><title>Tiran Lasry</title></head><body><div id="root"></div></body></html>`;

        it('should inject Open Graph and Twitter card meta tags', () => {
            const product = {
                name: { he: 'מנורת פליז', en: 'Brass Pendant' },
                description: { he: 'גוף תאורה אלגנטי', en: 'Elegant fixture' },
                imgsUrl: ['C_brass_pendant.webp']
            };

            const enriched = injectProductOpenGraph(baseHtml, product, 'https://tiranlasry.com/product/123');

            expect(enriched).toContain('<meta property="og:title" content="מנורת פליז | טירן לסרי" />');
            expect(enriched).toContain('<meta property="og:description" content="גוף תאורה אלגנטי" />');
            expect(enriched).toContain('C_brass_pendant');
            expect(enriched).toContain('<meta property="og:url" content="https://tiranlasry.com/product/123" />');
            expect(enriched).toContain('<meta name="twitter:card" content="summary_large_image" />');
            expect(enriched).toContain('<title>מנורת פליז | טירן לסרי</title>');
        });

        it('should handle HTML escaping in product titles and descriptions', () => {
            const product = {
                name: { he: 'גוף תאורה "דגם 1" & יוקרה', en: 'Model "1" & Luxury' },
                description: { he: 'מנורה <מיוחדת>', en: 'Special <lamp>' },
                imgsUrl: ['C_model_1.webp']
            };

            const enriched = injectProductOpenGraph(baseHtml, product, 'https://tiranlasry.com/product/456');

            expect(enriched).toContain('&quot;דגם 1&quot; &amp; יוקרה');
            expect(enriched).toContain('&lt;מיוחדת&gt;');
        });
    });
});
