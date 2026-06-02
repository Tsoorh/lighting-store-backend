import { genericService } from "../../services/generic.service"
import { loggerService } from "../../services/logger.service"
import type { Miniuser, User } from "../../model/user.model"
import { ObjectId } from "mongodb"
import bcrypt from 'bcrypt';
import { dbService } from "../../services/db.service"

const SALTROUNDS = Number(process.env.SALT_ROUNDS) || 11
const COLLECTION: string = 'user'

const genericUserService = genericService(COLLECTION)

export const userService = {
    query,
    add,
    update,
    remove: (userId: string) => genericUserService.remove(userId),
    getByUsername,
    getById,
    updateBulkMultiplier
}

async function add(user: User): Promise<User> {
    try {
        if (user.password) {
            user.password = await bcrypt.hash(user.password as string, SALTROUNDS)
        }
        if (user.role) user.role = user.role.trim().toLowerCase() as any
        return await genericUserService.add(user) as User
    } catch (err) {
        loggerService.error("Couldn't add user", err)
        throw err
    }
}

async function update(user: User): Promise<User> {
    try {
        if (user.password) {
            user.password = await bcrypt.hash(user.password as string, SALTROUNDS)
        } else {
            // Remove password field if it's empty to avoid overwriting existing password with empty string
            delete user.password
        }
        if (user.role) user.role = user.role.trim().toLowerCase() as any
        return await genericUserService.update(user) as User
    } catch (err) {
        loggerService.error("Couldn't update user", err)
        throw err
    }
}

async function updateBulkMultiplier(role: string, multiplier: number): Promise<number> {
    try {
        const collection = await dbService.getCollection(COLLECTION)
        // Use regex for case-insensitive matching to handle existing data inconsistencies
        const criteria = { role: { $regex: new RegExp(`^${role.trim()}$`, 'i') } }
        const res = await collection.updateMany(criteria, { $set: { priceMultiplier: multiplier } })
        return res.modifiedCount
    } catch (err) {
        loggerService.error(`Couldn't update bulk multiplier for role: ${role}`, err)
        throw err
    }
}

async function query(criteria = {}): Promise<Miniuser[]> {
    try {
        const users = await genericUserService.query(criteria) as User[]
        return users.map(user => convertUserToMiniUser(user))
    } catch (err) {
        loggerService.error("Couldn't get users", err)
        throw err
    }
}

async function getByUsername(username: string): Promise<User | null> {
    try {
        const criteria = { username:username }
        let users = await genericUserService.query(criteria);
        if (!users || Array.isArray(users) && users.length === 0) return null
        return users[0] as User
    } catch (err) {
        loggerService.error("Couldn't get user by username")
        throw err
    }
}
async function getById(userId: string): Promise<Miniuser | null> {
    try {
        const criteria = { _id: new ObjectId(userId) }
        const users = await genericUserService.query(criteria);
        if (!users || users.length === 0) return null
        return convertUserToMiniUser(users[0] as User)
    } catch (err) {
        loggerService.error("Couldn't get user by id")
        throw err
    }
}

export function convertUserToMiniUser(user: User): Miniuser {
    if (!user) return {} as Miniuser
    const mini: Miniuser = {
        _id: user._id,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        priceMultiplier: user.priceMultiplier,
        showPrices: user.showPrices
    }
    return mini
}