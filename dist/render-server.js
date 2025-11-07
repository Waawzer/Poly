"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@polymarket/clob-client/dist/helpers/index.js
var import_axios3, request, get;
var init_helpers = __esm({
  "node_modules/@polymarket/clob-client/dist/helpers/index.js"() {
    "use strict";
    import_axios3 = __toESM(require("axios"));
    request = async (endpoint, method, headers, data) => {
      return (0, import_axios3.default)({
        method,
        url: endpoint,
        headers,
        data
      });
    };
    get = async (endpoint, headers, data) => {
      return request(endpoint, "GET", headers, data);
    };
  }
});

// node_modules/@polymarket/clob-client/dist/client.js
var ClobClient;
var init_client = __esm({
  "node_modules/@polymarket/clob-client/dist/client.js"() {
    "use strict";
    init_helpers();
    ClobClient = class {
      constructor(host, signer, creds) {
        this.host = host;
        if (signer !== void 0) {
          if (signer.provider == null || signer.provider._isProvider) {
            throw new Error("signer not connected to a provider!");
          }
          this.signer = signer;
        }
        if (creds !== void 0) {
          this.creds = creds;
        }
      }
      // Public endpoints
      async getOk() {
        return get(`${this.host}/`);
      }
      async getServerTime() {
        return get(`${this.host}/time`);
      }
    };
  }
});

// node_modules/@polymarket/clob-client/dist/types.js
var init_types = __esm({
  "node_modules/@polymarket/clob-client/dist/types.js"() {
    "use strict";
  }
});

// node_modules/@polymarket/clob-client/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  ClobClient: () => ClobClient
});
var init_dist = __esm({
  "node_modules/@polymarket/clob-client/dist/index.js"() {
    "use strict";
    init_client();
    init_types();
  }
});

// src/lib/render-server.ts
var import_config = require("dotenv/config");

