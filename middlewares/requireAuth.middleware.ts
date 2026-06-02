import { Request, Response, NextFunction } from "express"
import { authService } from "../api/auth/auth.service"
import { loggerService } from "../services/logger.service"
import { asyncLocalStorage } from "../services/als.service"
import { Miniuser } from "../model/user.model"

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const { loggedinUser } = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } || {}
    if (!loggedinUser) return res.status(401).send('Not Authenticated')
    next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const { loggedinUser } = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } || {}
    if (!loggedinUser) {
        loggerService.warn('Unauthorized attempt - no user in ALS')
        return res.status(401).send('Not Authenticated')
    }
    
    const isAdmin = loggedinUser.role && loggedinUser.role.trim().toLowerCase() === 'admin'
    if (!isAdmin) {
        loggerService.warn(loggedinUser.fullname + ' attempted to perform admin action. Role: ' + loggedinUser.role)
        res.status(403).send('Not Authorized')
        return
    }
    next()
}
