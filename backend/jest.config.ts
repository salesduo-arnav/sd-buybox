import type { Config } from 'jest';

// Jest config.
// `detectOpenHandles` is on so anything leaking a timer, socket, or DB
// connection shows up with a stack trace instead of hiding behind --forceExit.
// When integration tests land (they need a real Postgres), re-add
// globalSetup/globalTeardown pointing at src/tests/global_setup.ts.

const config: Config = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/types/**',
        '!src/tests/**',
    ],
    setupFiles: ['<rootDir>/src/tests/test_env.ts'],
    testTimeout: 30000,
    verbose: true,
    detectOpenHandles: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    maxWorkers: 1,
};

export default config;
