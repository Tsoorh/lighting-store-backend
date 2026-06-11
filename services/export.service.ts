import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import axios from 'axios';
import { FullProduct } from '../model/product.model';
import path from 'path';

export const exportService = {
    generatePDF,
    generateExcel
}

// Hebrew support: PDFKit requires reversing strings for RTL and using a supported font
function _reverseHebrew(str: string): string {
    if (!str) return '';
    // Check if string contains Hebrew characters
    if (!/[\u0590-\u05FF]/.test(str)) return str;
    
    // Reverse the order of the words to account for the Left-to-Right base rendering,
    // but DO NOT reverse the characters inside the words.
    // PDFKit's Fontkit handles the RTL character shaping natively for Hebrew letters.
    return str.split(' ').reverse().join(' ');
}

async function _fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (err) {
        console.error(`Failed to fetch image from ${url}`, err);
        return null;
    }
}

function _getImageUrl(imgsUrl: string[] | undefined) {
    const cloudId = process.env.CLOUDINARY_KEY || 'dhixlriwm'
    const transform = 'w_300,h_300,c_limit,q_auto'
    
    if (!imgsUrl || imgsUrl.length === 0) return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/coming-soon.jpg`
    
    const cleanUrls = imgsUrl.map(url => url.replace(/[\r\n\s]+/g, '').replace(/\.[^/.]+$/, ""))
    const cPhoto = cleanUrls.find(url => url.startsWith('C_'))
    const hPhoto = cleanUrls.find(url => url.startsWith('H_'))
    const numPhoto = cleanUrls.find(url => !url.startsWith('C_') && !url.startsWith('H_'))
    
    const imgName = cPhoto || hPhoto || numPhoto || 'coming-soon'
    
    if (imgName === 'coming-soon') return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/coming-soon.jpg`
    if (imgName.startsWith('C_') || imgName.startsWith('H_')) return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/${imgName}.jpg`
    return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/4G8A${imgName}.jpg`
}

async function generatePDF(products: FullProduct[], title: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            const uniqueImgUrls = Array.from(new Set(
                products.map(p => _getImageUrl(p.imgsUrl)).filter(Boolean)
            )) as string[];
            
            const imageBuffers = new Map<string, Buffer>();
            await Promise.allSettled(uniqueImgUrls.map(async url => {
                const buffer = await _fetchImageBuffer(url);
                if (buffer) imageBuffers.set(url, buffer);
            }));

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            const fontPath = path.join(process.cwd(), 'assets/fonts/Heebo-Regular.ttf');
            const fontBoldPath = path.join(process.cwd(), 'assets/fonts/Heebo-Bold.ttf');
            
            doc.registerFont('Heebo', fontPath);
            doc.registerFont('Heebo-Bold', fontBoldPath);
            doc.font('Heebo');

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header - Center Aligned English
            doc.font('Heebo-Bold').fontSize(24).text(title, { align: 'center' });
            doc.moveDown();

            // Group by category (using EN names now)
            const categoryNames = Array.from(new Set(products.flatMap(p => p.category?.map(c => c.en) || [])));
            
            for (const catName of categoryNames) {
                const catProducts = products.filter(p => p.category?.some(c => c.en === catName));
                if (catProducts.length === 0) continue;

                doc.font('Heebo-Bold').fontSize(18).text(catName, { align: 'left' });
                doc.moveDown(0.2);
                doc.rect(50, doc.y, 500, 1).fill('#000');
                doc.moveDown(0.8);

                for (const product of catProducts) {
                    const prices = (product.price && Array.isArray(product.price) && product.price.length > 0)
                        ? product.price
                        : [{ wood: { he: '', en: '' }, amount: 0 }]

                    for (const priceEntry of prices) {
                        const startY = doc.y;
                        
                        // Image (Left side)
                        if (product.imgsUrl && product.imgsUrl.length > 0) {
                            const imgUrl = _getImageUrl(product.imgsUrl);
                            const imgBuffer = imageBuffers.get(imgUrl);
                            if (imgBuffer) {
                                try {
                                    doc.image(imgBuffer, 50, startY, { fit: [100, 100] });
                                } catch (imgErr) {
                                    console.error(`Skipping image draw for product ${product.name.en}`, imgErr);
                                }
                            }
                        }

                        // Product Details (Right of the image)
                        const displayName = priceEntry.wood.en 
                            ? `${product.name.en} - ${priceEntry.wood.en}`
                            : product.name.en

                        // Use relative coordinates to avoid overflow
                        doc.font('Heebo-Bold').fontSize(12).text(displayName, 160, startY, { width: 350 });
                        doc.font('Heebo').fontSize(10).text(`Price: ₪${priceEntry.amount?.toLocaleString() || 'N/A'}`, 160, doc.y + 2);
                        doc.font('Heebo').fontSize(10).text(`Socket: ${product.socketType?.screwType || 'N/A'}`, 160, doc.y + 2);

                        // Ensure enough space for the next item
                        const contentBottom = doc.y;
                        const imageBottom = startY + 110;
                        doc.y = Math.max(contentBottom, imageBottom);
                        
                        doc.moveDown(1);
                        if (doc.y > 700) doc.addPage();
                    }
                }
                doc.moveDown();
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function generateExcel(products: FullProduct[], title: string): Promise<Buffer> {
    const uniqueImgUrls = Array.from(new Set(
        products.map(p => _getImageUrl(p.imgsUrl)).filter(Boolean)
    )) as string[];
    
    const imageBuffers = new Map<string, Buffer>();
    await Promise.allSettled(uniqueImgUrls.map(async url => {
        const buffer = await _fetchImageBuffer(url);
        if (buffer) imageBuffers.set(url, buffer);
    }));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Price List');

    // Title Row
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    // Header Row (English)
    const headerRow = sheet.addRow(['Image', 'Product Name', 'Category', 'Socket', 'Price']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    sheet.getColumn(1).width = 20; // Image
    sheet.getColumn(2).width = 40; // Name
    sheet.getColumn(3).width = 25; // Category
    sheet.getColumn(4).width = 20; // Socket
    sheet.getColumn(5).width = 15; // Price

    for (const product of products) {
        const prices = (product.price && Array.isArray(product.price) && product.price.length > 0)
            ? product.price
            : [{ wood: { he: '', en: '' }, amount: 0 }]

        for (const priceEntry of prices) {
            const displayName = priceEntry.wood.en 
                ? `${product.name.en} - ${priceEntry.wood.en}`
                : product.name.en

            const row = sheet.addRow([
                '', 
                displayName, 
                product.category?.map(c => c.en).join(', ') || '',
                product.socketType?.screwType || '',
                priceEntry.amount
            ]);
            row.height = 90;
            row.alignment = { vertical: 'middle', horizontal: 'left' };

            if (product.imgsUrl && product.imgsUrl.length > 0) {
                const imgUrl = _getImageUrl(product.imgsUrl);
                const imgBuffer = imageBuffers.get(imgUrl);
                if (imgBuffer) {
                    try {
                        const imageId = workbook.addImage({
                            buffer: imgBuffer as any,
                            extension: 'jpeg',
                        });
                        sheet.addImage(imageId, {
                            tl: { col: 0, row: row.number - 1 },
                            ext: { width: 100, height: 100 },
                            editAs: 'oneCell'
                        });
                    } catch(e) {
                        console.error("Failed to draw image on excel", e)
                    }
                }
            }
        }
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
}
