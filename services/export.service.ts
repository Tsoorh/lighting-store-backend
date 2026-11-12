import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import axios from 'axios';
import path from 'path';
import { FullProduct } from '../model/product.model';
import { buildCloudinaryUrl, pickPrimaryProductImage } from './cloudinary-url.util';
import { loggerService } from './logger.service';

export const exportService = {
    generatePDF,
    generateExcel
};

const EXPORT_IMG_TRANSFORM = 'w_300,h_300,c_limit,q_auto,f_jpg';

async function _fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (err) {
        loggerService.error(`Failed to fetch image from ${url}`, err);
        return null;
    }
}

function _isSupportedImage(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 8) return false;
    // JPEG: FF D8
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return true;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    return false;
}

function _getExportImageUrl(imgsUrl: string[] | undefined): string {
    const imgName = pickPrimaryProductImage(imgsUrl) || 'coming-soon';
    return buildCloudinaryUrl(imgName, EXPORT_IMG_TRANSFORM, 'jpg');
}

async function _prefetchImages(products: FullProduct[], validateFormat = false): Promise<Map<string, Buffer>> {
    const uniqueImgUrls = Array.from(new Set(products.map(p => _getExportImageUrl(p.imgsUrl))));
    const imageBuffers = new Map<string, Buffer>();

    await Promise.allSettled(uniqueImgUrls.map(async url => {
        const buffer = await _fetchImageBuffer(url);
        if (!buffer) return;
        if (!validateFormat || _isSupportedImage(buffer)) {
            imageBuffers.set(url, buffer);
        } else {
            loggerService.warn(`Fetched buffer for ${url} is not a supported format (JPEG/PNG). Skipping.`);
        }
    }));

    return imageBuffers;
}

async function generatePDF(products: FullProduct[], title: string): Promise<Buffer> {
    const imageBuffers = await _prefetchImages(products, true);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            doc.on('error', reject);
            const buffers: Buffer[] = [];

            const fontPath = path.join(process.cwd(), 'assets/fonts/Heebo-Regular.ttf');
            const fontBoldPath = path.join(process.cwd(), 'assets/fonts/Heebo-Bold.ttf');

            doc.registerFont('Heebo', fontPath);
            doc.registerFont('Heebo-Bold', fontBoldPath);
            doc.font('Heebo');

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            doc.font('Heebo-Bold').fontSize(24).text(title, { align: 'center' });
            doc.moveDown();

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
                        : [{ wood: { he: '', en: '' }, amount: 0 }];

                    for (const priceEntry of prices) {
                        const startY = doc.y;

                        if (product.imgsUrl && product.imgsUrl.length > 0) {
                            const imgUrl = _getExportImageUrl(product.imgsUrl);
                            const imgBuffer = imageBuffers.get(imgUrl);
                            if (imgBuffer) {
                                try {
                                    doc.image(imgBuffer, 50, startY, { fit: [100, 100] });
                                } catch (imgErr) {
                                    loggerService.error(`Skipping image draw for product ${product.name.en}`, imgErr);
                                }
                            }
                        }

                        const displayName = priceEntry.wood.en
                            ? `${product.name.en} - ${priceEntry.wood.en}`
                            : product.name.en;

                        doc.font('Heebo-Bold').fontSize(12).text(displayName, 160, startY, { width: 350 });
                        if (priceEntry.sku) {
                            doc.font('Heebo').fontSize(10).text(`SKU: ${priceEntry.sku}`, 160, doc.y + 2);
                        }
                        doc.font('Heebo').fontSize(10).text(`Price: ₪${priceEntry.amount?.toLocaleString() || 'N/A'}`, 160, doc.y + 2);
                        doc.font('Heebo').fontSize(10).text(`Socket: ${product.socketType?.screwType || 'N/A'}`, 160, doc.y + 2);

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
    const imageBuffers = await _prefetchImages(products);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Price List');

    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    const headerRow = sheet.addRow(['Image', 'SKU', 'Product Name', 'Category', 'Socket', 'Price']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 40;
    sheet.getColumn(4).width = 25;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 15;

    for (const product of products) {
        const prices = (product.price && Array.isArray(product.price) && product.price.length > 0)
            ? product.price
            : [{ wood: { he: '', en: '' }, amount: 0 }];

        for (const priceEntry of prices) {
            const displayName = priceEntry.wood.en
                ? `${product.name.en} - ${priceEntry.wood.en}`
                : product.name.en;

            const row = sheet.addRow([
                '',
                priceEntry.sku || '',
                displayName,
                product.category?.map(c => c.en).join(', ') || '',
                product.socketType?.screwType || '',
                priceEntry.amount
            ]);
            row.height = 90;
            row.alignment = { vertical: 'middle', horizontal: 'left' };

            if (product.imgsUrl && product.imgsUrl.length > 0) {
                const imgUrl = _getExportImageUrl(product.imgsUrl);
                const imgBuffer = imageBuffers.get(imgUrl);
                if (imgBuffer) {
                    try {
                        const imageId = workbook.addImage({
                            buffer: imgBuffer as unknown as ExcelJS.Buffer,
                            extension: 'jpeg',
                        });
                        sheet.addImage(imageId, {
                            tl: { col: 0, row: row.number - 1 },
                            ext: { width: 100, height: 100 },
                            editAs: 'oneCell'
                        });
                    } catch (e) {
                        loggerService.error('Failed to draw image on excel', e);
                    }
                }
            }
        }
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
}
