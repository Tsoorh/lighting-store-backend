import express from 'express';
import { exportExcel, exportPdf, getProductById, getProducts, removeProduct, saveProduct } from './product.controller';
import { requireAdmin, requireAuth } from '../../middlewares/requireAuth.middleware';

const routes = express.Router()

routes.get("/", getProducts)
routes.get("/export/pdf", requireAuth, exportPdf)
routes.get("/export/excel", requireAuth, exportExcel)
routes.get("/:productId", getProductById)
routes.post("/", requireAdmin, saveProduct)
routes.put("/", requireAdmin, saveProduct)
routes.delete("/:productId", requireAdmin, removeProduct)


export const productRoutes = routes