
# Spécifications Techniques Détaillées

## Configuration Projet et Dependencies

### 1. Package.json Configuration

```json
{
  "name": "horloge-maree-rimouski",
  "version": "1.0.0",
  "description": "Application PWA d'horloge des marées pour Rimouski avec météo marine et astronomie",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "pwa:dev": "vite --mode pwa-dev",
    "lighthouse": "lhci autorun"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.1",
    "@tanstack/react-query": "^4.32.6",
    "framer-motion": "^10.16.4",
    "date-fns": "^2.30.0",
    "idb": "^7.1.1",
    "workbox-window": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "vite-plugin-pwa": "^0.16.4",
    "tailwindcss": "^3.3.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.17.0",
    "jest": "^29.6.2",
    "jest-environment-jsdom": "^29.6.2",
    "playwright": "^1.37.1",
    "typescript": "^5.0.2",
    "eslint": "^8.45.0"
  }
}
```

### 2. Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api-iwls\.dfo-mpo\.gc\.ca\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dfo-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.weather\.gc\.ca\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Horloge des Marées - Rimouski',
        short_name: 'Marées RIM',
        description: 'Application d\'horloge des marées pour Rimouski avec météo marine et astronomie',
        theme_color: '#1e40af',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          store: ['zustand', '@tanstack/react-query'],
          animations: ['framer-motion'],
          utils: ['date-fns', 'idb'],
        },
      },
    },
  },
});
```

### 3. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Architecture des Services

### 1. Service API Principal

```typescript
// src/services/api/apiClient.ts
class APIClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(config: APIConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 10000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (!response.ok) {
            throw new APIError(
              `HTTP ${response.status}: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return { data, success: true };
        } catch (error) {
          if (attempt === this.retryAttempts) throw error;
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    throw new APIError('Max retry attempts exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Configuration des APIs
export const dfoAPI = new APIClient({
  baseURL: '/api/tides',
  timeout: 15000,
  retryAttempts: 3,
});

export const weatherAPI = new APIClient({
  baseURL: '/api/weather',
  timeout: 10000,
  retryAttempts: 2,
});

export const astronomyAPI = new APIClient({
  baseURL: '/api/astronomy',
  timeout: 8000,
  retryAttempts: 2,
});
```

### 2. Service de Données de Marées

```typescript
// src/services/tideService.ts
export class TideService {
  private api: APIClient;
  private cache: TideCache;

  constructor() {
    this.api = dfoAPI;
    this.cache = new TideCache();
  }

  async getCurrentTide(locationId: string): Promise<CurrentTideData> {
    const cacheKey = `current-tide-${locationId}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached, 15 * 60 * 1000)) {
      return cached.data;
    }

    try {
      const response = await this.api.request<RawTideData>(
        `/current/${locationId}`
      );
      
      const normalizedData = this.normalizeTideData(response.data);
      await this.cache.set(cacheKey, normalizedData, Date.now());
      
      return normalizedData;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to API error:', error);
        return cached.data;
      }
      throw error;
    }
  }

  async getTidePredictions(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TidePrediction[]> {
    const cacheKey = `predictions-${locationId}-${startDate.toISOString().split('T')[0]}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached, 24 * 60 * 60 * 1000)) {
      return cached.data;
    }

    const response = await this.api.request<RawPredictionData[]>(
      `/predictions/${locationId}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    
    const predictions = response.data.map(this.normalizePrediction);
    await this.cache.set(cacheKey, predictions, Date.now());
    
    return predictions;
  }

  private normalizeTideData(raw: RawTideData): CurrentTideData {
    return {
      timestamp: new Date(raw.time),
      height: parseFloat(raw.height),
      trend: this.calculateTrend(raw),
      rate: this.calculateRate(raw),
      location: {
        id: raw.station_id,
        name: raw.station_name,
        coordinates: [raw.latitude, raw.longitude],
      },
      nextExtreme: this.findNextExtreme(raw.predictions),
    };
  }

  private calculateTrend(data: RawTideData): TideTrend {
    const current = parseFloat(data.height);
    const previous = parseFloat(data.previous_height);
    
    if (Math.abs(current - previous) < 0.01) return 'slack';
    return current > previous ? 'rising' : 'falling';
  }

  private calculateRate(data: RawTideData): number {
    const current = parseFloat(data.height);
    const previous = parseFloat(data.previous_height);
    const timeDiff = (new Date(data.time).getTime() - new Date(data.previous_time).getTime()) / (1000 * 60 * 60);
    
    return (current - previous) / timeDiff;
  }

  private isCacheValid(cached: CacheEntry, maxAge: number): boolean {
    return Date.now() - cached.timestamp < maxAge;
  }
}
```

### 3. Service de Cache IndexedDB

```typescript
// src/services/storage/cacheService.ts
export class TideCache {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TideClockDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'cache';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
    });
  }

  async set<T>(key: string, data: T, timestamp: number, ttl?: number): Promise<void> {
    if (!this.db) await this.init();
    
    const expiry = ttl ? Date.now() + ttl : Date.now() + (24 * 60 * 60 * 1000);
    const entry: CacheEntry<T> = { key, data, timestamp, expiry };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(entry);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db)

 await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.init();
    
    const now = Date.now();
    const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('expiry');
    
    const request = index.openCursor(IDBKeyRange.upperBound(now));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}

interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiry: number;
}
```

## Vercel Functions (Backend API)

### 1. API Proxy pour DFO

```typescript
// api/tides/current.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../../lib/rateLimit';
import { cacheResponse, getFromCache } from '../../lib/cache';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime 
      });
    }

    const { locationId } = req.query;
    if (!locationId || typeof locationId !== 'string') {
      return res.status(400).json({ error: 'Missing locationId parameter' });
    }

    // Check cache first
    const cacheKey = `tide-current-${locationId}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from DFO API
    const dfoResponse = await fetch(
      `https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/${locationId}/data?time-series-code=wlp&from=${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}&to=${new Date().toISOString()}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TideClock/1.0'
        },
        timeout: 10000
      }
    );

    if (!dfoResponse.ok) {
      throw new Error(`DFO API error: ${dfoResponse.status}`);
    }

    const dfoData = await dfoResponse.json();
    
    // Transform data
    const transformedData = transformDFOData(dfoData, locationId);
    
    // Cache for 15 minutes
    await cacheResponse(cacheKey, transformedData, 15 * 60);
    
    res.json(transformedData);
  } catch (error) {
    console.error('Tide API error:', error);
    
    // Try fallback API
    try {
      const fallbackData = await fetchWorldTidesData(locationId);
      res.json(fallbackData);
    } catch (fallbackError) {
      res.status(500).json({ 
        error: 'Failed to fetch tide data',
        message: error.message 
      });
    }
  }
}

function transformDFOData(dfoData: any, locationId: string) {
  const measurements = dfoData.data || [];
  const latest = measurements[measurements.length - 1];
  const previous = measurements[measurements.length - 2];

  if (!latest) {
    throw new Error('No tide data available');
  }

  return {
    timestamp: latest.eventDate,
    height: parseFloat(latest.value),
    trend: calculateTrend(latest.value, previous?.value),
    rate: calculateRate(latest, previous),
    location: {
      id: locationId,
      name: dfoData.station?.officialName || 'Unknown',
      coordinates: [dfoData.station?.latitude, dfoData.station?.longitude]
    },
    source: 'dfo-mpo',
    quality: 'observed'
  };
}

function calculateTrend(current: string, previous?: string): 'rising' | 'falling' | 'slack' {
  if (!previous) return 'slack';
  
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  const diff = curr - prev;
  
  if (Math.abs(diff) < 0.01) return 'slack';
  return diff > 0 ? 'rising' : 'falling';
}

