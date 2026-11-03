export type ProductWithMeta = {
    name?: { he?: string; en?: string };
    description?: { he?: string; en?: string };
    imgsUrl?: string[];
    [key: string]: any;
};

export function getProductCardImageUrl(imgsUrl: string[] = []): string {
    const rawImgs = Array.isArray(imgsUrl) ? imgsUrl : [];
    const cleanUrls = rawImgs.map((url: string) =>
        url.replace(/[\r\n\s]+/g, '').replace(/\.[^/.]+$/, '').replace(/^4G8A/i, '')
    );
    const filteredUrls = cleanUrls.filter((u: string) => u !== 'coming-soon');
    const cPhoto = filteredUrls.find((u: string) => u.toUpperCase().startsWith('C_'));
    const hPhoto = filteredUrls.find((u: string) => u.toUpperCase().startsWith('H_'));
    const otherPhoto = filteredUrls.find((u: string) => 
        !u.toUpperCase().startsWith('C_') && 
        !u.toUpperCase().startsWith('H_') && 
        !u.toUpperCase().startsWith('S_')
    );
    const sPhoto = filteredUrls.find((u: string) => u.toUpperCase().startsWith('S_'));

    const chosenImg = cPhoto || hPhoto || otherPhoto || sPhoto;
    if (!chosenImg) {
        return 'https://tiranlasry.com/images/Figma/Tiran_T_Grey_Logo.png';
    }

    const cloudId = process.env.CLOUDINARY_KEY || 'dhixlriwm';
    const nameWithout4G8A = chosenImg.replace(/^4G8A/i, '');
    const upper = nameWithout4G8A.toUpperCase();
    const publicId = (upper.startsWith('C_') || upper.startsWith('H_') || upper.startsWith('S_'))
        ? nameWithout4G8A
        : `4G8A${nameWithout4G8A}`;

    return `https://res.cloudinary.com/${cloudId}/image/upload/c_pad,b_white,w_1200,h_630,f_jpg,q_auto/${publicId}`;
}

export function injectProductOpenGraph(html: string, product: ProductWithMeta, pageUrl: string): string {
    const rawTitle = product.name?.he || product.name?.en || 'גוף תאורה';
    const title = `${rawTitle} | טירן לסרי`;
    const desc = product.description?.he || product.description?.en || 'גוף תאורה מעוצב בעבודת יד מבית טירן לסרי';
    const ogImage = getProductCardImageUrl(product.imgsUrl);

    const escape = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const metaTags = `
    <title>${escape(title)}</title>
    <meta property="og:site_name" content="טירן לסרי - אמנות התאורה" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(desc)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escape(pageUrl)}" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(desc)}" />
    <meta name="twitter:image" content="${ogImage}" />
    `;

    // Replace existing title if present
    let modified = html.replace(/<title>.*?<\/title>/i, '');
    // Inject before </head>
    return modified.replace('</head>', `${metaTags}\n</head>`);
}
