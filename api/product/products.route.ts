import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    createProductUploadSignature,
    exportExcel,
    exportPdf,
    getProductById,
    getProducts,
    removeProduct,
    saveProduct,
} from './product.controller';
import { requireAdmin, requireAuth } from '../../middlewares/requireAuth.middleware';

const routes = express.Router()

export const exportLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: { error: 'Too many price-list export requests, please try again shortly.' },
    standardHeaders: true,
    legacyHeaders: false,
})

routes.get("/", getProducts)
routes.get("/export/pdf", requireAuth, exportLimiter, exportPdf)
routes.get("/export/excel", requireAuth, exportLimiter, exportExcel)
routes.post("/upload-signature", requireAdmin, createProductUploadSignature)
routes.get("/:productId", getProductById)
routes.post("/", requireAdmin, saveProduct)
routes.put("/", requireAdmin, saveProduct)
routes.delete("/:productId", requireAdmin, removeProduct)


export const productRoutes = routes