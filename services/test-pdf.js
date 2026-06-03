const PDFDocument = require('pdfkit');
const fs = require('fs');
const bidiFactory = require('bidi-js');
const bidi = bidiFactory();

function _getVisualText(str) {
    if (!str) return '';
    const embeddingLevels = bidi.getEmbeddingLevels(str, 'rtl');
    return bidi.getReorderedString(str, embeddingLevels);
}

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.registerFont('Heebo', '../../lighting-store-frontend/src/assets/fonts/Heebo/static/Heebo-Regular.ttf');
doc.font('Heebo');
doc.fontSize(20);

// Test 1: Native no features
doc.text('Test 1 Native: מחיר: ₪100 - Tiran Lasry');

// Test 2: Native with rtla
doc.text('Test 2 RTLA: מחיר: ₪100 - Tiran Lasry', { features: ['rtla'] });

// Test 3: bidi-js
doc.text('Test 3 Bidi: ' + _getVisualText('מחיר: ₪100 - Tiran Lasry'));

doc.end();