// src/lib/mongodb.ts
var import_mongoose = __toESM(require("mongoose"));
var DB_MONGODB_URI = process.env.DB_MONGODB_URI;
if (!DB_MONGODB_URI) {
  throw new Error("Please define the DB_MONGODB_URI environment variable inside .env");
}
var MONGODB_URI = DB_MONGODB_URI;
var cached = global.mongoose || { conn: null, promise: null };
if (!global.mongoose) {
  global.mongoose = cached;
}
async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false
    };
    cached.promise = import_mongoose.default.connect(MONGODB_URI, opts).then((mongoose6) => {
      return mongoose6;
    }).catch((error) => {
      console.error("MongoDB connection error:", error);
      cached.promise = null;
      throw error;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
var mongodb_default = connectDB;

// src/models/Strategy.ts
var import_mongoose2 = __toESM(require("mongoose"));
var StrategySchema = new import_mongoose2.Schema(
  {
    userId: {
      type: import_mongoose2.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    walletId: {
      type: import_mongoose2.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true
    },
    crypto: {
      type: String,
      enum: ["BTC", "ETH", "XRP", "SOL"],
      required: true
    },
    priceThreshold: {
      type: Number,
      required: true,
      min: 0
    },
    orderAmount: {
      type: Number,
      required: true,
      min: 0
    },
    orderPrice: {
      type: Number,
      required: false,
      // Permettre null pour les anciennes stratégies
      min: 0,
      max: 100,
      // 0 à 100 centimes (0$ à 1$)
      default: null
    },
    tradingWindowStartMinute: {
      type: Number,
      required: true,
      min: 0,
      max: 14
    },
    tradingWindowStartSecond: {
      type: Number,
      required: true,
      min: 0,
      max: 59
    },
    tradingWindowEndMinute: {
      type: Number,
      required: false,
      min: 0,
      max: 15,
      default: 14
    },
    buyUpOnly: {
      type: Boolean,
      default: false
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);
StrategySchema.index({ userId: 1, enabled: 1 });
StrategySchema.index({ walletId: 1, enabled: 1 });
var Strategy_default = import_mongoose2.default.models.Strategy || import_mongoose2.default.model("Strategy", StrategySchema);

// src/models/Wallet.ts
var import_mongoose3 = __toESM(require("mongoose"));
var WalletSchema = new import_mongoose3.Schema(
  {
    userId: {
      type: import_mongoose3.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    safeWalletAddress: {
      type: String,
      required: true
    },
    allowanceEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);
var Wallet_default = import_mongoose3.default.models.Wallet || import_mongoose3.default.model("Wallet", WalletSchema);

// src/lib/chainlink.ts
var import_data_streams_sdk = require("@chainlink/data-streams-sdk");

// src/lib/redis.ts
var import_redis = require("@upstash/redis");
var RedisWrapper = class {
  client = null;
  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      try {
        this.client = new import_redis.Redis({ url, token });
      } catch (error) {
      }
    }
  }
  async get(key) {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }
  async set(key, value, options) {
    if (!this.client) return;
    try {
      let setOptions;
      if (options?.ex !== void 0) {
        setOptions = { ex: options.ex };
      }
      await this.client.set(key, value, setOptions);
    } catch (error) {
      console.error("Redis set error:", error);
    }
  }
};
var redis = new RedisWrapper();
var redis_default = redis;
var CACHE_KEYS = {
  price: (crypto2) => `price:${crypto2}`,
  market: (crypto2, timestamp) => `market:${crypto2}:${timestamp}`,
  candleOpenPrice: (crypto2, timestamp) => `candle:${crypto2}:${timestamp}:open`,
  websocket: (userId) => `ws:${userId}`
};

// src/models/PriceHistory.ts
var import_mongoose4 = __toESM(require("mongoose"));
var PriceHistorySchema = new import_mongoose4.Schema(
  {
    crypto: {
      type: String,
      enum: ["BTC", "ETH", "XRP", "SOL"],
      required: true,
      index: true
    },
    price: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);
PriceHistorySchema.index({ crypto: 1, timestamp: -1 });
PriceHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
var PriceHistory_default = import_mongoose4.default.models.PriceHistory || import_mongoose4.default.model("PriceHistory", PriceHistorySchema);

// src/lib/utils.ts
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function getCandleTimestamp(timestamp) {
  if (timestamp > 1e12) {
    return Math.floor(timestamp / 9e5) * 9e5;
  } else {
    return Math.floor(timestamp / 900) * 900;
  }
}
function getCandleMinute(timestamp) {
  const date = new Date(timestamp);
  return date.getMinutes() % 15;
}
function getExactCandleTimestamp(timestamp) {
  const date = new Date(timestamp);
  const minutes = date.getMinutes();
  const candleMinute = Math.floor(minutes / 15) * 15;
  const candleDate = new Date(date);
  candleDate.setMinutes(candleMinute, 0, 0);
  return candleDate.getTime();
}

// src/lib/chainlink.ts
var import_axios = __toESM(require("axios"));
var crypto = __toESM(require("crypto"));
var CHAINLINK_USER_ID = process.env.CHAINLINK_USER_ID;
var CHAINLINK_USER_SECRET = process.env.CHAINLINK_USER_SECRET;
var CHAINLINK_WS_URL = process.env.CHAINLINK_DATA_STREAMS_WS_URL || "wss://ws.testnet-dataengine.chain.link";
var CHAINLINK_API_URL = process.env.CHAINLINK_DATA_STREAMS_API_URL || "https://api.testnet-dataengine.chain.link";
var PRICE_RANGES = {
  BTC: { min: 1e4, max: 2e5 },
  ETH: { min: 500, max: 2e4 },
  XRP: { min: 0.1, max: 10 },
  SOL: { min: 10, max: 500 }
};
var FEED_ID_TO_CRYPTO = {
  "0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439": "BTC",
  // BTC/USD testnet
  "0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782": "ETH",
  // ETH/USD testnet
  "0x00035e3ddda6345c3c8ce45639d4449451f1d5828d7a70845e446f04905937cd": "XRP",
  // XRP/USD testnet
  "0x0003d338ea2ac3be9e026033b1aa601673c37bab5e13851c59966f9f820754d6": "SOL"
  // SOL/USD testnet
};
var FEED_IDS = Object.keys(FEED_ID_TO_CRYPTO);
var ChainlinkDataStreams = class {
  stream = null;
  client = null;
  subscribers = /* @__PURE__ */ new Map();
  isConnected = false;
  constructor() {
    ;
    ["BTC", "ETH", "XRP", "SOL"].forEach((crypto2) => {
      this.subscribers.set(crypto2, /* @__PURE__ */ new Set());
    });
  }
  connect() {
    if (this.stream && this.isConnected) {
      return;
    }
    if (!CHAINLINK_WS_URL || !CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      return;
    }
    try {
      this.client = (0, import_data_streams_sdk.createClient)({
        apiKey: CHAINLINK_USER_ID,
        // Le SDK utilise apiKey au lieu de USER_ID
        userSecret: CHAINLINK_USER_SECRET,
        endpoint: CHAINLINK_API_URL,
        wsEndpoint: CHAINLINK_WS_URL,
        logging: {
          logger: {
            error: () => {
            },
            // Supprimer tous les logs
            warn: () => {
            },
            info: () => {
            },
            debug: () => {
            }
          },
          logLevel: import_data_streams_sdk.LogLevel.ERROR
        }
      });
      this.stream = this.client.createStream(FEED_IDS);
      this.stream.on("report", async (report) => {
        await this.handleReport(report);
      });
      this.stream.on("error", (error) => {
        console.error("Chainlink stream error:", error);
      });
      this.stream.on("disconnected", () => {
        this.isConnected = false;
      });
      this.stream.on("reconnecting", () => {
      });
      this.stream.connect().then(() => {
        this.isConnected = true;
      }).catch((error) => {
        console.error("Error connecting Chainlink stream:", error);
      });
    } catch (error) {
      console.error("Error initializing Chainlink client:", error);
    }
  }
  async handleReport(report) {
    try {
      let decodedReport;
      if (report.price !== void 0 || report.feedID) {
        decodedReport = report;
      } else if (report.fullReport) {
        decodedReport = (0, import_data_streams_sdk.decodeReport)(report.fullReport, report.feedID);
      } else {
        return;
      }
      const feedId = decodedReport.feedID;
      if (!feedId) {
        return;
      }
      const crypto2 = FEED_ID_TO_CRYPTO[feedId];
      if (!crypto2 || !["BTC", "ETH", "XRP", "SOL"].includes(crypto2)) {
        return;
      }
      let price;
      let timestamp = Date.now();
      if ("price" in decodedReport && decodedReport.price !== void 0) {
        const priceBigInt = typeof decodedReport.price === "bigint" ? decodedReport.price : BigInt(decodedReport.price);
        price = Number(priceBigInt) / 1e18;
      } else if ("bid" in decodedReport && "ask" in decodedReport && decodedReport.bid !== void 0 && decodedReport.ask !== void 0) {
        const bidBigInt = typeof decodedReport.bid === "bigint" ? decodedReport.bid : BigInt(decodedReport.bid);
        const askBigInt = typeof decodedReport.ask === "bigint" ? decodedReport.ask : BigInt(decodedReport.ask);
        const midPrice = (Number(bidBigInt) + Number(askBigInt)) / 2;
        price = midPrice / 1e18;
      } else if ("bid" in decodedReport && decodedReport.bid !== void 0) {
        const bidBigInt = typeof decodedReport.bid === "bigint" ? decodedReport.bid : BigInt(decodedReport.bid);
        price = Number(bidBigInt) / 1e18;
      } else if ("midPrice" in decodedReport && decodedReport.midPrice !== void 0) {
        const midPriceBigInt = typeof decodedReport.midPrice === "bigint" ? decodedReport.midPrice : BigInt(decodedReport.midPrice);
        price = Number(midPriceBigInt) / 1e18;
      }
      if ("observationsTimestamp" in decodedReport && typeof decodedReport.observationsTimestamp === "number") {
        timestamp = decodedReport.observationsTimestamp * 1e3;
      } else if ("validFromTimestamp" in decodedReport && typeof decodedReport.validFromTimestamp === "number") {
        timestamp = decodedReport.validFromTimestamp * 1e3;
      }
      if (typeof price !== "number" || !price || isNaN(price)) {
        return;
      }
      const range = PRICE_RANGES[crypto2];
      if (price < range.min || price > range.max) {
      }
      const candleTimestamp = getExactCandleTimestamp(timestamp);
      const priceData = {
        crypto: crypto2,
        price,
        timestamp
      };
      let openPriceStr = await redis_default.get(
        CACHE_KEYS.candleOpenPrice(crypto2, candleTimestamp)
      );
      if (!openPriceStr) {
        const chainlinkOpenPrice = await this.fetchCandleOpenPriceFromChainlink(crypto2, candleTimestamp);
        if (chainlinkOpenPrice !== null) {
          priceData.openPrice = chainlinkOpenPrice;
        } else {
          await redis_default.set(
            CACHE_KEYS.candleOpenPrice(crypto2, candleTimestamp),
            price.toString(),
            { ex: 900 }
            // 15 minutes
          );
          priceData.openPrice = price;
        }
      } else {
        priceData.openPrice = parseFloat(openPriceStr);
      }
      await redis_default.set(CACHE_KEYS.price(crypto2), JSON.stringify(priceData), { ex: 300 });
      try {
        await mongodb_default();
        await PriceHistory_default.create({
          crypto: crypto2,
          price,
          timestamp: new Date(priceData.timestamp)
        });
      } catch (error) {
        console.error(`Error saving price history for ${crypto2}:`, error);
      }
      const subscribers = this.subscribers.get(crypto2);
      if (subscribers) {
        subscribers.forEach((callback) => callback(priceData));
      }
    } catch (error) {
      console.error("Error handling Chainlink report:", error);
    }
  }
  subscribe(crypto2, callback) {
    const subscribers = this.subscribers.get(crypto2);
    if (subscribers) {
      subscribers.add(callback);
    }
    if (!this.isConnected) {
      this.connect();
    }
  }
  unsubscribe(crypto2, callback) {
    const subscribers = this.subscribers.get(crypto2);
    if (subscribers) {
      subscribers.delete(callback);
    }
  }
  /**
   * Génère les en-têtes d'authentification HMAC pour l'API REST Chainlink
   */
  generateAuthHeaders(method, path, body) {
    if (!CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      throw new Error("Chainlink credentials not configured");
    }
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const message = `${CHAINLINK_USER_ID}${timestamp}${path}${body || ""}`;
    const signature = crypto.createHmac("sha256", CHAINLINK_USER_SECRET).update(message).digest("hex");
    return {
      "x-chainlink-user-id": CHAINLINK_USER_ID,
      "x-chainlink-timestamp": timestamp,
      "x-chainlink-signature": signature,
      "Content-Type": "application/json"
    };
  }
  /**
   * Récupère un rapport depuis l'API REST Chainlink au timestamp spécifié
   */
  async fetchReportFromChainlinkAPI(feedId, timestamp) {
    if (!CHAINLINK_API_URL || !CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      return null;
    }
    try {
      const timestampSeconds = Math.floor(timestamp / 1e3);
      const endpoints = [
        `/feeds/${feedId}/reports/${timestampSeconds}`,
        `/feeds/${feedId}/reports?timestamp=${timestampSeconds}`,
        `/reports/${feedId}?timestamp=${timestampSeconds}`,
        `/feeds/${feedId}/reports/latest?timestamp=${timestampSeconds}`
      ];
      for (const endpoint of endpoints) {
        try {
          const headers = this.generateAuthHeaders("GET", endpoint);
          const url = `${CHAINLINK_API_URL}${endpoint}`;
          const response = await import_axios.default.get(url, {
            headers,
            timeout: 5e3
          });
          if (response.data && (response.data.fullReport || response.data.report)) {
            return response.data;
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            continue;
          }
        }
      }
      try {
        const latestEndpoint = `/feeds/${feedId}/reports/latest`;
        const headers = this.generateAuthHeaders("GET", latestEndpoint);
        const url = `${CHAINLINK_API_URL}${latestEndpoint}`;
        const response = await import_axios.default.get(url, {
          headers,
          timeout: 5e3
        });
        if (response.data) {
          return response.data;
        }
      } catch (error) {
      }
    } catch (error) {
    }
    return null;
  }
  /**
   * Récupère le prix d'ouverture d'une bougie depuis l'API Chainlink
   * au timestamp exact de la bougie (00:00, 00:15, 00:30, 00:45)
   */
  async fetchCandleOpenPriceFromChainlink(crypto2, candleTimestamp) {
    if (!this.client && !CHAINLINK_API_URL) {
      return null;
    }
    try {
      const feedId = Object.entries(FEED_ID_TO_CRYPTO).find(([_, c]) => c === crypto2)?.[0];
      if (!feedId) {
        return null;
      }
      if (this.client) {
        try {
          const timestampSeconds = Math.floor(candleTimestamp / 1e3);
          if (typeof this.client.getReportByTimestamp === "function") {
            const report2 = await this.client.getReportByTimestamp(feedId, timestampSeconds);
            if (report2 && report2.fullReport) {
              const decoded = (0, import_data_streams_sdk.decodeReport)(report2.fullReport, report2.feedID);
              let openPrice;
              if ("price" in decoded && decoded.price !== void 0) {
                const priceBigInt = typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price);
                openPrice = Number(priceBigInt) / 1e18;
              } else if ("bid" in decoded && decoded.bid !== void 0) {
                const bidBigInt = typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid);
                openPrice = Number(bidBigInt) / 1e18;
              }
              if (openPrice && !isNaN(openPrice)) {
                await redis_default.set(
                  CACHE_KEYS.candleOpenPrice(crypto2, candleTimestamp),
                  openPrice.toString(),
                  { ex: 900 }
                  // 15 minutes
                );
                return openPrice;
              }
            }
          }
        } catch (error) {
        }
      }
      const report = await this.fetchReportFromChainlinkAPI(feedId, candleTimestamp);
      if (report) {
        const fullReport = report.fullReport || report.report;
        if (fullReport) {
          const decoded = (0, import_data_streams_sdk.decodeReport)(fullReport, feedId);
          let openPrice;
          if ("price" in decoded && decoded.price !== void 0) {
            const priceBigInt = typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price);
            openPrice = Number(priceBigInt) / 1e18;
          } else if ("bid" in decoded && decoded.bid !== void 0) {
            const bidBigInt = typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid);
            openPrice = Number(bidBigInt) / 1e18;
          }
          if (openPrice && !isNaN(openPrice)) {
            await redis_default.set(
              CACHE_KEYS.candleOpenPrice(crypto2, candleTimestamp),
              openPrice.toString(),
              { ex: 900 }
              // 15 minutes
            );
            return openPrice;
          }
        }
      }
    } catch (error) {
    }
    return null;
  }
  async getLatestPrice(crypto2) {
    try {
      const cached2 = await redis_default.get(CACHE_KEYS.price(crypto2));
      if (cached2) {
        return JSON.parse(cached2);
      }
    } catch (error) {
      console.error(`Error getting cached price for ${crypto2}:`, error);
    }
    try {
      await mongodb_default();
      const latest = await PriceHistory_default.findOne({ crypto: crypto2 }).sort({ timestamp: -1 }).lean().exec();
      if (latest && typeof latest === "object" && "price" in latest && "timestamp" in latest) {
        return {
          crypto: crypto2,
          price: latest.price,
          timestamp: new Date(latest.timestamp).getTime()
        };
      }
    } catch (error) {
      console.error(`Error getting price from DB for ${crypto2}:`, error);
    }
    if (this.client) {
      try {
        const feedId = Object.entries(FEED_ID_TO_CRYPTO).find(([_, c]) => c === crypto2)?.[0];
        if (feedId) {
          const report = await this.client.getLatestReport(feedId);
          if (report) {
            const decoded = (0, import_data_streams_sdk.decodeReport)(report.fullReport, report.feedID);
            let price;
            if ("price" in decoded && decoded.price !== void 0) {
              const priceBigInt = typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price);
              price = Number(priceBigInt) / 1e18;
            } else if ("bid" in decoded && decoded.bid !== void 0) {
              const bidBigInt = typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid);
              price = Number(bidBigInt) / 1e18;
            }
            if (price && !isNaN(price)) {
              const timestamp = "observationsTimestamp" in decoded && typeof decoded.observationsTimestamp === "number" ? decoded.observationsTimestamp * 1e3 : Date.now();
              return {
                crypto: crypto2,
                price,
                timestamp
              };
            }
          }
        }
      } catch (error) {
        console.error(`Error getting latest price from Chainlink API for ${crypto2}:`, error);
      }
    }
    return null;
  }
  /**
   * Méthode publique pour récupérer le prix d'ouverture d'une bougie depuis Chainlink
   */
  async getCandleOpenPrice(crypto2, candleTimestamp) {
    try {
      const cached2 = await redis_default.get(
        CACHE_KEYS.candleOpenPrice(crypto2, candleTimestamp)
      );
      if (cached2) {
        return parseFloat(cached2);
      }
    } catch (error) {
    }
    return await this.fetchCandleOpenPriceFromChainlink(crypto2, candleTimestamp);
  }
  disconnect() {
    if (this.stream) {
      this.stream.close().catch((error) => {
        console.error("Error closing Chainlink stream:", error);
      });
      this.stream = null;
    }
    this.isConnected = false;
  }
};
var chainlinkStreamsInstance = null;
function getChainlinkStreams() {
  if (typeof window !== "undefined") {
    throw new Error("Chainlink streams should only be used server-side");
  }
  if (!chainlinkStreamsInstance) {
    chainlinkStreamsInstance = new ChainlinkDataStreams();
    chainlinkStreamsInstance.connect();
  }
  return chainlinkStreamsInstance;
}
var chainlinkStreams = typeof window === "undefined" ? getChainlinkStreams() : null;

