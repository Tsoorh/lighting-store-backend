import { CookieOptions, Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { authService } from "./auth.service";
import { CredentialInBody, LoginCredentials, Miniuser, User, UserInBody } from "../../model/user.model";
import { userService } from "../user/user.service";

const isProd = process.env.NODE_ENV === 'production';

const COOKIES_OPTIONS_ACCESS: CookieOptions = {
    httpOnly: true,
    sameSite: isProd ? 'lax' : 'lax', // 'lax' works perfectly now because api.tiranlasry.com and tiranlasry.com share the same parent domain
    secure: isProd,
    path: '/',
    maxAge: 1000 * 60 * 30 // 30 MINUTES
}
const COOKIES_OPTIONS_REFRESH: CookieOptions = {
    ...COOKIES_OPTIONS_ACCESS,
    maxAge: 1000 * 60 * 60 * 24 * 1825 // 1 YEAR (365 DAYS)
}



export async function registerCont(req: Request<any, any, {newuser: User}>, res: Response) {
    const newuser: User = req.body.newuser
    try {
        const newMiniUser = await authService.register(newuser)
        res.status(200).send(newMiniUser)
    } catch (err) {
        loggerService.error("Couldn't register: ", err)
        throw err
    }
}

export async function loginCont(req: Request<any, any, CredentialInBody>, res: Response) {
    const credentials: LoginCredentials = req.body.credentials
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
        throw err
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