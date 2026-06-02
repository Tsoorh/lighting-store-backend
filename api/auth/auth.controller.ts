import { CookieOptions, Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { authService } from "./auth.service";
import { CredentialInBody, LoginCredentials, Miniuser, User, UserInBody } from "../../model/user.model";
import { error } from "node:console";

const COOKIES_OPTIONS_ACCESS: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 30 // 30 MINUTES
}
const COOKIES_OPTIONS_REFRESH: CookieOptions = {
    ...COOKIES_OPTIONS_ACCESS,
    maxAge: 1000 * 60 * 60 * 24 * 3 // 3 DAYS
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
        if (!req.cookies?.loginToken && !req.cookies.refreshToken) throw new Error("Couln't logout - no one is logged in")

        //clear cookies
        if (req.cookies?.loginToken) res.clearCookie('loginToken', { httpOnly: true, sameSite: 'lax', path: '/' })
        if (req.cookies?.refreshToken) res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/' })

        res.status(200).send("Loggedout successfully")
    } catch (err) {
        loggerService.error("Couldn't logout: ", err)
        throw err
    }
}

export async function getLoginToken(req: Request, res: Response) {
    try {
        
        if (!req.cookies?.refreshToken) throw new Error('Please Login')
            const miniUser: Miniuser = authService.validateRefreshToken(req.cookies.refreshToken)
        
        //create Cookies
        const loginToken = authService.getLoginAccessToken(miniUser)
        const refreshToken = authService.getLoginRefreshToken(miniUser)
        res.cookie('loginToken', loginToken, COOKIES_OPTIONS_ACCESS)
        res.cookie('refreshToken', refreshToken, COOKIES_OPTIONS_REFRESH)
        
        res.status(200).send("login refreshed")
    }catch(err){
        loggerService.error("Couldn't refresh login: ", err)
        throw err
    }
}