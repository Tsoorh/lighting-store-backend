import crypto from "crypto"
import { dbService } from "../../services/db.service"
import { loggerService } from "../../services/logger.service"
import { FilterBy, FullProduct, Product } from "../../model/product.model"
import { asyncLocalStorage } from "../../services/als.service"
import { Miniuser } from "../../model/user.model"

export const productService = {
    query,
    getById,
    add,
    update,
    remove
}

function _mapRowToProduct(row: any): FullProduct {
    return {
        _id: row.id,
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price || [],
        imgsUrl: row.imgs_url || [],
        size: row.size || [],
        woodType: row.wood_type || [],
        material: row.material || [],
        socketType: row.socket_type || { screwType: '', lightType: '' },
        category: row.category || [],
        isActive: row.is_active,
        isNew: row.is_new
    }
}

async function query(filterBy: FilterBy = {}): Promise<FullProduct[]> {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser
    const isAdmin = user?.role && user.role.trim().toLowerCase() === 'admin'

    const conditions: string[] = []
    const values: any[] = []

    // 1. Active status
    if (filterBy.isActive === true) {
        conditions.push('is_active IS NOT FALSE')
    } else if (filterBy.isActive === false) {
        conditions.push('is_active = FALSE')
    } else if (!isAdmin) {
        conditions.push('is_active IS NOT FALSE')
    }

    // 2. New collection status
    if (filterBy.isNew !== undefined) {
        values.push(filterBy.isNew)
        conditions.push(`is_new = $${values.length}`)
    }

    // 3. Search text (multilingual in name & description)
    if (filterBy.txt && filterBy.txt.trim()) {
        values.push(`%${filterBy.txt.trim()}%`)
        const idx = values.length
        conditions.push(`(
            name->>'en' ILIKE $${idx} OR 
            name->>'he' ILIKE $${idx} OR 
            description->>'en' ILIKE $${idx} OR 
            description->>'he' ILIKE $${idx}
        )`)
    }

    // 4. Max price filter across price array
    if (filterBy.price !== undefined && !isNaN(filterBy.price)) {
        values.push(filterBy.price)
        const idx = values.length
        conditions.push(`EXISTS (
            SELECT 1 FROM jsonb_array_elements(price) AS p 
            WHERE (p->>'amount')::numeric <= $${idx}
        )`)
    }

    // 5. Category filter
    if (filterBy.category && filterBy.category.toLowerCase() !== 'all') {
        const cat = filterBy.category.toLowerCase().trim()
        if (cat === 'new-collection' || cat === 'new collection' || cat === 'new') {
            conditions.push(`(
                is_new = TRUE OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(category) AS c 
                    WHERE c->>'en' ILIKE '%new%' OR c->>'he' ILIKE '%חדש%'
                )
            )`)
        } else {
            values.push(`%${cat}%`)
            const idx = values.length
            conditions.push(`EXISTS (
                SELECT 1 FROM jsonb_array_elements(category) AS c 
                WHERE c->>'en' ILIKE $${idx} OR c->>'he' ILIKE $${idx}
            )`)
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `
        SELECT id, name, description, price, imgs_url, size, wood_type, material, socket_type, category, is_active, is_new
        FROM public.products
        ${whereClause}
        ORDER BY id ASC;
    `

    try {
        const result = await dbService.query(sql, values)
        const products = result.rows.map(_mapRowToProduct)
        return products.map(p => _applyPricingLogic(p))
    } catch (err) {
        loggerService.error("Couldn't query products from PostgreSQL", err)
        throw err
    }
}

async function getById(productId: string, options: any = {}): Promise<FullProduct | null> {
    try {
        const sql = `
            SELECT id, name, description, price, imgs_url, size, wood_type, material, socket_type, category, is_active, is_new
            FROM public.products
            WHERE id = $1;
        `
        const result = await dbService.query(sql, [productId])
        if (result.rows.length === 0) return null

        const product = _mapRowToProduct(result.rows[0])

        const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
        const user = store?.loggedinUser
        const isAdmin = user?.role && user.role.trim().toLowerCase() === 'admin'

        if (!isAdmin && product.isActive === false) return null

        return _applyPricingLogic(product)
    } catch (err) {
        loggerService.error(`Couldn't get product by id: ${productId}`, err)
        throw err
    }
}

async function add(product: FullProduct): Promise<FullProduct> {
    try {
        const id = product._id || product.id || crypto.randomBytes(12).toString('hex')
        const sql = `
            INSERT INTO public.products (
                id, name, description, price, imgs_url, size, wood_type, material, socket_type, category, is_active, is_new
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `
        const values = [
            id,
            JSON.stringify(product.name || { he: '', en: '' }),
            JSON.stringify(product.description || { he: '', en: '' }),
            JSON.stringify(product.price || []),
            JSON.stringify(product.imgsUrl || []),
            JSON.stringify(product.size || []),
            JSON.stringify(product.woodType || []),
            JSON.stringify(product.material || []),
            JSON.stringify(product.socketType || { screwType: '', lightType: '' }),
            JSON.stringify(product.category || []),
            product.isActive !== false,
            !!product.isNew
        ]

        const result = await dbService.query(sql, values)
        return _mapRowToProduct(result.rows[0])
    } catch (err) {
        loggerService.error("Couldn't add product to PostgreSQL", err)
        throw err
    }
}

async function update(product: FullProduct): Promise<FullProduct> {
    const id = product._id || product.id
    if (!id) throw new Error('Update requires an _id or id')

    try {
        const sql = `
            UPDATE public.products SET
                name = $2,
                description = $3,
                price = $4,
                imgs_url = $5,
                size = $6,
                wood_type = $7,
                material = $8,
                socket_type = $9,
                category = $10,
                is_active = $11,
                is_new = $12
            WHERE id = $1
            RETURNING *;
        `
        const values = [
            id,
            JSON.stringify(product.name || { he: '', en: '' }),
            JSON.stringify(product.description || { he: '', en: '' }),
            JSON.stringify(product.price || []),
            JSON.stringify(product.imgsUrl || []),
            JSON.stringify(product.size || []),
            JSON.stringify(product.woodType || []),
            JSON.stringify(product.material || []),
            JSON.stringify(product.socketType || { screwType: '', lightType: '' }),
            JSON.stringify(product.category || []),
            product.isActive !== false,
            !!product.isNew
        ]

        const result = await dbService.query(sql, values)
        if (result.rowCount === 0) {
            throw new Error(`Couldn't find product to update with id: ${id}`)
        }

        return _mapRowToProduct(result.rows[0])
    } catch (err) {
        loggerService.error(`Couldn't update product in PostgreSQL with id: ${id}`, err)
        throw err
    }
}

async function remove(productId: string): Promise<string> {
    try {
        const sql = `DELETE FROM public.products WHERE id = $1 RETURNING id;`
        const result = await dbService.query(sql, [productId])
        if (result.rowCount === 0) {
            throw new Error(`Couldn't remove product with id: ${productId}. ID not found.`)
        }
        return productId
    } catch (err) {
        loggerService.error(`Couldn't remove product from PostgreSQL with id: ${productId}`, err)
        throw err
    }
}

function _applyPricingLogic<T extends FullProduct>(product: T): T {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const user = store?.loggedinUser

    const p = { ...product }

    // If no user or guest, don't show prices
    if (!user || user.showPrices === false) {
        if (p.price && Array.isArray(p.price)) {
            p.price = p.price.map(priceEntry => {
                const cleanPrice: any = { ...priceEntry }
                delete cleanPrice.amount
                return cleanPrice
            })
        }
    } else if (p.price && Array.isArray(p.price)) {
        if (user?.priceMultiplier !== undefined) {
            // Apply specific multiplier from user DB object to each price entry
            const isSupplierOrArchitect = user?.role === 'supplier' || user?.role === 'architect'
            p.price = p.price.map(priceEntry => {
                let newAmount = priceEntry.amount * (user.priceMultiplier as number)
                if (isSupplierOrArchitect) {
                    newAmount = Math.round(newAmount)
                }
                return {
                    ...priceEntry,
                    amount: newAmount
                }
            })
        }
    }

    return p
}
