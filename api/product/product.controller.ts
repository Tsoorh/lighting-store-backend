import crypto from "crypto";
import type { Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { productService } from "./products.service";
import { FullProduct, ProductParams, FilterBy } from "../../model/product.model";
import { cloudinary, cloudinaryService } from "../../services/cloudinary.service";
import { getCloudinaryPublicId } from "../../services/cloudinary-url.util";
import { ProductSaveSchema, ProductUploadSignatureSchema } from "./product.schema";
import { exportService } from "../../services/export.service";
import { asyncLocalStorage } from "../../services/als.service";
import { Miniuser } from "../../model/user.model";
import { galleryService } from "../gallery/gallery.service";




export async function getProducts(req: Request, res: Response) {
    const { txt, price, category, isNew } = req.query

    const filterBy: FilterBy = {
        txt: typeof txt === 'string' ? txt.trim().slice(0, 100) : '',
        price: (price !== undefined && !isNaN(+price)) ? +price : undefined,
        category: typeof category === 'string' ? category.trim().slice(0, 60) : '',
        isNew: isNew === 'true' ? true : isNew === 'false' ? false : undefined
    }
    try {
        const products = await productService.query(filterBy)
        res.send(products)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't get products")
    }
}

export async function getProductById(req: Request<ProductParams>, res: Response) {
    const { productId } = req.params
    try {
        const product = await productService.getById(productId)
        res.send(product)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't get product")
    }
}

export async function saveProduct(req: Request, res: Response): Promise<void> {
    const validation = ProductSaveSchema.safeParse(req.body.product)
    if (!validation.success) {
        loggerService.error('Product validation failed:', validation.error.format())
        res.status(400).send({ error: 'Invalid product data', details: validation.error.format() })
        return
    }

    const product = req.body.product as FullProduct
    try {
        let savedProduct: FullProduct
        let imagesToDelete: string[] = []

        if (product._id) {
            // Optimized Diffing: Fetch only imgsUrl field using projection
            const existingProduct = await productService.getById(product._id.toString()) as Partial<FullProduct> | null
            if (existingProduct) {
                const oldImages = existingProduct.imgsUrl || []
                const newImages = product.imgsUrl || []
                imagesToDelete = oldImages.filter((img: string) => !newImages.includes(img))
            }
            savedProduct = await productService.update(product) as FullProduct
        } else {
            savedProduct = await productService.add(product) as FullProduct
        }

        // Managed Parallelism for Cloudinary deletions
        if (imagesToDelete.length > 0) {
            const deletionTasks = imagesToDelete.map(imgId => {
                const publicId = getCloudinaryPublicId(imgId)
                return cloudinaryService.removeImage(publicId)
            })
            
            Promise.allSettled(deletionTasks).then(results => {
                results.forEach((result, idx) => {
                    if (result.status === 'rejected') {
                        loggerService.error(`Failed to delete image ${imagesToDelete[idx]} from Cloudinary`, result.reason)
                    }
                })
            })
        }

        res.send(savedProduct)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't save product")
    }
}

export async function createProductUploadSignature(req: Request, res: Response) {
    const validation = ProductUploadSignatureSchema.safeParse(req.body)
    if (!validation.success) {
        return res.status(400).send({ error: 'Invalid upload signature parameters' })
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const cloudName = process.env.CLOUDINARY_KEY

    if (!apiSecret || !apiKey || !cloudName) {
        loggerService.error('Cloudinary credentials missing during product upload signature request')
        return res.status(500).send({ error: 'Upload configuration unavailable' })
    }

    const { type, category } = validation.data
    const timestamp = Math.round(Date.now() / 1000)
    const randomSalt = crypto.randomBytes(3).toString('hex').toUpperCase()
    const publicId = `${type}_${category}_${timestamp}_${randomSalt}`

    const signature = cloudinary.utils.api_sign_request({ public_id: publicId, timestamp }, apiSecret)

    return res.json({
        signature,
        timestamp,
        apiKey,
        cloudName,
        publicId,
        folder: '',
    })
}

export async function removeProduct(req: Request<ProductParams>, res: Response) {
    const { productId } = req.params
    try {
        // Fetch only imgsUrl for deletion before removing from DB
        const existingProduct = await productService.getById(productId) as Partial<FullProduct> | null
        const deletedId = await productService.remove(productId)

        // Clean up any gallery items referencing the deleted productId
        await galleryService.clearProductReference(productId).catch((err) => {
            loggerService.warn(`Failed to clear product reference ${productId} from gallery`, err)
        })

        if (existingProduct && existingProduct.imgsUrl && existingProduct.imgsUrl.length > 0) {
            const deletionTasks = existingProduct.imgsUrl.map(imgId => {
                const publicId = getCloudinaryPublicId(imgId)
                return cloudinaryService.removeImage(publicId)
            })

            Promise.allSettled(deletionTasks).then(results => {
                results.forEach((result) => {
                    if (result.status === 'rejected') {
                        loggerService.error(`Failed to delete image from Cloudinary on product removal`, result.reason)
                    }
                })
            })
        }

        res.send(deletedId);
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't remove product")
    }
}

export async function exportPdf(req: Request, res: Response) {
    const { loggedinUser } = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } || {}
    const role = loggedinUser?.role?.toLowerCase()
    if (role !== 'admin' && role !== 'supplier' && role !== 'architect') {
        return res.status(403).send('Not Authorized')
    }

    try {
        const products = await productService.query({ isActive: true }) as FullProduct[]
        const title = `מחירון - ${loggedinUser?.fullname || ''}`
        const buffer = await exportService.generatePDF(products, title)

        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', 'attachment; filename="price-list.pdf"')
        res.send(buffer)
    } catch (err) {
        loggerService.error('Failed to export PDF', err instanceof Error ? { message: err.message, stack: err.stack } : err)
        res.status(500).send('Internal Server Error')
    }
}

export async function exportExcel(req: Request, res: Response) {
    const { loggedinUser } = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } || {}
    const role = loggedinUser?.role?.toLowerCase()
    if (role !== 'admin' && role !== 'supplier' && role !== 'architect') {
        return res.status(403).send('Not Authorized')
    }

    try {
        const products = await productService.query({ isActive: true }) as FullProduct[]
        const title = `מחירון - ${loggedinUser?.fullname || ''}`
        const buffer = await exportService.generateExcel(products, title)

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', 'attachment; filename="price-list.xlsx"')
        res.send(buffer)
    } catch (err) {
        loggerService.error('Failed to export Excel', err)
        res.status(500).send('Internal Server Error')
    }
}