async function fetchWorldTidesData(locationId: string) {
  // Fallback to WorldTides API
  const response = await fetch(
    `https://www.worldtides.info/api/v3?heights&station=${locationId}&key=${process.env.WORLDTIDES_API_KEY}`,
    { timeout: 8000 }
  );
  
  if (!response.ok) {
    throw new Error('WorldTides API failed');
  }
  
  const data = await response.json();
  return transformWorldTidesData(data, locationId);
}
```

### 2. Rate Limiting Middleware

```typescript
// lib/rateLimit.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export async function rateLimit(
  req: VercelRequest,
  options: { limit?: number; window?: number } = {}
): Promise<RateLimitResult> {
  const { limit = 100, window = 60 * 60 } = options; // 100 requests per hour default
  
  // Get client identifier
  const identifier = getClientIdentifier(req);
  const key = `ratelimit:${identifier}`;
  
  const now = Math.floor(Date.now() / 1000);
  const resetTime = now + window;
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, window);
    
    const results = await pipeline.exec();
    const count = results[0] as number;
    
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetTime
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if Redis is down
    return {
      success: true,
      limit,
      remaining: limit,
      resetTime
    };
  }
}

function getClientIdentifier(req: VercelRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  if (forwardedFor) {
    return Array.isArray(forwardedFor) 
      ? forwardedFor[0].split(',')[0].trim()
      : forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  if (clientIP) {
    return Array.isArray(clientIP) ? clientIP[0] : clientIP;
  }
  
  // Fallback to connection remote address
  return req.socket?.remoteAddress || 'unknown';
}
```

### 3. Cache Utilities

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function cacheResponse(
  key: string, 
  data: any, 
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    }));
  } catch (error) {
    console.warn('Cache write failed:', error);
    // Non-blocking - continue without cache
  }
}

export async function getFromCache(key: string): Promise<any | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    
    // Check if cache is still valid
    const age = Date.now() - parsed.timestamp;
    if (age > parsed.ttl * 1000) {
      // Cache expired, delete it
      await redis.del(key);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.warn('Cache read failed:', error);
    return null;
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
}
```

## Configuration des Tests

### 1. Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/types/**/*',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};
```

### 2. Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 3. Exemple de Test Composant

```typescript
// src/components/tide-clock/__tests__/TideClockContainer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TideClockContainer } from '../TideClockContainer';
import { useAppStore } from '@/store/appStore';

// Mock the store
jest.mock('@/store/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock the tide data hook
jest.mock('@/hooks/useTideData');

describe('TideClockContainer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAppStore.mockReturnValue({
      ui: { theme: 'classic' },
      settings: { appearance: { clockSize: 'medium' } },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should render loading state initially', () => {
    renderWithProviders(<TideClockContainer />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render tide clock when data is loaded', async () => {
    const mockTideData = {
      timestamp: new Date(),
      height: 2.3,
      trend: 'rising' as const,
      rate: 0.2,
      location: {
        id: 'rimouski',
        name: 'Rimouski',
        coordinates: [48.4667, -68.5333],
      },
    };

    // Mock successful data loading
    require('@/hooks/useTideData').useTideData.mockReturnValue({
      currentTide: mockTideData,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<TideClockContainer />);

    await waitFor(() => {
      expect(screen.getByLabelText(/horloge des marées/i)).toBeInTheDocument();
    });
  });

  it('should render error state when API fails', async () => {
    require('@/hooks/useTideData').useTideData.mockReturnValue({
      currentTide: null,
      isLoading: false,
      error: new Error('API Error'),
    });

    renderWithProviders(<TideClockContainer />);

    expect(screen.getByText(/erreur de chargement/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ré
essayer/i)).toBeInTheDocument();
  });

  it('should update theme when theme changes', () => {
    const { rerender } = renderWithProviders(<TideClockContainer />);

    mockUseAppStore.mockReturnValue({
      ui: { theme: 'nautical' },
      settings: { appearance: { clockSize: 'large' } },
    });

    rerender(<TideClockContainer />);

    expect(screen.getByTestId('tide-clock-container')).toHaveClass('theme-nautical');
  });
});
```

### 4. Tests E2E avec Playwright

```typescript
// e2e/tide-clock.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tide Clock Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load and display tide clock', async ({ page }) => {
    // Wait for the tide clock to load
    await expect(page.locator('[data-testid="tide-clock"]')).toBeVisible();
    
    // Check that current tide information is displayed
    await expect(page.locator('[data-testid="current-tide-height"]')).toBeVisible();
    await expect(page.locator('[data-testid="tide-trend"]')).toBeVisible();
  });

  test('should be installable as PWA', async ({ page, context }) => {
    // Check for PWA manifest
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBeTruthy();

    // Check for service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistered).toBe(true);
  });

  test('should work offline', async ({ page, context }) => {
    // Load the page first
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Should still show cached content
    await expect(page.locator('[data-testid="tide-clock"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="tide-clock"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="tide-clock"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="tide-clock"]')).toBeVisible();
  });
});
```

## Monitoring et Analytics

### 1. Configuration Sentry

```typescript
// src/utils/monitoring.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initializeMonitoring() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing({
          tracingOrigins: [window.location.hostname, /^\//],
        }),
      ],
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        // Filter out development errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes('ResizeObserver loop limit exceeded')) {
            return null; // Ignore this common benign error
          }
        }
        return event;
      },
    });
  }
}

