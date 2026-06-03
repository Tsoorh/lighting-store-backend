const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test-unicode.pdf'));
doc.registerFont('Heebo', '../../lighting-store-frontend/src/assets/fonts/Heebo/static/Heebo-Regular.ttf');
doc.font('Heebo');
doc.fontSize(20);

const RLE = '\u202B';
const PDF = '\u202C';

doc.text('Tiran Lasry - מחירון', { align: 'right' });
doc.text(RLE + 'Tiran Lasry - מחירון' + PDF, { align: 'right' });
doc.text(RLE + 'מחיר: ₪100 / N/A' + PDF, { align: 'right' });
doc.text(RLE + 'הברגה: G9' + PDF, { align: 'right' });

doc.end();
