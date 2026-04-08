// Re-export the canonical core-platform types.
// All consumers should import from './corePlatform' directly going forward;
// this barrel exists so existing `from '../types'` imports keep compiling.
export * from './corePlatform';
