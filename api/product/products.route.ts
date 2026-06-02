import express from 'express';
import { getProductById, getProducts, removeProduct, saveProduct } from './product.controller';
import { requireAdmin } from '../../middlewares/requireAuth.middleware';

const routes = express.Router()

routes.get("/", getProducts)
routes.get("/:productId", getProductById)
routes.post("/", requireAdmin, saveProduct)
routes.put("/", requireAdmin, saveProduct)
routes.delete("/:productId", requireAdmin, removeProduct)


export const productRoutes = routes