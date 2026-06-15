import { asyncLocalStorage } from "../services/als.service"
import { authService } from "../api/auth/auth.service"
import type { NextFunction,Response,Request } from "express"
import type { AsyncLocalStorage } from "async_hooks"
import type { Miniuser } from "../model/user.model"
import { loggerService } from "../services/logger.service"

type AlsStore = {
    loggedinUser?: Miniuser
}

export function setupAsyncLocalStorage(req:Request, res:Response, next:NextFunction) {
    const storage: AlsStore = {}
    asyncLocalStorage.run(storage, () => {
        if (!req.cookies?.loginToken) {
            if (req.url.includes('/api/')) loggerService.debug(`No loginToken cookie for request: ${req.url}`);
            return next();
        }
        try {
            const loggedinUser = authService.validateToken(req.cookies.loginToken);
            if (loggedinUser) {
                const alsStore = asyncLocalStorage.getStore() as AlsStore | undefined
                if (alsStore) alsStore.loggedinUser = loggedinUser
            }
        } catch (err) {
            loggerService.debug(`Session token expired or invalid for ${req.url}`);
        }
        next();
    })

}