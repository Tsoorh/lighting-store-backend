import { loggerService } from "../../services/logger.service"
import jwt from 'jsonwebtoken';
import { Miniuser, User } from "../../model/user.model";
import { convertUserToMiniUser, userService } from "../user/user.service";
import bcrypt from 'bcrypt';


const ACCESS_TOKEN_KEY = process.env.ACCESS_TOKEN_KEY || 'Tiran_Lasry_SecretKEY'
const REFRESH_TOKEN_KEY = process.env.REFRESH_TOKEN_KEY || 'Tiran_Lasry_SecretKEY'
const SALTROUNDS = Number(process.env.SALT_ROUNDS) || 11

export const authService = {
    getLoginAccessToken,
    getLoginRefreshToken,
    validateToken,
    validateRefreshToken,
    login,
    register
}



function getLoginAccessToken(user: Miniuser) {
    return jwt.sign(user, ACCESS_TOKEN_KEY, { expiresIn: '15m' })
}

function getLoginRefreshToken(user: Miniuser) {
    return jwt.sign(user, REFRESH_TOKEN_KEY, { expiresIn: '7d' })
}

function validateToken(token: string):Miniuser {
    return jwt.verify(token, ACCESS_TOKEN_KEY) as Miniuser
}

function validateRefreshToken(token: string): Miniuser {
    return jwt.verify(token, REFRESH_TOKEN_KEY) as Miniuser
}



async function login(username: string, password: string): Promise<Miniuser> {
    try {
        const userDetails = await userService.getByUsername(username);
        if (!userDetails || !userDetails.password) throw new Error("Username or password is incorrect")
        
        const match = await bcrypt.compare(password, userDetails.password)
        if (!match) throw new Error("Username or password is incorrect")
        
        const miniUser: Miniuser = {
            _id: userDetails._id,
            username: userDetails.username,
            fullname: userDetails.fullname,
            role: userDetails.role,
            priceMultiplier: userDetails.priceMultiplier,
            showPrices: userDetails.showPrices
        }
        return miniUser
    } catch (err) {
        loggerService.error("Couldn't login", err)
        throw err
    }
}
async function register(user: User): Promise<Miniuser> {
    try {
        if (!user.fullname || !user.password || !user.username) throw new Error("Missing required information");

        const userDetails = await userService.getByUsername(user.username);
        if (userDetails) throw new Error("Username already taken")
        
        const hash = await bcrypt.hash(user.password as string, SALTROUNDS)
        const userToSave: User = { ...user, password: hash }
        
        const userWithId = await userService.add(userToSave)

        return convertUserToMiniUser(userWithId)
    } catch (err) {
        loggerService.error("Couldn't register", err)
        throw err
    }
}