// src/models/Trade.ts
var import_mongoose5 = __toESM(require("mongoose"));
var TradeSchema = new import_mongoose5.Schema(
  {
    strategyId: {
      type: import_mongoose5.Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
      index: true
    },
    marketId: {
      type: String,
      required: true,
      index: true
    },
    side: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      required: true,
      default: "pending"
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);
TradeSchema.index({ strategyId: 1, executedAt: -1 });
TradeSchema.index({ executedAt: -1 });
var Trade_default = import_mongoose5.default.models.Trade || import_mongoose5.default.model("Trade", TradeSchema);

// src/lib/polymarket.ts
var import_axios2 = __toESM(require("axios"));
var POLYMARKET_CLOB_API_URL = process.env.POLYMARKET_CLOB_API_URL || process.env.POLYMARKET_CLOB_HOST || "https://clob.polymarket.com";
var POLYMARKET_SUBGRAPH_URL = process.env.POLYMARKET_SUBGRAPH_URL || "https://api.thegraph.com/subgraphs/name/polymarket/matic";
var POLYMARKET_GAMMA_HOST = "https://gamma-api.polymarket.com";
var GAMMA_EVENT_SLUG_ENDPOINT = `${POLYMARKET_GAMMA_HOST}/events/slug`;
var GAMMA_MARKET_SLUG_ENDPOINT = `${POLYMARKET_GAMMA_HOST}/markets/slug`;
var PolymarketCLOB = class {
  baseURL;
  constructor() {
    this.baseURL = POLYMARKET_CLOB_API_URL;
  }
  /**
   * Génère le slug du marché pour une crypto et une bougie 15m
   * Format: {crypto_lower}-updown-15m-{timestamp}
   */
  getMarketSlug(crypto2, candleTimestamp) {
    const cryptoLower = crypto2.toLowerCase();
    return `${cryptoLower}-updown-15m-${candleTimestamp}`;
  }
  /**
   * Récupère un marché complet en combinant les endpoints events et markets de l'API Gamma
   */
  async fetchMarketBySlug(slug) {
    try {
      const eventUrl = `${GAMMA_EVENT_SLUG_ENDPOINT}/${slug}`;
      const eventResp = await import_axios2.default.get(eventUrl, { timeout: 1e4 });
      if (eventResp.status === 404) {
        return null;
      }
      const eventData = eventResp.data;
      const marketUrl = `${GAMMA_MARKET_SLUG_ENDPOINT}/${slug}`;
      const marketResp = await import_axios2.default.get(marketUrl, { timeout: 1e4 });
      if (marketResp.status === 404) {
        return null;
      }
      const marketData = marketResp.data;
      let clobTokenIds = [];
      const clobTokenIdsRaw = marketData.clobTokenIds || [];
      if (typeof clobTokenIdsRaw === "string") {
        try {
          clobTokenIds = JSON.parse(clobTokenIdsRaw);
        } catch (parseError) {
          console.error(`Failed to parse clobTokenIds JSON: ${parseError}`);
          return null;
        }
      } else if (Array.isArray(clobTokenIdsRaw)) {
        clobTokenIds = clobTokenIdsRaw;
      }
      if (clobTokenIds.length < 2) {
        return null;
      }
      return {
        id: marketData.id,
        question: marketData.question || "",
        conditionId: marketData.conditionId,
        slug,
        active: eventData.active || false,
        closed: eventData.closed || true,
        title: eventData.title || "",
        description: eventData.description || "",
        liquidity: marketData.liquidity || "0",
        startDate: marketData.startDate,
        endDate: marketData.endDate,
        tokens: [
          { id: clobTokenIds[0], outcome: "Up" },
          { id: clobTokenIds[1], outcome: "Down" }
        ],
        clobTokenIds
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching market by slug ${slug}:`, error.message);
      return null;
    }
  }
  /**
   * Récupère les informations d'un marché via l'API Gamma Polymarket
   * Utilise les endpoints /events/slug et /markets/slug pour obtenir toutes les informations
   */
  async getMarket(crypto2, candleTimestamp) {
    const cacheKey = CACHE_KEYS.market(crypto2, candleTimestamp);
    try {
      const cached2 = await redis_default.get(cacheKey);
      if (cached2 !== null) {
        if (cached2 === "null") {
          return null;
        }
        try {
          const parsed = JSON.parse(cached2);
          return parsed;
        } catch {
        }
      }
      const slug = this.getMarketSlug(crypto2, candleTimestamp);
      const completeMarket = await this.fetchMarketBySlug(slug);
      if (!completeMarket) {
        await redis_default.set(cacheKey, "null", { ex: 60 });
        return null;
      }
      if (!completeMarket.active || completeMarket.closed) {
        await redis_default.set(cacheKey, "null", { ex: 300 });
        return null;
      }
      const market = {
        id: completeMarket.id || completeMarket.conditionId || "",
        slug: completeMarket.slug || slug,
        question: completeMarket.question || `${crypto2} price 15m candle`,
        active: completeMarket.active,
        tokens: {
          yes: completeMarket.clobTokenIds[0] || "",
          no: completeMarket.clobTokenIds[1] || ""
        }
      };
      await redis_default.set(cacheKey, JSON.stringify(market), { ex: 3600 });
      return market;
    } catch (error) {
      console.error(`Error fetching market for ${crypto2} at ${candleTimestamp}:`, error);
      return null;
    }
  }
  /**
   * Récupère le ticker (orderbook) d'un marché
   */
  async getTicker(marketId) {
    try {
      const response = await import_axios2.default.get(`${this.baseURL}/ticker/${marketId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ticker for market ${marketId}:`, error);
      return null;
    }
  }
  /**
   * Place un ordre d'achat
   */
  async buyOrder(marketId, side, price, size, signature, walletAddress) {
    try {
      const response = await import_axios2.default.post(
        `${this.baseURL}/orders`,
        {
          market_id: marketId,
          side: side === "UP" ? "buy_up" : "buy_down",
          price,
          size
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${signature}`,
            "X-Wallet-Address": walletAddress
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error placing order:", error.response?.data || error.message);
      throw error;
    }
  }
  /**
   * Récupère le marché actuel pour une crypto
   */
  async getCurrentMarket(crypto2) {
    const currentCandle = getCandleTimestamp(Date.now());
    return this.getMarket(crypto2, currentCandle);
  }
  /**
   * Vérifie si un marché est valide pour le trading
   */
  async validateMarket(market) {
    if (!market.active) {
      return false;
    }
    if (!market.tokens.yes || !market.tokens.no) {
      return false;
    }
    const ticker = await this.getTicker(market.id);
    if (!ticker || !ticker.bid || !ticker.ask) {
      return false;
    }
    return true;
  }
};
var polymarketCLOB = new PolymarketCLOB();

// src/lib/polymarket-builder.ts
init_dist();
var import_builder_signing_sdk = require("@polymarket/builder-signing-sdk");
var import_ethers = require("ethers");
var ClobClientClass = null;
var ClobSideEnum = {
  BUY: "buy",
  SELL: "sell"
};
var clobModule = dist_exports;
if (clobModule?.ClobClient) {
  ClobClientClass = clobModule.ClobClient;
}
if (clobModule?.Side) {
  ClobSideEnum = clobModule.Side;
}
if (!ClobClientClass) {
  console.error("Failed to load ClobClient from @polymarket/clob-client");
}
var POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
var POLYMARKET_CLOB_HOST = process.env.POLYMARKET_CLOB_HOST || "https://clob.polymarket.com";
var CHAIN_ID = parseInt(process.env.POLYGON_CHAIN_ID || "137");
var SignatureTypeValue = 3;
try {
  const clobClientModule = (init_dist(), __toCommonJS(dist_exports));
  if (clobClientModule.SignatureType && clobClientModule.SignatureType.POLY_PROXY !== void 0) {
    SignatureTypeValue = clobClientModule.SignatureType.POLY_PROXY;
  }
} catch {
  SignatureTypeValue = 3;
}
var PolymarketBuilderClient = class {
  clobClient = null;
  provider = null;
  initialized = false;
  /**
   * Initialise le client CLOB avec le builder signing
   */
  async initialize() {
    if (this.initialized && this.clobClient) {
      return;
    }
    try {
      if (!process.env.POLY_BUILDER_API_KEY || !process.env.POLY_BUILDER_SECRET) {
        return;
      }
      this.provider = new import_ethers.ethers.JsonRpcProvider(POLYGON_RPC_URL);
      const builderConfig = new import_builder_signing_sdk.BuilderConfig({
        remoteBuilderConfig: {
          url: process.env.NEXT_PUBLIC_BUILDER_SIGN_URL || "http://localhost:3000/api/builder/sign"
        }
      });
      const dummyWallet = new import_ethers.ethers.Wallet(import_ethers.ethers.Wallet.createRandom().privateKey, this.provider);
      if (!ClobClientClass) {
        throw new Error("ClobClient class is not available");
      }
      this.clobClient = new ClobClientClass(
        POLYMARKET_CLOB_HOST,
        CHAIN_ID,
        dummyWallet,
        void 0,
        // pas de credentials utilisateur
        SignatureTypeValue,
        // Utiliser POLY_PROXY (valeur 3) pour le builder code
        void 0,
        // pas de funder address pour le builder code
        void 0,
        false,
        builderConfig
      );
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
    }
  }
  /**
   * Place un ordre sur Polymarket
   */
  async placeOrder(walletAddress, tokenId, side, price, size) {
    if (!this.clobClient) {
      await this.initialize();
    }
    if (!this.clobClient) {
      throw new Error("Failed to initialize CLOB client");
    }
    try {
      const orderSide = side === "UP" ? ClobSideEnum.BUY : ClobSideEnum.SELL;
      const client = this.clobClient;
      if (!client?.createOrder) {
        throw new Error("ClobClient.createOrder is not available in this version of @polymarket/clob-client");
      }
      const order = await client.createOrder({
        price: price.toString(),
        side: orderSide,
        size: size.toString(),
        tokenID: tokenId,
        walletAddress: walletAddress.toLowerCase()
      });
      if (!client?.postOrder) {
        throw new Error("ClobClient.postOrder is not available in this version of @polymarket/clob-client");
      }
      const response = await client.postOrder(order);
      return {
        success: true,
        orderId: response.id || response.order_id || response.clob_order_id,
        order: response
      };
    } catch (error) {
      console.error("Error placing order:", error);
      throw error;
    }
  }
  /**
   * Vérifie l'allowance actuelle
   */
  async checkAllowance(walletAddress, tokenId) {
    if (!this.clobClient) {
      await this.initialize();
    }
    if (!this.clobClient || !this.provider) {
      throw new Error("Failed to initialize CLOB client");
    }
    try {
      const client = this.clobClient;
      if (!client?.getAllowance) {
        throw new Error("ClobClient.getAllowance is not available in this version of @polymarket/clob-client");
      }
      const allowance = await client.getAllowance(walletAddress, tokenId);
      return allowance;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return 0;
    }
  }
  /**
   * Vérifie si l'allowance est suffisante
   */
  async ensureAllowance(walletAddress, tokenId, amount) {
    try {
      const allowance = await this.checkAllowance(walletAddress, tokenId);
      if (allowance < amount) {
        console.warn(
          `Insufficient allowance for wallet ${walletAddress}. Current: ${allowance}, Required: ${amount}`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  }
  /**
   * Approuve une allowance (nécessite la signature du wallet de l'utilisateur)
   * Cette méthode ne peut pas être appelée automatiquement car elle nécessite
   * la signature de l'utilisateur. Elle doit être appelée depuis le client
   * avec le wallet connecté.
   */
  async approveAllowance(walletAddress, tokenId, amount, signer) {
    if (!this.clobClient) {
      await this.initialize();
    }
    if (!this.clobClient || !this.provider) {
      throw new Error("Failed to initialize CLOB client");
    }
    try {
      const client = this.clobClient;
      if (!client?.approveAllowance) {
        throw new Error("ClobClient.approveAllowance is not available in this version of @polymarket/clob-client");
      }
      const tx = await client.approveAllowance({
        tokenID: tokenId,
        amount: amount.toString(),
        signer
      });
      return tx.hash || tx.transactionHash || "";
    } catch (error) {
      console.error("Error approving allowance:", error);
      throw error;
    }
  }
  /**
   * Récupère le token ID pour un marché (YES ou NO)
   */
  getTokenId(marketTokenYes, marketTokenNo, side) {
    return side === "UP" ? marketTokenYes : marketTokenNo;
  }
};
var polymarketBuilder = new PolymarketBuilderClient();

// src/lib/strategies/timed-strategy.ts
function normalizeId(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toString" in value) {
    return value.toString();
  }
  return String(value ?? "");
}
function normalizeStrategy(doc) {
  return {
    id: normalizeId(doc._id),
    userId: normalizeId(doc.userId),
    walletId: normalizeId(doc.walletId),
    crypto: doc.crypto,
    priceThreshold: Number(doc.priceThreshold) || 0,
    orderAmount: Number(doc.orderAmount) || 0,
    orderPriceCents: doc.orderPrice !== void 0 && doc.orderPrice !== null ? Number(doc.orderPrice) : null,
    tradingWindowStartMinute: Math.max(0, Math.min(14, Number(doc.tradingWindowStartMinute) || 0)),
    tradingWindowStartSecond: Math.max(0, Math.min(59, Number(doc.tradingWindowStartSecond) || 0)),
    tradingWindowEndMinute: doc.tradingWindowEndMinute !== void 0 && doc.tradingWindowEndMinute !== null ? Math.max(0, Math.min(14, Number(doc.tradingWindowEndMinute))) : 14,
    buyUpOnly: Boolean(doc.buyUpOnly)
  };
}
function normalizeWallet(doc) {
  return {
    id: normalizeId(doc._id),
    address: doc.address,
    safeWalletAddress: doc.safeWalletAddress,
    name: doc.name
  };
}
var TimedStrategyRunner = class {
  strategy;
  wallet;
  currentCandleTimestamp = null;
  candleOpenPrice = null;
  currentMarket = null;
  orderPlacedThisCandle = false;
  initialized = false;
  processing = false;
  pendingPriceData = null;
  lastLoggedMinute = null;
  lastWindowLogBucket = null;
  constructor(options) {
    this.strategy = normalizeStrategy(options.strategy);
    this.wallet = normalizeWallet(options.wallet);
  }
  updateStrategy(strategy) {
    this.strategy = normalizeStrategy(strategy);
  }
  updateWallet(wallet) {
    this.wallet = normalizeWallet(wallet);
  }
  resetState() {
    this.currentCandleTimestamp = null;
    this.candleOpenPrice = null;
    this.currentMarket = null;
    this.orderPlacedThisCandle = false;
    this.initialized = false;
    this.lastLoggedMinute = null;
    this.lastWindowLogBucket = null;
  }
  stop() {
    this.resetState();
  }
  async handlePriceUpdate(priceData) {
    if (this.processing) {
      this.pendingPriceData = priceData;
      return;
    }
    this.processing = true;
    try {
      await this.processPriceUpdate(priceData);
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto} - ${this.strategy.id}) process error:`,
        error
      );
    } finally {
      this.processing = false;
      if (this.pendingPriceData) {
        const next = this.pendingPriceData;
        this.pendingPriceData = null;
        await this.handlePriceUpdate(next);
      }
    }
  }
  async processPriceUpdate(priceData) {
    const candleTimestamp = getCandleTimestamp(priceData.timestamp);
    const minuteInCandle = getCandleMinute(priceData.timestamp);
    if (this.currentCandleTimestamp === null || this.currentCandleTimestamp !== candleTimestamp) {
      await this.onNewCandle(candleTimestamp, minuteInCandle, priceData);
    }
    if (this.currentCandleTimestamp === null) {
      return;
    }
    const openPrice = await this.ensureOpenPrice(priceData);
    if (openPrice === null) {
      return;
    }
    if (!this.initialized) {
      return;
    }
    const windowState = this.getWindowState(priceData.timestamp);
    if (!windowState.inWindow) {
      return;
    }
    if (this.orderPlacedThisCandle) {
      return;
    }
    const market = await this.ensureMarket(this.currentCandleTimestamp);
    if (!market) {
      return;
    }
    const priceDiff = priceData.price - openPrice;
    const threshold = this.strategy.priceThreshold;
    let side = null;
    if (priceDiff >= threshold) {
      side = "UP";
    } else if (!this.strategy.buyUpOnly && priceDiff <= -threshold) {
      side = "DOWN";
    }
    this.logWindowState(priceData, priceDiff, windowState.secondsRemaining);
    if (!side) {
      return;
    }
    await this.executeTrade({
      side,
      market,
      price: priceData.price,
      priceDiff
    });
  }
  async onNewCandle(candleTimestamp, minuteInCandle, priceData) {
    this.currentCandleTimestamp = candleTimestamp;
    this.candleOpenPrice = null;
    this.currentMarket = null;
    this.orderPlacedThisCandle = false;
    this.lastLoggedMinute = null;
    this.lastWindowLogBucket = null;
    if (minuteInCandle === 0) {
      await this.setOpenPrice(priceData);
      if (this.candleOpenPrice !== null) {
        this.initialized = true;
      }
    } else if (!this.initialized) {
      console.warn(
        `TimedStrategyRunner(${this.strategy.crypto}) detected candle change at minute ${minuteInCandle}. Waiting for next full candle to initialize.`
      );
    }
  }
  async ensureOpenPrice(priceData) {
    if (this.candleOpenPrice !== null) {
      return this.candleOpenPrice;
    }
    await this.setOpenPrice(priceData);
    return this.candleOpenPrice;
  }
  async setOpenPrice(priceData) {
    if (this.currentCandleTimestamp === null) {
      return;
    }
    const cacheKey = CACHE_KEYS.candleOpenPrice(this.strategy.crypto, this.currentCandleTimestamp);
    if (typeof priceData.openPrice === "number" && !Number.isNaN(priceData.openPrice)) {
      this.candleOpenPrice = priceData.openPrice;
      await redis_default.set(cacheKey, priceData.openPrice.toString(), { ex: 900 });
      return;
    }
    const cached2 = await redis_default.get(cacheKey);
    if (cached2 !== null) {
      const parsed = parseFloat(cached2);
      if (!Number.isNaN(parsed)) {
        this.candleOpenPrice = parsed;
        return;
      }
    }
    const minuteInCandle = getCandleMinute(priceData.timestamp);
    if (minuteInCandle === 0) {
      this.candleOpenPrice = priceData.price;
      await redis_default.set(cacheKey, priceData.price.toString(), { ex: 900 });
    }
  }
  getWindowState(timestamp) {
    if (this.currentCandleTimestamp === null) {
      return { inWindow: false, secondsRemaining: null };
    }
    const date = new Date(timestamp);
    const minute = date.getMinutes() % 15;
    const second = date.getSeconds();
    const startMinute = this.strategy.tradingWindowStartMinute;
    const startSecond = this.strategy.tradingWindowStartSecond;
    const endMinute = Math.min(14, Math.max(startMinute, this.strategy.tradingWindowEndMinute ?? 14));
    const windowStart = this.currentCandleTimestamp + startMinute * 60 * 1e3 + startSecond * 1e3;
    const windowEnd = this.currentCandleTimestamp + endMinute * 60 * 1e3 + 59 * 1e3 + 999;
    if (timestamp < windowStart || timestamp > windowEnd) {
      return { inWindow: false, secondsRemaining: null };
    }
    let secondsRemaining = null;
    if (minute === endMinute) {
      secondsRemaining = Math.max(0, 60 - second);
    } else {
      const minutesRemaining = endMinute - minute;
      secondsRemaining = minutesRemaining * 60 + (60 - second);
    }
    return {
      inWindow: true,
      secondsRemaining
    };
  }
  async ensureMarket(candleTimestamp) {
    if (this.currentMarket) {
      return this.currentMarket;
    }
    try {
      const market = await polymarketCLOB.getMarket(this.strategy.crypto, candleTimestamp);
      if (!market) {
        console.debug(
          `TimedStrategyRunner(${this.strategy.crypto}) no active market for candle ${candleTimestamp}`
        );
        return null;
      }
      if (!market.tokens?.yes || !market.tokens?.no) {
        console.warn(
          `TimedStrategyRunner(${this.strategy.crypto}) market ${market.id} missing token IDs`
        );
        return null;
      }
      this.currentMarket = market;
      return market;
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error fetching market:`,
        error
      );
      return null;
    }
  }
  async executeTrade({
    side,
    market,
    price,
    priceDiff
  }) {
    if (!this.currentCandleTimestamp) {
      return;
    }
    const orderPrice = await this.resolveOrderPrice(side, market);
    if (orderPrice === null) {
      console.warn(
        `TimedStrategyRunner(${this.strategy.crypto}) unable to determine order price for ${side}`
      );
      return;
    }
    const tokenId = polymarketBuilder.getTokenId(
      market.tokens.yes,
      market.tokens.no,
      side
    );
    try {
      const hasAllowance = await polymarketBuilder.ensureAllowance(
        this.wallet.address,
        tokenId,
        this.strategy.orderAmount
      );
      if (!hasAllowance) {
        console.error(
          `TimedStrategyRunner(${this.strategy.crypto}) insufficient allowance for wallet ${this.wallet.address}`
        );
        await this.logTrade({
          marketId: market.id,
          side,
          price: orderPrice,
          status: "failed"
        });
        this.orderPlacedThisCandle = true;
        return;
      }
      console.info(
        `TimedStrategyRunner(${this.strategy.crypto}) placing ${side} order | diff=$${priceDiff.toFixed(
          2
        )} | open=$${this.candleOpenPrice?.toFixed(2) ?? "?"} | current=$${price.toFixed(2)}`
      );
      const orderResult = await polymarketBuilder.placeOrder(
        this.wallet.address,
        tokenId,
        side,
        orderPrice,
        this.strategy.orderAmount
      );
      await this.logTrade({
        marketId: market.id,
        side,
        price: orderPrice,
        status: orderResult.success ? "executed" : "failed"
      });
      this.orderPlacedThisCandle = true;
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error placing order ${side}:`,
        error
      );
      await this.logTrade({
        marketId: market.id,
        side,
        price: orderPrice,
        status: "failed"
      });
      this.orderPlacedThisCandle = true;
    }
  }
  async resolveOrderPrice(side, market) {
    if (this.strategy.orderPriceCents !== null) {
      return this.strategy.orderPriceCents / 100;
    }
    try {
      const ticker = await polymarketCLOB.getTicker(market.id);
      if (!ticker) {
        return null;
      }
      const ask = typeof ticker.ask === "string" ? parseFloat(ticker.ask) : ticker.ask;
      const bid = typeof ticker.bid === "string" ? parseFloat(ticker.bid) : ticker.bid;
      if (side === "UP" && typeof ask === "number" && !Number.isNaN(ask)) {
        return ask;
      }
      if (side === "DOWN" && typeof bid === "number" && !Number.isNaN(bid)) {
        return bid;
      }
      return null;
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error fetching ticker for market ${market.id}:`,
        error
      );
      return null;
    }
  }
  async logTrade({
    marketId,
    side,
    price,
    status
  }) {
    try {
      await Trade_default.create({
        strategyId: this.strategy.id,
        marketId,
        side,
        price,
        size: this.strategy.orderAmount,
        status,
        executedAt: /* @__PURE__ */ new Date()
      });
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error logging trade for market ${marketId}:`,
        error
      );
    }
  }
  logWindowState(priceData, priceDiff, secondsRemaining) {
    if (this.currentCandleTimestamp === null) {
      return;
    }
    const minute = getCandleMinute(priceData.timestamp);
    const secondBucket = Math.floor(new Date(priceData.timestamp).getSeconds() / 5);
    const shouldLog = this.lastLoggedMinute !== minute || secondsRemaining !== null && secondsRemaining <= 30 && this.lastWindowLogBucket !== secondBucket;
    if (!shouldLog) {
      return;
    }
    this.lastLoggedMinute = minute;
    this.lastWindowLogBucket = secondBucket;
    const remainingLabel = secondsRemaining !== null ? `${secondsRemaining}s remaining` : "";
    const diffLabel = priceDiff >= 0 ? `+${priceDiff.toFixed(2)}` : priceDiff.toFixed(2);
    console.info(
      `\u{1F4CA} ${this.strategy.crypto} | minute ${minute.toString().padStart(2, "0")} | price=$${priceData.price.toFixed(
        2
      )} | diff=$${diffLabel} | threshold=\xB1$${this.strategy.priceThreshold.toFixed(
        2
      )} ${remainingLabel}`
    );
  }
};

// src/lib/trading-engine.ts
var TradingEngine = class {
  activeStrategies = /* @__PURE__ */ new Map();
  priceCallbacks = /* @__PURE__ */ new Map();
  /**
   * Initialise le moteur de trading
   */
  async initialize() {
    try {
      await mongodb_default();
    } catch (error) {
      console.error("Failed to connect to database (non-fatal):", error);
      return;
    }
    polymarketBuilder.initialize().catch((error) => {
    });
    try {
      await this.loadActiveStrategies();
      this.setupPriceSubscriptions();
    } catch (error) {
      console.error("Error loading strategies or setting up subscriptions (non-fatal):", error);
    }
  }
  /**
   * Charge les stratégies actives depuis la base de données
   */
  async loadActiveStrategies() {
    const strategies = await Strategy_default.find({ enabled: true }).lean();
    if (!strategies.length) {
      this.activeStrategies.forEach((execution) => execution.runner.stop());
      this.activeStrategies.clear();
      return;
    }
    const walletIds = Array.from(
      new Set(strategies.map((strategy) => String(strategy.walletId)))
    );
    const wallets = await Wallet_default.find({ _id: { $in: walletIds } }).lean();
    const walletMap = new Map(
      wallets.map((wallet) => [String(wallet._id), wallet])
    );
    const seen = /* @__PURE__ */ new Set();
    for (const strategy of strategies) {
      const strategyId = String(strategy._id);
      const walletId = String(strategy.walletId);
      const wallet = walletMap.get(walletId);
      if (!wallet) {
        console.warn(`TradingEngine: wallet ${walletId} not found for strategy ${strategyId}`);
        continue;
      }
      const existing = this.activeStrategies.get(strategyId);
      if (existing) {
        existing.runner.updateStrategy(strategy);
        existing.runner.updateWallet(wallet);
        existing.crypto = strategy.crypto;
        existing.walletId = walletId;
        seen.add(strategyId);
        continue;
      }
      const runner = new TimedStrategyRunner({
        strategy,
        wallet
      });
      this.activeStrategies.set(strategyId, {
        strategyId,
        walletId,
        crypto: strategy.crypto,
        runner
      });
      seen.add(strategyId);
    }
    const toRemove = [];
    for (const [strategyId, execution] of Array.from(this.activeStrategies.entries())) {
      if (!seen.has(strategyId)) {
        execution.runner.stop();
        toRemove.push(strategyId);
      }
    }
    toRemove.forEach((strategyId) => this.activeStrategies.delete(strategyId));
  }
  /**
   * Configure les abonnements aux prix pour chaque crypto utilisée
   */
  setupPriceSubscriptions() {
    const cryptos = /* @__PURE__ */ new Set();
    this.activeStrategies.forEach((execution) => {
      cryptos.add(execution.crypto);
    });
    cryptos.forEach((crypto2) => this.ensureSubscription(crypto2));
  }
  /**
   * Gère les mises à jour de prix
   */
  async handlePriceUpdate(crypto2, priceData) {
    const currentCandle = getCandleTimestamp(priceData.timestamp);
    const minute = getCandleMinute(priceData.timestamp);
    if (minute === 0) {
      await redis_default.set(
        CACHE_KEYS.candleOpenPrice(crypto2, currentCandle),
        priceData.price.toString(),
        { ex: 900 }
        // 15 minutes
      );
    }
    const relevantStrategies = Array.from(this.activeStrategies.values()).filter(
      (exec) => exec.crypto === crypto2
    );
    for (const execution of relevantStrategies) {
      await execution.runner.handlePriceUpdate(priceData);
    }
  }
  /**
   * Ajoute une stratégie active
   */
  async addStrategy(strategyId) {
    const strategy = await Strategy_default.findById(strategyId).lean();
    if (!strategy || !strategy.enabled) {
      return;
    }
    const wallet = await Wallet_default.findById(strategy.walletId).lean();
    if (!wallet) {
      console.warn(`TradingEngine: wallet not found for strategy ${strategyId}`);
      return;
    }
    const existing = this.activeStrategies.get(strategyId);
    if (existing) {
      existing.runner.updateStrategy(strategy);
      existing.runner.updateWallet(wallet);
      existing.crypto = strategy.crypto;
      existing.walletId = String(strategy.walletId);
      this.ensureSubscription(strategy.crypto);
      return;
    }
    const runner = new TimedStrategyRunner({
      strategy,
      wallet
    });
    this.activeStrategies.set(strategyId, {
      strategyId,
      walletId: String(strategy.walletId),
      crypto: strategy.crypto,
      runner
    });
    this.ensureSubscription(strategy.crypto);
  }
  /**
   * Retire une stratégie active
   */
  async removeStrategy(strategyId) {
    const execution = this.activeStrategies.get(strategyId);
    if (execution) {
      execution.runner.stop();
      this.activeStrategies.delete(strategyId);
      this.cleanupSubscription(execution.crypto);
    }
  }
  /**
   * Arrête le moteur de trading
   */
  stop() {
    const chainlinkStreams2 = getChainlinkStreams();
    this.priceCallbacks.forEach((callback, crypto2) => {
      chainlinkStreams2.unsubscribe(crypto2, callback);
    });
    this.priceCallbacks.clear();
    this.activeStrategies.forEach((execution) => execution.runner.stop());
    this.activeStrategies.clear();
  }
  ensureSubscription(crypto2) {
    if (this.priceCallbacks.has(crypto2)) {
      return;
    }
    const callback = (data) => {
      void this.handlePriceUpdate(crypto2, data);
    };
    this.priceCallbacks.set(crypto2, callback);
    const chainlinkStreams2 = getChainlinkStreams();
    chainlinkStreams2.subscribe(crypto2, callback);
  }
  cleanupSubscription(crypto2) {
    const stillUsed = Array.from(this.activeStrategies.values()).some(
      (exec) => exec.crypto === crypto2
    );
    if (stillUsed) {
      return;
    }
    const callback = this.priceCallbacks.get(crypto2);
    if (callback) {
      const chainlinkStreams2 = getChainlinkStreams();
      chainlinkStreams2.unsubscribe(crypto2, callback);
      this.priceCallbacks.delete(crypto2);
    }
  }
};
var tradingEngine = new TradingEngine();

// src/lib/render-server.ts
async function main() {
  await tradingEngine.initialize();
  console.log("Trading engine initialized. Listening for price updates...");
  setInterval(() => {
    console.log("Engine heartbeat:", (/* @__PURE__ */ new Date()).toISOString());
  }, 6e4);
}
main().catch((err) => {
  console.error("Fatal error", err);
  process.exit(1);
});
