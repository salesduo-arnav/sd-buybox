// Silence the file logger transport.
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), http: jest.fn() },
}));

// Mock the SystemConfig model so we never hit a real database.
const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../models', () => ({
    SystemConfig: {
        findAll: (...args: unknown[]) => mockFindAll(...args),
        findOne: (...args: unknown[]) => mockFindOne(...args),
        upsert: (...args: unknown[]) => mockUpsert(...args),
    },
}));

import configService from './config.service';

function fakeRow(key: string, value: unknown, type = 'text', category = 'general') {
    return { config_key: key, config_value: value, config_type: type, category, description: null };
}

beforeEach(() => {
    mockFindAll.mockReset();
    mockFindOne.mockReset();
    mockUpsert.mockReset();
});

describe('configService.initialize', () => {
    it('pre-warms the cache from the database', async () => {
        mockFindAll.mockResolvedValueOnce([
            fakeRow('max_products_per_scan', 500, 'integer', 'scanning'),
            fakeRow('default_marketplace', 'US', 'select', 'scanning'),
        ]);

        await configService.initialize();

        expect(mockFindAll).toHaveBeenCalledTimes(1);
        expect(configService.getSync('max_products_per_scan', 0)).toBe(500);
        expect(configService.getSync('default_marketplace', '')).toBe('US');
    });
});

describe('configService.getSync', () => {
    it('returns the cached value when present', async () => {
        mockFindAll.mockResolvedValueOnce([fakeRow('some_key', 42)]);
        await configService.initialize();

        expect(configService.getSync('some_key', 0)).toBe(42);
    });

    it('returns the default when the key is not in the cache', () => {
        expect(configService.getSync('nonexistent_key', 'fallback')).toBe('fallback');
    });
});

describe('configService.get', () => {
    it('returns value from cache when fresh', async () => {
        mockFindAll.mockResolvedValueOnce([fakeRow('cached_key', 'hello')]);
        await configService.initialize();

        const value = await configService.get<string>('cached_key');
        expect(value).toBe('hello');
        // Should not have queried again — only the initialize call.
        expect(mockFindAll).toHaveBeenCalledTimes(1);
    });

    it('falls back to DB when key is missing from cache', async () => {
        mockFindAll.mockResolvedValue([]);
        await configService.initialize();

        mockFindOne.mockResolvedValueOnce(fakeRow('db_only_key', 99));
        const value = await configService.get<number>('db_only_key');

        expect(value).toBe(99);
        expect(mockFindOne).toHaveBeenCalledTimes(1);
        mockFindAll.mockReset();
    });

    it('returns defaultValue when key is not in DB either', async () => {
        mockFindAll.mockResolvedValue([]);
        await configService.initialize();
        mockFindOne.mockResolvedValueOnce(null);

        const value = await configService.get<number>('missing', 123);
        expect(value).toBe(123);
        mockFindAll.mockReset();
    });

    it('throws when key is missing and no default is provided', async () => {
        mockFindAll.mockResolvedValue([]);
        await configService.initialize();
        mockFindOne.mockResolvedValueOnce(null);

        await expect(configService.get('missing')).rejects.toThrow('System config not found: missing');
        mockFindAll.mockReset();
    });
});

describe('configService.getAll', () => {
    it('always queries the DB directly', async () => {
        const rows = [fakeRow('a', 1), fakeRow('b', 2)];
        mockFindAll.mockResolvedValueOnce(rows);

        const result = await configService.getAll();

        expect(result).toEqual(rows);
        expect(mockFindAll).toHaveBeenCalledWith({ order: [['config_key', 'ASC']] });
    });
});

describe('configService.set', () => {
    it('upserts the value and refreshes the cache', async () => {
        const updated = fakeRow('my_key', 'new_value');
        mockUpsert.mockResolvedValueOnce([updated]);
        // refresh() will call findAll.
        mockFindAll.mockResolvedValueOnce([fakeRow('my_key', 'new_value')]);

        const result = await configService.set('my_key', 'new_value');

        expect(result).toEqual(updated);
        expect(mockUpsert).toHaveBeenCalledWith({ config_key: 'my_key', config_value: 'new_value' });
        // Verify cache was refreshed.
        expect(configService.getSync('my_key', '')).toBe('new_value');
    });
});