export function captureApiError(error: Error, context: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'api');
    scope.setContext('apiCall', context);
    Sentry.captureException(error);
  });
}

export function captureUserAction(action: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: action,
    category: 'user',
    data,
  });
}
```

### 2. Analytics Privacy-Friendly

```typescript
// src/utils/analytics.ts
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

class PrivacyFriendlyAnalytics {
  private endpoint: string;
  private enabled: boolean;

  constructor() {
    this.endpoint = '/api/analytics';
    this.enabled = !import.meta.env.DEV;
  }

  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event.name,
          properties: event.properties,
          timestamp: Date.now(),
          url: window.location.pathname,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          // No personal identifiers - privacy-first
        }),
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Predefined events
  pageView(page: string) {
    this.track({ name: 'page_view', properties: { page } });
  }

  tideClockInteraction(action: string) {
    this.track({ name: 'tide_clock_interaction', properties: { action } });
  }

  apiCall(endpoint: string, status: 'success' | 'error', duration: number) {
    this.track({ 
      name: 'api_call', 
      properties: { endpoint, status, duration } 
    });
  }

  pwaInstall() {
    this.track({ name: 'pwa_install' });
  }

  offlineUsage(duration: number) {
    this.track({ 
      name: 'offline_usage', 
      properties: { duration } 
    });
  }
}

export const analytics = new PrivacyFriendlyAnalytics();
```

## Variables d'Environnement

### 1. Configuration Environnement

```env
# .env.example
# App Configuration
VITE_APP_NAME="Horloge des Marées"
VITE_APP_VERSION="1.0.0"
VITE_DEFAULT_LOCATION="rimouski"

# API Keys (Production)
WORLDTIDES_API_KEY=your_worldtides_key_here
OPENWEATHER_API_KEY=your_openweather_key_here

# Monitoring
VITE_SENTRY_DSN=your_sentry_dsn_here

# Cache (Redis)
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Development
VITE_DEV_MODE=true
VITE_MOCK_API=false
```

### 2. Validation des Variables

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('Horloge des Marées'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_DEFAULT_LOCATION: z.string().default('rimouski'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_DEV_MODE: z.boolean().default(false),
  VITE_MOCK_API: z.boolean().default(false),
});

function validateEnv() {
  try {
    return envSchema.parse({
      VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
      VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
      VITE_DEFAULT_LOCATION: import.meta.env.VITE_DEFAULT_LOCATION,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_DEV_MODE: import.meta.env.DEV,
      VITE_MOCK_API: import.meta.env.VITE_MOCK_API === 'true',
    });
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const env = validateEnv();
```

