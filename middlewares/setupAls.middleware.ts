import { asyncLocalStorage } from "../services/als.service"
import { authService } from "../api/auth/auth.service"
import { userService } from "../api/user/user.service"
import type { NextFunction, Response, Request } from "express"
import type { Miniuser } from "../model/user.model"
import { loggerService } from "../services/logger.service"

type AlsStore = {
    loggedinUser?: Miniuser
}

export function setupAsyncLocalStorage(req: Request, res: Response, next: NextFunction) {
    const storage: AlsStore = {}
    asyncLocalStorage.run(storage, async () => {
        if (!req.cookies?.loginToken) {
            if (req.url.includes('/api/')) loggerService.debug(`No loginToken cookie for request: ${req.url}`);
            return next();
        }
        try {
            const tokenUser = authService.validateToken(req.cookies.loginToken);
            if (tokenUser && tokenUser._id) {
                const freshUser = await userService.getById(String(tokenUser._id));
                if (freshUser) {
                    const alsStore = asyncLocalStorage.getStore() as AlsStore | undefined;
                    if (alsStore) alsStore.loggedinUser = freshUser;
                } else {
                    loggerService.warn(`Revoked session for deleted user ${tokenUser._id} on ${req.url}`);
                    res.clearCookie('loginToken', { path: '/' });
                    res.clearCookie('refreshToken', { path: '/' });
                }
            }
        } catch {
            loggerService.debug(`Session token expired or invalid for ${req.url}`);
        }
        next();
    })
}