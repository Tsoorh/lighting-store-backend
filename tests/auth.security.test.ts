jest.mock('../services/logger.service', () => {
    process.env.ACCESS_TOKEN_KEY = process.env.ACCESS_TOKEN_KEY || 'test-access-secret-key';
    process.env.REFRESH_TOKEN_KEY = process.env.REFRESH_TOKEN_KEY || 'test-refresh-secret-key';
    return {
        loggerService: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
    };
});

import jwt from 'jsonwebtoken';
import { authService } from '../api/auth/auth.service';
import { authLimiter, authRoutes } from '../api/auth/auth.route';
import { requireAdmin } from '../middlewares/requireAuth.middleware';
import type { Miniuser } from '../model/user.model';

describe('auth security configuration', () => {
    const sampleUser: Miniuser = {
        _id: 'u-123',
        fullname: 'Test Architect',
        username: 'architect1',
        role: 'architect',
        priceMultiplier: 1,
        showPrices: true,
    };

    it('preserves 1825d (5 year) expiry on access and refresh tokens with HS256', () => {
        const accessToken = authService.getLoginAccessToken(sampleUser);
        const refreshToken = authService.getLoginRefreshToken(sampleUser);

        const decodedAccess = jwt.decode(accessToken, { complete: true }) as unknown as {
            header: { alg: string };
            payload: { iat: number; exp: number; _id: string };
        };
        const decodedRefresh = jwt.decode(refreshToken, { complete: true }) as unknown as {
            header: { alg: string };
            payload: { iat: number; exp: number; _id: string };
        };

        expect(decodedAccess.header.alg).toBe('HS256');
        expect(decodedRefresh.header.alg).toBe('HS256');
        expect(decodedAccess.payload.exp - decodedAccess.payload.iat).toBe(1825 * 24 * 60 * 60);
        expect(decodedRefresh.payload.exp - decodedRefresh.payload.iat).toBe(1825 * 24 * 60 * 60);
        expect(authService.validateToken(accessToken)._id).toBe('u-123');
        expect(authService.validateRefreshToken(refreshToken)._id).toBe('u-123');
    });

    it('rejects unsigned (alg: none) JWTs during token validation', () => {
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ _id: 'u-1', role: 'admin' })).toString('base64url');
        const unsignedToken = `${header}.${payload}.`;

        expect(() => authService.validateToken(unsignedToken)).toThrow();
        expect(() => authService.validateRefreshToken(unsignedToken)).toThrow();
    });

    it('protects /register with requireAdmin and rate limits /login and /register', () => {
        interface RouteLayer {
            route?: {
                path: string;
                stack: Array<{ handle: unknown }>;
            };
        }

        const layers = (authRoutes as unknown as { stack: RouteLayer[] }).stack;
        const registerRoute = layers.find((layer) => layer.route?.path === '/register')?.route;
        const loginRoute = layers.find((layer) => layer.route?.path === '/login')?.route;
        const refreshRoute = layers.find((layer) => layer.route?.path === '/refresh-token')?.route;

        expect(registerRoute).toBeDefined();
        expect(registerRoute!.stack.map((s) => s.handle)).toContain(requireAdmin);
        expect(registerRoute!.stack.map((s) => s.handle)).toContain(authLimiter);

        expect(loginRoute).toBeDefined();
        expect(loginRoute!.stack.map((s) => s.handle)).toContain(authLimiter);

        expect(refreshRoute).toBeDefined();
        expect(refreshRoute!.stack.map((s) => s.handle)).not.toContain(authLimiter);
    });
});
