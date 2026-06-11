import { ObjectId } from "mongodb"

export type FilterBy = {
    txt?: string
    price?: number
    category?:string
    isActive?: boolean
}

type hebrewEnglishObj = {
    he:string
    en:string
}

export type ProductPrice = {
    wood: hebrewEnglishObj
    amount: number
}

export type Product = {
    _id?: ObjectId
    name: hebrewEnglishObj
    description: hebrewEnglishObj
    price?: ProductPrice[]
    isActive?: boolean
}

export type ProductParams = { productId: string }

export type ProductSize = {
    height?: number
    diameter?: number
    length?: number
    width?: number
    upTo?: number
}
type SocketType = {
    screwType: string
    lightType: string
}

export type FullProduct = Product & {
    category:hebrewEnglishObj[]
    imgsUrl: string[]
    diameter?: number
    size: ProductSize[]
    socketType:SocketType
    material:hebrewEnglishObj[]
    woodType:hebrewEnglishObj[]
    isActive?: boolean
}