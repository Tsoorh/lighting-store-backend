import express from 'express';
import { requireAdmin } from '../../middlewares/requireAuth.middleware';
import { getUsers, getUserById, saveUser, removeUser, updateBulkMultiplier } from './user.controller';

const routes = express.Router()

routes.get("/", requireAdmin, getUsers)
routes.put("/bulk-multiplier", requireAdmin, updateBulkMultiplier)
routes.get("/:userId", requireAdmin, getUserById)
routes.post("/", requireAdmin, saveUser)
routes.put("/", requireAdmin, saveUser)
routes.delete("/:userId", requireAdmin, removeUser)

export const userRoutes = routes