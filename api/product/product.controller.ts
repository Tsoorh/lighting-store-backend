import type { Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { productService } from "./products.service";
import { FullProduct, ProductParams, FilterBy } from "../../model/product.model";
import { cloudinaryService } from "../../services/cloudinary.service";




export async function getProducts(req: Request, res: Response) {
    const { txt, price, category } = req.query

    const filterBy: FilterBy = {
        txt: (txt as string) || '',
        price: (price !== undefined && !isNaN(+price)) ? +price : undefined,
        category: (category as string) || ''
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

function _getCloudinaryPublicId(imgId: string): string {
    if (imgId.startsWith('C_') || imgId.startsWith('H_')) return imgId
    return `4G8A${imgId}`
}

export async function saveProduct(req: Request, res: Response): Promise<void> {
    const product = req.body.product as FullProduct
    try {
        let savedProduct: FullProduct
        let imagesToDelete: string[] = []

        if (product._id) {
            // Logic for deleting removed images from Cloudinary
            const existingProduct = await productService.getById(product._id.toString()) as FullProduct | null
            if (existingProduct) {
                const oldImages = existingProduct.imgsUrl || []
                const newImages = product.imgsUrl || []
                imagesToDelete = oldImages.filter((img: string) => !newImages.includes(img))
            }
            savedProduct = await productService.update(product) as FullProduct
        } else {
            savedProduct = await productService.add(product) as FullProduct
        }

        // Only delete from Cloudinary if DB update was successful
        if (imagesToDelete.length > 0) {
            imagesToDelete.forEach((imgId: string) => {
                const publicId = _getCloudinaryPublicId(imgId)
                cloudinaryService.removeImage(publicId).catch(err => {
                    loggerService.error(`Failed to delete image ${publicId} from Cloudinary`, err)
                })
            })
        }

        res.send(savedProduct)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't save product")
    }
}

export async function removeProduct(req: Request<ProductParams>, res: Response) {
    const { productId } = req.params
    try {
        const existingProduct = await productService.getById(productId) as FullProduct | null
        const deletedId = await productService.remove(productId)

        if (existingProduct && existingProduct.imgsUrl) {
            existingProduct.imgsUrl.forEach((imgId: string) => {
                const publicId = _getCloudinaryPublicId(imgId)
                cloudinaryService.removeImage(publicId).catch(err => {
                    loggerService.error(`Failed to delete image ${publicId} from Cloudinary on product removal`, err)
                })
            })
        }

        res.send(deletedId);
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't remove product")
    }
}