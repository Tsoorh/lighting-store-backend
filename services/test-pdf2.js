const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test2.pdf'));
doc.registerFont('Heebo', '../../lighting-store-frontend/src/assets/fonts/Heebo/static/Heebo-Regular.ttf');
doc.font('Heebo');
doc.fontSize(20);

// Just raw string
doc.text('Tiran Lasry - מחירון', { align: 'right' });
doc.text('מחיר: ₪100 / N/A', { align: 'right' });
doc.text('פלנטריום', { align: 'right' });
doc.text('הברגה: G9', { align: 'right' });

doc.end();