## Documentation Types TypeScript

### 1. Types Principaux

```typescript
// src/types/index.ts
export interface Location {
  id: string;
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  timezone: string;
  stationId?: string;
  country: string;
  region?: string;
}

export interface CurrentTideData {
  timestamp: Date;
  height: number; // meters
  trend: TideTrend;
  rate: number; // meters per hour
  location: Location;
  nextExtreme: TideExtreme;
  coefficient?: number; // 20-120 scale
  source: 'dfo-mpo' | 'worldtides' | 'calculated';
  quality: 'observed' | 'predicted' | 'estimated';
}

export type TideTrend = 'rising' | 'falling' | 'slack';

export interface TideExtreme {
  timestamp: Date;
  height: number;
  type: 'high' | 'low';
  coefficient?: number;
}

export interface TidePrediction {
  timestamp: Date;
  height: number;
  type: 'prediction' | 'observation';
}

export interface WeatherData {
  timestamp: Date;
  location: Location;
  current: CurrentConditions;
  forecast: WeatherForecast[];
  marine?: MarineConditions;
}

export interface CurrentConditions {
  temperature: number; // celsius
  humidity: number; // percentage
  pressure: number; // hPa
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGusts?: number; // km/h
  visibility: number; // km
  condition: WeatherCondition;
  icon: string;
}

export interface MarineConditions {
  waterTemperature?: number; // celsius
  waveHeight: number; // meters
  wavePeriod?: number; // seconds
  waveDirection?: number; // degrees
  seaState: SeaState;
  uvIndex?: number;
}

export type SeaState = 'calm' | 'smooth' | 'slight' | 'moderate' | 'rough' | 'very_rough' | 'high' | 'very_high';

export type WeatherCondition = 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog' | 'storm';

export interface AstronomyData {
  location: Location;
  date: Date;
  sun: SolarData;
  moon: LunarData;
  tideInfluence: TideInfluence;
}

export interface SolarData {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  civilTwilight: { dawn: Date; dusk: Date };
  nauticalTwilight: { dawn: Date; dusk: Date };
  astronomicalTwilight: { dawn: Date; dusk: Date };
  dayLength: number; // hours
  solarElevation: number; // degrees
}

export interface LunarData {
  phase: MoonPhase;
  illumination: number; // 0-1
  age: number; // days since new moon
  rise: Date | null;
  set: Date | null;
  meridian: Date;
  distance: number; // km from Earth
}

export type MoonPhase = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

export interface TideInfluence {
  lunarCoefficient: number; // 0-1
  solarCoefficient: number; // 0-1
  springNeap: 'spring' | 'neap' | 'transitioning';
  syzygyDate: Date; // next new/full moon
}

export type Theme = 'classic' | 'nautical' | 'sunset' | 'dark';
export type ClockSize = 'small' | 'medium' | 'large';
export type ViewType = 'clock' | 'forecast' | 'history' | 'settings';

export interface UserPreferences {
  language: 'fr' | 'en';
  units: {
    height: 'meters' | 'feet';
    speed: 'kmh' | 'knots';
    temperature: 'celsius' | 'fahrenheit';
  };
  notifications: {
    enabled: boolean;
    highTide: boolean;
    lowTide: boolean;
    extremeTides: boolean;
    weatherWarnings: boolean;
    beforeTime: number; // minutes
  };
  appearance: {
    theme: Theme;
    clockSize: ClockSize;
    showSeconds: boolean;
    compactMode: boolean;
  };
  data: {
    updateFrequency: number; // minutes
    offlineMode: boolean;
    forecastDays: number;
  };
}
```

Cette documentation technique complète fournit tous les détails nécessaires pour implémenter l'application d'horloge des marées avec une architecture robuste, des tests complets et un monitoring approprié.