import express from "express";
import rateLimit from "express-rate-limit";
import { getLoginToken, loginCont, logoutCont, registerCont } from "./auth.controller";
import { requireAdmin } from "../../middlewares/requireAuth.middleware";


const routes = express.Router()

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    skipSuccessfulRequests: true,
    message: { error: 'Too many failed authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
})

routes.post("/login", authLimiter, loginCont)
routes.post("/logout", logoutCont)
routes.post("/register", requireAdmin, authLimiter, registerCont)
routes.post("/refresh-token", getLoginToken)


export const authRoutes = routes