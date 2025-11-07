import { Redis, type SetCommandOptions } from "@upstash/redis"

// Wrapper pour Redis qui gère le cas où il n'est pas configuré
class RedisWrapper {
  private client: Redis | null = null

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (url && token) {
      try {
        this.client = new Redis({ url, token })
      } catch (error) {
        // Redis initialization failed, will use fallback behavior
      }
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    if (!this.client) return null
    try {
      return await this.client.get<T>(key)
    } catch (error) {
      console.error("Redis get error:", error)
      return null
    }
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    if (!this.client) return
    try {
      let setOptions: SetCommandOptions | undefined
      if (options?.ex !== undefined) {
        setOptions = { ex: options.ex }
      }
      await this.client.set(key, value, setOptions)
    } catch (error) {
      console.error("Redis set error:", error)
    }
  }
}

const redis = new RedisWrapper()

export default redis

// Cache keys
export const CACHE_KEYS = {
  price: (crypto: string) => `price:${crypto}`,
  market: (crypto: string, timestamp: number) => `market:${crypto}:${timestamp}`,
  candleOpenPrice: (crypto: string, timestamp: number) => `candle:${crypto}:${timestamp}:open`,
  websocket: (userId: string) => `ws:${userId}`,
} as const

