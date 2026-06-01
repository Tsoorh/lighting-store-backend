import { Filter, ObjectId } from "mongodb"
import { dbService } from "../../services/db.service"
import { loggerService } from "../../services/logger.service"
import { genericService } from "../../services/generic.service"
import { FilterBy, Product } from "../../model/product.model"
import { asyncLocalStorage } from "../../services/als.service"
import { Miniuser } from "../../model/user.model"



const COLLECTION = 'product'

const genericProductService = genericService(COLLECTION)

export const productService = {
    query,
    getById,
    add: genericProductService.add,
    update: genericProductService.update,
    remove: genericProductService.remove
}

async function query(filterBy: FilterBy = {}) {
    const criteria = _getCriteria(filterBy)
    const products = await genericProductService.query(criteria) as Product[]
    return products.map(p => _applyPricingLogic(p))
}

async function getById(productId: string) {
    const product = await genericProductService.getById(productId) as Product
    if (!product) return product
    return _applyPricingLogic(product)
}

function _applyPricingLogic<T extends Product>(product: T): T {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser
    const role = (user?.role || 'normal').toLowerCase()

    const p = { ...product }

    if (role === 'normal' || user?.showPrices === false) {
        delete p.price
    } else if (p.price !== undefined) {
        if (user?.priceMultiplier !== undefined) {
            // Apply specific multiplier from user DB object
            p.price = p.price * user.priceMultiplier
        } else if (role === 'supplier') {
            p.price = p.price * 0.5
        } else if (role === 'architect') {
            p.price = p.price * 1.1
        }
    }

    return p
}

function _getCriteria(filterBy: FilterBy) {
    const criteria: Filter<Product> = {}
    if (filterBy.txt) {
        const regex = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [
            { "name.en": regex },
            { "name.he": regex },
            { "description.en": regex },
            { "description.he": regex }
        ]
    }
    if (filterBy.price) {
        criteria.price = { $lte: filterBy.price }
    }
    if (filterBy.category) {
        const regex= { $regex: filterBy.category, $options: 'i' }
        criteria.$or = [
            {"category.en" : regex},
            {"category.he" : regex}
        ]
    }
    return criteria
}