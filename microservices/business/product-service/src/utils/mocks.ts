/**
 * Mock implementations for shared library modules
 * These are temporary mocks to resolve build issues
 */

// Mock Logger class
export class Logger {
  constructor(private context: string) {}

  info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] INFO:`, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ERROR:`, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] WARN:`, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG:`, message, ...args);
    }
  }
}

// Mock CacheManager class
export class CacheManager {
  private cache = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl * 1000);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}