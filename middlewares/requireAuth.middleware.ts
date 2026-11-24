import { Request, Response, NextFunction } from "express"
import { loggerService } from "../services/logger.service"
import { asyncLocalStorage } from "../services/als.service"
import { Miniuser } from "../model/user.model"
import { userService } from "../api/user/user.service"

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const loggedinUser = store?.loggedinUser
    if (!loggedinUser || !loggedinUser._id) {
        loggerService.debug(`requireAuth failed for ${req.url} - no user in ALS`);
        return res.status(401).send('Not Authenticated');
    }

    try {
        const freshUser = await userService.getById(String(loggedinUser._id))
        if (!freshUser) {
            loggerService.warn(`requireAuth failed - user ${loggedinUser._id} no longer exists in DB`)
            return res.status(401).send('Not Authenticated')
        }
        if (store) {
            store.loggedinUser = freshUser
        }
        next()
    } catch (err) {
        loggerService.error('requireAuth verification failed', err)
        return res.status(500).send('Internal Server Error')
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const store = asyncLocalStorage.getStore() as { loggedinUser?: Miniuser } | undefined
    const loggedinUser = store?.loggedinUser
    if (!loggedinUser || !loggedinUser._id) {
        loggerService.warn('Unauthorized attempt - no user in ALS')
        return res.status(401).send('Not Authenticated')
    }

    try {
        // Verify against live PostgreSQL record so deleted or demoted admins cannot reuse long-lived tokens
        const freshUser = await userService.getById(String(loggedinUser._id))
        if (!freshUser) {
            loggerService.warn(`Unauthorized attempt - admin user ${loggedinUser._id} no longer exists`)
            return res.status(401).send('Not Authenticated')
        }

        if (store) {
            store.loggedinUser = freshUser
        }

        const isAdmin = Boolean(freshUser.role && freshUser.role.trim().toLowerCase() === 'admin')
        if (!isAdmin) {
            loggerService.warn(freshUser.fullname + ' attempted to perform admin action. Role: ' + freshUser.role)
            res.status(403).send('Not Authorized')
            return
        }
        next()
    } catch (err) {
        loggerService.error('requireAdmin verification failed', err)
        res.status(500).send('Internal Server Error')
    }
}
