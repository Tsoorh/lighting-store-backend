import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { dbService } from '../../services/db.service';
import { loggerService } from '../../services/logger.service';
import type { Miniuser, User } from '../../model/user.model';

const SALTROUNDS = Number(process.env.SALT_ROUNDS) || 11;

export const userService = {
    query,
    add,
    update,
    remove,
    getByUsername,
    getById,
    updateBulkMultiplier
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _mapRowToUser(row: Record<string, any>): User {
    return {
        _id: row.id,
        id: row.id,
        username: row.username,
        fullname: row.fullname,
        role: row.role,
        priceMultiplier: row.price_multiplier !== null ? parseFloat(row.price_multiplier) : undefined,
        showPrices: row.show_prices !== null ? !!row.show_prices : true,
        password: row.password
    };
}

async function query(): Promise<Miniuser[]> {
    try {
        const sql = `
            SELECT id, username, fullname, role, price_multiplier, show_prices, password 
            FROM public.users 
            ORDER BY fullname ASC;
        `;
        const result = await dbService.query(sql);
        return result.rows.map(row => convertUserToMiniUser(_mapRowToUser(row)));
    } catch (err) {
        loggerService.error("Couldn't get users from PostgreSQL", err);
        throw err;
    }
}

async function getByUsername(username: string): Promise<User | null> {
    try {
        const sql = `
            SELECT id, username, fullname, role, price_multiplier, show_prices, password 
            FROM public.users 
            WHERE LOWER(username) = LOWER($1);
        `;
        const result = await dbService.query(sql, [username]);
        if (result.rows.length === 0) return null;
        return _mapRowToUser(result.rows[0]);
    } catch (err) {
        loggerService.error(`Couldn't get user by username: ${username}`, err);
        throw err;
    }
}

async function getById(userId: string): Promise<Miniuser | null> {
    try {
        const sql = `
            SELECT id, username, fullname, role, price_multiplier, show_prices, password 
            FROM public.users 
            WHERE id = $1;
        `;
        const result = await dbService.query(sql, [userId]);
        if (result.rows.length === 0) return null;
        return convertUserToMiniUser(_mapRowToUser(result.rows[0]));
    } catch (err) {
        loggerService.error(`Couldn't get user by id: ${userId}`, err);
        throw err;
    }
}

async function add(user: User): Promise<User> {
    try {
        let passwordHash = user.password;
        if (passwordHash) {
            passwordHash = await bcrypt.hash(passwordHash, SALTROUNDS);
        }
        const role = user.role ? user.role.trim().toLowerCase() : 'supplier';
        const id = user._id || user.id || crypto.randomBytes(12).toString('hex');
        const priceMultiplier = user.priceMultiplier !== undefined ? user.priceMultiplier : 1.0;
        const showPrices = user.showPrices !== false;

        const sql = `
            INSERT INTO public.users (
                id, username, fullname, role, price_multiplier, show_prices, password
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [id, user.username, user.fullname, role, priceMultiplier, showPrices, passwordHash || null];
        const result = await dbService.query(sql, values);
        return _mapRowToUser(result.rows[0]);
    } catch (err) {
        loggerService.error("Couldn't add user to PostgreSQL", err);
        throw err;
    }
}

async function update(user: User): Promise<User> {
    const id = user._id || user.id;
    if (!id) throw new Error('Update requires an _id or id');

    try {
        const role = user.role ? user.role.trim().toLowerCase() : 'supplier';
        const priceMultiplier = user.priceMultiplier !== undefined ? user.priceMultiplier : 1.0;
        const showPrices = user.showPrices !== false;

        let sql: string;
        let values: unknown[];

        if (user.password && user.password.trim()) {
            const passwordHash = await bcrypt.hash(user.password, SALTROUNDS);
            sql = `
                UPDATE public.users SET
                    username = $2,
                    fullname = $3,
                    role = $4,
                    price_multiplier = $5,
                    show_prices = $6,
                    password = $7
                WHERE id = $1
                RETURNING *;
            `;
            values = [id, user.username, user.fullname, role, priceMultiplier, showPrices, passwordHash];
        } else {
            sql = `
                UPDATE public.users SET
                    username = $2,
                    fullname = $3,
                    role = $4,
                    price_multiplier = $5,
                    show_prices = $6
                WHERE id = $1
                RETURNING *;
            `;
            values = [id, user.username, user.fullname, role, priceMultiplier, showPrices];
        }

        const result = await dbService.query(sql, values);
        if (result.rowCount === 0) {
            throw new Error(`Couldn't find user to update with id: ${id}`);
        }
        return _mapRowToUser(result.rows[0]);
    } catch (err) {
        loggerService.error(`Couldn't update user in PostgreSQL with id: ${id}`, err);
        throw err;
    }
}

async function updateBulkMultiplier(role: string, multiplier: number): Promise<number> {
    try {
        const cleanRole = role.trim();
        const sql = `
            UPDATE public.users 
            SET price_multiplier = $1 
            WHERE LOWER(role) = LOWER($2);
        `;
        const result = await dbService.query(sql, [multiplier, cleanRole]);
        return result.rowCount || 0;
    } catch (err) {
        loggerService.error(`Couldn't update bulk multiplier for role: ${role}`, err);
        throw err;
    }
}

async function remove(userId: string): Promise<string> {
    try {
        const sql = `DELETE FROM public.users WHERE id = $1 RETURNING id;`;
        const result = await dbService.query(sql, [userId]);
        if (result.rowCount === 0) {
            throw new Error(`Couldn't remove user with id: ${userId}. ID not found.`);
        }
        return userId;
    } catch (err) {
        loggerService.error(`Couldn't remove user with id: ${userId}`, err);
        throw err;
    }
}

export function convertUserToMiniUser(user: User): Miniuser {
    if (!user) return {} as Miniuser;
    return {
        _id: user._id,
        id: user.id || user._id,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        priceMultiplier: user.priceMultiplier,
        showPrices: user.showPrices
    };
}
