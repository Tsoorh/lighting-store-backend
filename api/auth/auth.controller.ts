import { CookieOptions, Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { authService } from "./auth.service";
import { CredentialInBody, Miniuser, User } from "../../model/user.model";
import { userService } from "../user/user.service";
import { loginSchema, registerSchema } from "./auth.schema";

const isProd = process.env.NODE_ENV === 'production';

const COOKIES_OPTIONS_ACCESS: CookieOptions = {
    httpOnly: true,
    sameSite: isProd ? 'lax' : 'lax', // 'lax' works perfectly now because api.tiranlasry.com and tiranlasry.com share the same parent domain
    secure: isProd,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 1825 // 5 YEAR (365 DAYS)
}
const COOKIES_OPTIONS_REFRESH: CookieOptions = {
    ...COOKIES_OPTIONS_ACCESS,
    maxAge: 1000 * 60 * 60 * 24 * 1825 // 5 YEAR (365 DAYS)
}



export async function registerCont(req: Request<Record<string, never>, unknown, {newuser: User}>, res: Response) {
    const validation = registerSchema.safeParse(req.body)
    if (!validation.success) {
        return res.status(400).send({ error: validation.error.issues[0]?.message || 'Invalid registration payload' })
    }
    const newuser = validation.data.newuser as User
    try {
        const newMiniUser = await authService.register(newuser)
        res.status(200).send(newMiniUser)
    } catch (err) {
        loggerService.error("Couldn't register: ", err)
        res.status(400).send({ error: err instanceof Error ? err.message : 'Failed to register' })
    }
}

export async function loginCont(req: Request<Record<string, never>, unknown, CredentialInBody>, res: Response) {
    const validation = loginSchema.safeParse(req.body)
    if (!validation.success) {
        return res.status(400).send({ error: validation.error.issues[0]?.message || 'Username and password are required' })
    }
    const { credentials } = validation.data
    try {
        const miniUser = await authService.login(credentials.username, credentials.password)

        //CREATE COOKIES 
        const loginToken = authService.getLoginAccessToken(miniUser)
        const refreshToken = authService.getLoginRefreshToken(miniUser)
        res.cookie('loginToken', loginToken, COOKIES_OPTIONS_ACCESS)
        res.cookie('refreshToken', refreshToken, COOKIES_OPTIONS_REFRESH)


        res.status(200).send(miniUser)
    } catch (err) {
        loggerService.error("Couldn't login: ", err)
        res.status(400).send({ error: err instanceof Error ? err.message : 'Failed to login' })
    }
}

export async function logoutCont(req: Request, res: Response) {
    try {
        // Clear cookies regardless of whether they exist in the request
        res.clearCookie('loginToken', COOKIES_OPTIONS_ACCESS)
        res.clearCookie('refreshToken', COOKIES_OPTIONS_REFRESH)

        res.status(200).send("Logged out successfully")
    } catch (err) {
        loggerService.error("Couldn't logout: ", err)
        res.status(500).send("Failed to logout")
    }
}

export async function getLoginToken(req: Request, res: Response) {
    try {
        if (!req.cookies?.refreshToken) {
            return res.status(401).send({ error: 'Please Login' })
        }

        let miniUser: Miniuser
        try {
            miniUser = authService.validateRefreshToken(req.cookies.refreshToken)
        } catch (tokenErr) {
            loggerService.warn("Invalid or expired refresh token: ", tokenErr)
            return res.status(401).send({ error: 'Session expired. Please Login' })
        }

        // Fetch freshest user details from DB to keep role and price multiplier synced
        if (miniUser._id) {
            try {
                const freshUser = await userService.getById(String(miniUser._id))
                if (!freshUser) {
                    loggerService.warn(`User ${miniUser._id} not found during refresh`)
                    return res.status(401).send({ error: 'User no longer exists' })
                }
                miniUser = freshUser
            } catch (dbErr) {
                loggerService.warn("Could not re-fetch user from DB during refresh, using token payload", dbErr)
            }
        }

        // Create refreshed Cookies (Rolling sliding window renewal)
        const loginToken = authService.getLoginAccessToken(miniUser)
        const refreshToken = authService.getLoginRefreshToken(miniUser)
        res.cookie('loginToken', loginToken, COOKIES_OPTIONS_ACCESS)
        res.cookie('refreshToken', refreshToken, COOKIES_OPTIONS_REFRESH)

        res.status(200).send(miniUser)
    } catch (err) {
        loggerService.error("Couldn't refresh login: ", err)
        res.status(500).send({ error: "Failed to refresh session" })
    }
}