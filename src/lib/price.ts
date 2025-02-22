import { logger } from './logger';

interface CoinGeckoPrice {
  solana: {
    usd: number;
    usd_24h_change: number;
  };
}

class PriceManager {
  private static instance: PriceManager;
  private cache: Map<string, { price: number; change24h: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour
  private readonly ENDPOINTS = [
    {
      name: 'CoinGecko',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
      parser: (data: any) => ({
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change || 0
      })
    },
    {
      name: 'Jupiter',
      url: 'https://price.jup.ag/v4/price?ids=SOL',
      parser: (data: any) => ({
        price: data.data.SOL.price,
        change24h: 0 // Jupiter doesn't provide 24h change
      })
    },
    {
      name: 'Binance',
      url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT',
      parser: (data: any) => ({
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent)
      })
    }
  ];

  private constructor() {}

  static getInstance(): PriceManager {
    if (!PriceManager.instance) {
      PriceManager.instance = new PriceManager();
    }
    return PriceManager.instance;
  }

  private async fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  private async fetchEndpoint(endpoint: typeof this.ENDPOINTS[0]): Promise<{ price: number; change24h: number } | null> {
    try {
      const response = await this.fetchWithTimeout(endpoint.url);
      
      if (!response.ok) {
        if (response.status === 429) { // Rate limit
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return endpoint.parser(data);
    } catch (error) {
      logger.warn(`Failed to fetch from ${endpoint.name}:`, error);
      return null;
    }
  }

  async getSolanaPrice(): Promise<{ price: number; change24h: number }> {
    try {
      // Check cache first
      const cached = this.cache.get('solana');
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { price: cached.price, change24h: cached.change24h };
      }

      // Try all endpoints in sequence
      for (const endpoint of this.ENDPOINTS) {
        try {
          const result = await this.fetchEndpoint(endpoint);
          if (result) {
            this.cache.set('solana', { ...result, timestamp: Date.now() });
            return result;
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${endpoint.name}:`, error);
          continue;
        }
      }

      // If all endpoints fail but we have cached data, use it even if expired
      if (cached) {
        logger.info('Using expired cache data as fallback');
        return { price: cached.price, change24h: cached.change24h };
      }

      // Final fallback
      logger.warn('Using fallback price data');
      return { price: 100, change24h: 0 };
    } catch (error) {
      logger.error('Error in getSolanaPrice:', error);
      
      // If we have any cached data, use it
      const cached = this.cache.get('solana');
      if (cached) {
        return { price: cached.price, change24h: cached.change24h };
      }

      // Absolute fallback
      return { price: 100, change24h: 0 };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const priceManager = PriceManager.getInstance();
