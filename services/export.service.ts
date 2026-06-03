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

function _getImageUrl(imgName: string) {
    const cloudId = process.env.VITE_CLOUDINARY_ID || 'dhixlriwm'
    // Request highly compressed thumbnails (.jpg) for extremely fast export generation
    const transform = 'w_150,h_150,c_limit,q_auto'
    if (imgName === 'coming-soon') return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/coming-soon.jpg`
    if (imgName.startsWith('C_') || imgName.startsWith('H_')) return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/${imgName}.jpg`
    return `https://res.cloudinary.com/${cloudId}/image/upload/${transform}/4G8A${imgName}.jpg`
}

async function generatePDF(products: FullProduct[], title: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            // Pre-fetch all images concurrently to drastically speed up generation
            const uniqueImgUrls = Array.from(new Set(
                products.map(p => p.imgsUrl && p.imgsUrl.length > 0 ? _getImageUrl(p.imgsUrl[0]) : null).filter(Boolean)
            )) as string[];
            
            const imageBuffers = new Map<string, Buffer>();
            await Promise.allSettled(uniqueImgUrls.map(async url => {
                const buffer = await _fetchImageBuffer(url);
                if (buffer) imageBuffers.set(url, buffer);
            }));

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            // Load Font (Heebo supports Hebrew)
            const fontPath = path.join(__dirname, '../../lighting-store-frontend/src/assets/fonts/Heebo/static/Heebo-Regular.ttf');
            const fontBoldPath = path.join(__dirname, '../../lighting-store-frontend/src/assets/fonts/Heebo/static/Heebo-Bold.ttf');
            
            doc.registerFont('Heebo', fontPath);
            doc.registerFont('Heebo-Bold', fontBoldPath);
            doc.font('Heebo');

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.font('Heebo-Bold').fontSize(24).text(_reverseHebrew(title), { align: 'center' });
            doc.moveDown();

            // Group by category
            const categories = Array.from(new Set(products.flatMap(p => p.category?.map(c => c.he) || [])));
            
            for (const cat of categories) {
                const catProducts = products.filter(p => p.category?.some(c => c.he === cat));
                if (catProducts.length === 0) continue;

                doc.font('Heebo-Bold').fontSize(18).text(_reverseHebrew(cat), { align: 'right' });
                doc.moveDown(0.5);
                doc.rect(50, doc.y, 500, 1).fill('#000');
                doc.moveDown();

                for (const product of catProducts) {
                    const y = doc.y;
                    
                    // Image (Left side)
                    if (product.imgsUrl && product.imgsUrl.length > 0) {
                        const imgUrl = _getImageUrl(product.imgsUrl[0]);
                        const imgBuffer = imageBuffers.get(imgUrl);
                        if (imgBuffer) {
                            try {
                                doc.image(imgBuffer, 50, y, { fit: [100, 100] });
                            } catch (imgErr) {
                                console.error(`Skipping image draw for product ${product.name.he}`, imgErr);
                            }
                        }
                    }

                    // Product Details (Right side for Hebrew)
                    doc.font('Heebo-Bold').fontSize(12).text(_reverseHebrew(product.name.he), 350, y, { align: 'right', width: 150 });
                    doc.font('Heebo').fontSize(10).text(_reverseHebrew(`מחיר: ₪${product.price?.toLocaleString() || 'N/A'}`), 350, y + 20, { align: 'right', width: 150 });
                    doc.font('Heebo').fontSize(10).text(_reverseHebrew(`הברגה: ${product.socketType?.screwType || 'N/A'}`), 350, y + 35, { align: 'right', width: 150 });

                    doc.moveDown(6);
                    if (doc.y > 700) doc.addPage();
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
    // Pre-fetch all images concurrently
    const uniqueImgUrls = Array.from(new Set(
        products.map(p => p.imgsUrl && p.imgsUrl.length > 0 ? _getImageUrl(p.imgsUrl[0]) : null).filter(Boolean)
    )) as string[];
    
    const imageBuffers = new Map<string, Buffer>();
    await Promise.allSettled(uniqueImgUrls.map(async url => {
        const buffer = await _fetchImageBuffer(url);
        if (buffer) imageBuffers.set(url, buffer);
    }));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Price List', { views: [{ rightToLeft: true }] });

    // Title Row
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    // Header Row
    const headerRow = sheet.addRow(['תמונה', 'שם מוצר', 'קטגוריה', 'סוג הברגה', 'מחיר']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    sheet.getColumn(1).width = 20; // Image
    sheet.getColumn(2).width = 30; // Name
    sheet.getColumn(3).width = 20; // Category
    sheet.getColumn(4).width = 20; // Socket
    sheet.getColumn(5).width = 15; // Price

    for (const product of products) {
        const row = sheet.addRow([
            '', 
            product.name.he, 
            product.category?.map(c => c.he).join(', ') || '',
            product.socketType?.screwType || '',
            product.price
        ]);
        row.height = 80;
        row.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Image
        if (product.imgsUrl && product.imgsUrl.length > 0) {
            const imgUrl = _getImageUrl(product.imgsUrl[0]);
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
                        editAs: 'undefined'
                    });
                } catch(e) {
                    console.error("Failed to draw image on excel", e)
                }
            }
        }
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
}
