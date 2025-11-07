/**
 * Script de test pour vérifier la récupération des marchés Polymarket
 * 
 * Usage:
 *   node scripts/test-market-retrieval.js BTC
 *   node scripts/test-market-retrieval.js ETH 1704067200
 */

const https = require('https');

const POLYMARKET_GAMMA_HOST = "gamma-api.polymarket.com";
const GAMMA_EVENT_SLUG_ENDPOINT = `/events/slug`;
const GAMMA_MARKET_SLUG_ENDPOINT = `/markets/slug`;

// Génère le slug du marché
function getMarketSlug(crypto, candleTimestamp) {
  const cryptoLower = crypto.toLowerCase();
  return `${cryptoLower}-updown-15m-${candleTimestamp}`;
}

// Récupère les données depuis l'API Gamma
function fetchFromGamma(endpoint, slug) {
  return new Promise((resolve, reject) => {
    const path = `${endpoint}/${slug}`;
    const options = {
      hostname: POLYMARKET_GAMMA_HOST,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve(null);
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Récupère un marché complet
async function fetchMarketBySlug(slug) {
  try {
    console.log(`\n🔍 Fetching market with slug: ${slug}`);
    
    // Step 1: Get event data
    console.log(`  📡 Calling ${GAMMA_EVENT_SLUG_ENDPOINT}/${slug}...`);
    const eventData = await fetchFromGamma(GAMMA_EVENT_SLUG_ENDPOINT, slug);
    
    if (!eventData) {
      console.log(`  ❌ Event not found (404)`);
      return null;
    }

    console.log(`  ✅ Event found:`, {
      active: eventData.active,
      closed: eventData.closed,
      title: eventData.title?.substring(0, 50) + '...',
    });

    // Step 2: Get market data
    console.log(`  📡 Calling ${GAMMA_MARKET_SLUG_ENDPOINT}/${slug}...`);
    const marketData = await fetchFromGamma(GAMMA_MARKET_SLUG_ENDPOINT, slug);
    
    if (!marketData) {
      console.log(`  ❌ Market not found (404)`);
      return null;
    }

    console.log(`  ✅ Market found:`, {
      id: marketData.id,
      conditionId: marketData.conditionId,
      question: marketData.question?.substring(0, 50) + '...',
    });

    // Step 3: Parse clobTokenIds
    let clobTokenIds = [];
    const clobTokenIdsRaw = marketData.clobTokenIds || [];

    if (typeof clobTokenIdsRaw === 'string') {
      try {
        clobTokenIds = JSON.parse(clobTokenIdsRaw);
      } catch (parseError) {
        console.error(`  ❌ Failed to parse clobTokenIds JSON: ${parseError.message}`);
        return null;
      }
    } else if (Array.isArray(clobTokenIdsRaw)) {
      clobTokenIds = clobTokenIdsRaw;
    }

    if (clobTokenIds.length < 2) {
      console.error(`  ❌ Insufficient clobTokenIds (found ${clobTokenIds.length}, need 2)`);
      return null;
    }

    console.log(`  ✅ Token IDs parsed:`, {
      tokenYes: clobTokenIds[0],
      tokenNo: clobTokenIds[1],
    });

    // Create complete market structure
    return {
      id: marketData.id,
      question: marketData.question || "",
      conditionId: marketData.conditionId,
      slug: slug,
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
      clobTokenIds: clobTokenIds,
    };
  } catch (error) {
    console.error(`  ❌ Error fetching market: ${error.message}`);
    return null;
  }
}

// Fonction principale
async function testMarketRetrieval(crypto, timestamp) {
  console.log(`\n🧪 Testing market retrieval for ${crypto}`);
  console.log(`   Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);

  const slug = getMarketSlug(crypto, timestamp);
  console.log(`   Slug: ${slug}`);

  const startTime = Date.now();
  const market = await fetchMarketBySlug(slug);
  const fetchTime = Date.now() - startTime;

  console.log(`\n📊 Results:`);
  console.log(`   Fetch time: ${fetchTime}ms`);

  if (!market) {
    console.log(`   ❌ Market not found or not available`);
    console.log(`\n💡 Possible reasons:`);
    console.log(`   - Market doesn't exist yet for this timestamp`);
    console.log(`   - Market is closed/inactive`);
    console.log(`   - Market slug format might be incorrect`);
    return;
  }

  console.log(`   ✅ Market found!`);
  console.log(`   ID: ${market.id}`);
  console.log(`   Condition ID: ${market.conditionId}`);
  console.log(`   Question: ${market.question}`);
  console.log(`   Active: ${market.active}`);
  console.log(`   Closed: ${market.closed}`);
  console.log(`   Token YES: ${market.clobTokenIds[0]}`);
  console.log(`   Token NO: ${market.clobTokenIds[1]}`);

  if (!market.active || market.closed) {
    console.log(`\n⚠️  Warning: Market is not active or is closed`);
    console.log(`   This market cannot be used for trading`);
  } else {
    console.log(`\n✅ Market is active and available for trading!`);
  }
}

// Script principal
const crypto = process.argv[2]?.toUpperCase() || 'BTC';
let timestamp;

if (process.argv[3]) {
  timestamp = parseInt(process.argv[3], 10);
  if (isNaN(timestamp)) {
    console.error(`❌ Invalid timestamp: ${process.argv[3]}`);
    process.exit(1);
  }
} else {
  // Utiliser le timestamp de la bougie actuelle
  const now = Math.floor(Date.now() / 1000);
  timestamp = Math.floor(now / 900) * 900; // Bougie 15m (900 secondes)
}

if (!['BTC', 'ETH', 'XRP', 'SOL'].includes(crypto)) {
  console.error(`❌ Invalid crypto: ${crypto}. Must be BTC, ETH, XRP, or SOL`);
  process.exit(1);
}

testMarketRetrieval(crypto, timestamp)
  .then(() => {
    console.log(`\n✨ Test completed`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  });

