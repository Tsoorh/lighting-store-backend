import { Request, Response } from "express"
import { convertUserToMiniUser, userService } from "./user.service"
import { loggerService } from "../../services/logger.service"
import { Miniuser, User, UserIdParams, UserInBody, UsernameParams } from "../../model/user.model"



export async function getUsers(req: Request, res: Response): Promise<void> {
    try {
        const users = await userService.query()
        res.send(users)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't get users")
    }
}

export async function getUserById(req: Request<UserIdParams>, res: Response): Promise<void> {
    const { userId } = req.params
    try {
        const miniUser = await userService.getById(userId)
        res.send(miniUser)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't get user")
    }
}

export async function saveUser(req: Request<any, any, UserInBody>, res: Response): Promise<void> {
    const user = req.body.user
    if (!user) {
        res.status(400).send("Missing user data")
        return
    }
    try {
        const existingUser = await userService.getByUsername(user.username)
        if (existingUser && existingUser._id?.toString() !== user._id?.toString()) {
            throw new Error("Username already taken")
        }
        
        let savedUser: User
        if (user._id) {
            savedUser = await userService.update(user)
        } else {
            savedUser = await userService.add(user)
        }
        const miniUser = convertUserToMiniUser(savedUser)
        res.send(miniUser)
    } catch (err) {
        loggerService.error(err)
        res.status(400).send(err instanceof Error ? err.message : "Couldn't save user")
    }
}

export async function removeUser(req: Request<UserIdParams>, res: Response) {
    const { userId } = req.params
    try {
        const deletedId = await userService.remove(userId)
        res.send(deletedId);
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't remove user")
    }
}

export async function checkUserName(req: Request<UsernameParams>, res: Response) {
    const { username } = req.params
    try {
        const isUserExist = await userService.getByUsername(username)
        if (isUserExist) res.json({ isTaken: true, message: "Username is already taken" });
        else res.json({ isTaken: true, message: "Username is available" });
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Error checking for username")
    }
}

export async function updateBulkMultiplier(req: Request<any, any, { role: string, multiplier: number }>, res: Response) {
    const { role, multiplier } = req.body
    loggerService.info('Update Bulk Multiplier request:', { role, multiplier })
    try {
        const count = await userService.updateBulkMultiplier(role, multiplier)
        loggerService.info('Successfully updated users:', count)
        res.send({ message: `Updated ${count} users`, count })
    } catch (err) {
        loggerService.error(err)
        res.status(400).send("Couldn't update bulk multiplier")
    }
}