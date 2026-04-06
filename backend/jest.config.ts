import type { Config } from 'jest';

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
    globalSetup: '<rootDir>/src/tests/global_setup.ts',
    globalTeardown: '<rootDir>/src/tests/global_teardown.ts',
    testTimeout: 30000,
    verbose: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    maxWorkers: 1,
};

export default config;
