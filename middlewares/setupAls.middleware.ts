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
        if (!req.cookies?.loginToken) return next()
        try {
            const loggedinUser = authService.validateToken(req.cookies.loginToken);
            if (loggedinUser) {
                const alsStore = asyncLocalStorage.getStore() as AlsStore | undefined
                if (alsStore) alsStore.loggedinUser = loggedinUser
            }
        } catch (err) {
            // Token is expired or invalid. 
            // We use debug here because TokenExpiredError is expected and handled by the frontend refresh flow.
            loggerService.debug('Session token expired or invalid');
        }
        next();
    })

}