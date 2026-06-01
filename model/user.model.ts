import { ObjectId } from "mongodb"

export type Role = 'normal' | 'admin' | 'supplier' | 'architect'

export type Miniuser = {
    _id?: ObjectId
    fullname: string
    username: string
    role?: Role
    priceMultiplier?: number
    showPrices?: boolean
}

export type User = Miniuser & {
    password: string
}

export type UserIdParams = {
    userId: string
}
export type UsernameParams = {
    username: string
}

export type UserInBody = {
    body: {
        user: User
    }
}
 
export type LoginCredentials={
    username:string
    password:string
}

export type CredentialInBody={
    body: LoginCredentials
}