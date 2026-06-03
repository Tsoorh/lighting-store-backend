import { Filter, FindOptions, ObjectId } from "mongodb"
import { dbService } from "../../services/db.service"
import { loggerService } from "../../services/logger.service"
import { genericService } from "../../services/generic.service"
import { FilterBy, Product } from "../../model/product.model"
import { asyncLocalStorage } from "../../services/als.service"
import { Miniuser } from "../../model/user.model"

const COLLECTION = 'product'

const genericProductService = genericService<Product>(COLLECTION)

export const productService = {
    query,
    getById,
    add: genericProductService.add,
    update: genericProductService.update,
    remove: genericProductService.remove
}

async function query(filterBy: FilterBy = {}) {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser
    const isAdmin = user?.role && user.role.trim().toLowerCase() === 'admin'

    const criteria = _getCriteria(filterBy, !!isAdmin)
    const products = await genericProductService.query(criteria)
    return products.map(p => _applyPricingLogic(p))
}

async function getById(productId: string, options: FindOptions = {}) {
    const product = await genericProductService.getById(productId, options)
    if (!product) return product

    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser
    const isAdmin = user?.role && user.role.trim().toLowerCase() === 'admin'

    if (!isAdmin && product.isActive === false) return null

    return _applyPricingLogic(product)
}

function _applyPricingLogic<T extends Product>(product: T): T {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser
    const role = (user?.role || 'guest').toLowerCase() // Default to guest if no user

    const p = { ...product }

    // If no user or guest, don't show prices
    if (!user || user.showPrices === false) {
        delete p.price
    } else if (p.price !== undefined) {
        if (user?.priceMultiplier !== undefined) {
            // Apply specific multiplier from user DB object
            p.price = p.price * user.priceMultiplier
        }
    }

    return p
}

function _getCriteria(filterBy: FilterBy, isAdmin: boolean = false) {
    const criteria: Filter<Product> = {}
    if (!isAdmin) {
        criteria.isActive = { $ne: false }
    }
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
