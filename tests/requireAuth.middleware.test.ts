jest.mock('../services/logger.service', () => ({
    loggerService: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { Request, Response, NextFunction } from 'express';
import { asyncLocalStorage } from '../services/als.service';
import { userService } from '../api/user/user.service';
import { requireAdmin } from '../middlewares/requireAuth.middleware';
import type { Miniuser } from '../model/user.model';

function createMockRes() {
    const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
}

describe('requireAdmin live DB verification', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns 401 when no user exists in ALS store', async () => {
        const req = { url: '/api/user' } as Request;
        const res = createMockRes();
        const next = jest.fn() as NextFunction;

        await asyncLocalStorage.run({}, () => requireAdmin(req, res, next));

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when admin user from token no longer exists in DB', async () => {
        const req = { url: '/api/user' } as Request;
        const res = createMockRes();
        const next = jest.fn() as NextFunction;
        const staleAdmin: Miniuser = {
            _id: 'deleted-admin',
            fullname: 'Old Admin',
            username: 'oldadmin',
            role: 'admin',
        };

        const getByIdSpy = jest.spyOn(userService, 'getById').mockResolvedValueOnce(null);

        await asyncLocalStorage.run({ loggedinUser: staleAdmin }, () =>
            requireAdmin(req, res, next)
        );

        expect(getByIdSpy).toHaveBeenCalledWith('deleted-admin');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when token claims admin but DB role was demoted', async () => {
        const req = { url: '/api/user' } as Request;
        const res = createMockRes();
        const next = jest.fn() as NextFunction;
        const staleAdmin: Miniuser = {
            _id: 'u-demoted',
            fullname: 'Demoted User',
            username: 'demoted',
            role: 'admin',
        };
        const liveSupplier: Miniuser = {
            ...staleAdmin,
            role: 'supplier',
        };

        jest.spyOn(userService, 'getById').mockResolvedValueOnce(liveSupplier);

        await asyncLocalStorage.run({ loggedinUser: staleAdmin }, () =>
            requireAdmin(req, res, next)
        );

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('syncs ALS user from DB and calls next() for active admin', async () => {
        const req = { url: '/api/user' } as Request;
        const res = createMockRes();
        const next = jest.fn() as NextFunction;
        const tokenAdmin: Miniuser = {
            _id: 'u-admin',
            fullname: 'Token Name',
            username: 'admin',
            role: 'admin',
        };
        const liveAdmin: Miniuser = {
            _id: 'u-admin',
            fullname: 'Updated DB Name',
            username: 'admin',
            role: 'admin',
        };

        jest.spyOn(userService, 'getById').mockResolvedValueOnce(liveAdmin);
        const store = { loggedinUser: tokenAdmin };

        await asyncLocalStorage.run(store, () => requireAdmin(req, res, next));

        expect(next).toHaveBeenCalledTimes(1);
        expect(store.loggedinUser.fullname).toBe('Updated DB Name');
    });
});
