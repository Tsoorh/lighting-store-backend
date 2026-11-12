import bcrypt from 'bcrypt';

jest.mock('../services/logger.service', () => {
    process.env.ACCESS_TOKEN_KEY = process.env.ACCESS_TOKEN_KEY || 'test-access-secret';
    process.env.REFRESH_TOKEN_KEY = process.env.REFRESH_TOKEN_KEY || 'test-refresh-secret';
    return {
        loggerService: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        }
    };
});

import { authService } from '../api/auth/auth.service';
import { userService } from '../api/user/user.service';

describe('authService register and login', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('passes plaintext password once to userService.add so register does not double-hash', async () => {
        let storedHash = '';

        jest.spyOn(userService, 'getByUsername').mockResolvedValueOnce(null);
        const addSpy = jest.spyOn(userService, 'add').mockImplementation(async (userToAdd) => {
            storedHash = await bcrypt.hash(String(userToAdd.password), 4);
            return {
                _id: 'u1',
                fullname: userToAdd.fullname,
                username: userToAdd.username,
                password: storedHash,
                role: 'architect',
                priceMultiplier: 1,
                showPrices: false
            };
        });

        const mini = await authService.register({
            fullname: 'Test User',
            username: 'testuser',
            password: 'secret-password'
        });

        expect(addSpy).toHaveBeenCalledTimes(1);
        expect(addSpy.mock.calls[0][0].password).toBe('secret-password');
        expect(mini.username).toBe('testuser');

        jest.spyOn(userService, 'getByUsername').mockResolvedValueOnce({
            _id: 'u1',
            fullname: 'Test User',
            username: 'testuser',
            password: storedHash,
            role: 'architect',
            priceMultiplier: 1,
            showPrices: false
        });

        const loggedIn = await authService.login('testuser', 'secret-password');
        expect(loggedIn._id).toBe('u1');
    });

    it('rejects duplicate usernames on register', async () => {
        jest.spyOn(userService, 'getByUsername').mockResolvedValueOnce({
            _id: 'existing',
            fullname: 'Existing',
            username: 'taken'
        });

        await expect(
            authService.register({
                fullname: 'Existing',
                username: 'taken',
                password: 'secret'
            })
        ).rejects.toThrow('Username already taken');
    });
});
