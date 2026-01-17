# Twitter API v2 Rate Limits Guide

Understanding and managing rate limits is critical for successful Twitter API integration. This guide covers rate limit mechanics, tier-specific limits, and strategies for avoiding throttling.

## How Rate Limits Work

### 15-Minute Rolling Windows

Twitter API uses a 15-minute rolling window system:

- Each endpoint has a maximum number of requests per 15-minute window
- Windows are calculated from your first request
- Once limit is reached, requests return 429 errors until window resets
- Different endpoints have independent limits

### Rate Limit Headers

Every API response includes rate limit information in headers:

```
x-rate-limit-limit: 180
x-rate-limit-remaining: 175
x-rate-limit-reset: 1704067200
```

| Header | Description |
|--------|-------------|
| `x-rate-limit-limit` | Maximum requests allowed in window |
| `x-rate-limit-remaining` | Requests remaining in current window |
| `x-rate-limit-reset` | Unix timestamp when window resets |

### Parsing Rate Limit Headers

```javascript
function parseRateLimitHeaders(response) {
  return {
    limit: parseInt(response.headers['x-rate-limit-limit']),
    remaining: parseInt(response.headers['x-rate-limit-remaining']),
    reset: new Date(parseInt(response.headers['x-rate-limit-reset']) * 1000)
  };
}

// Calculate wait time
function getWaitTime(resetTimestamp) {
  const resetTime = resetTimestamp * 1000; // Convert to ms
  const waitTime = resetTime - Date.now() + 1000; // Add 1s buffer
  return Math.max(waitTime, 0);
}
```

---

## Rate Limits by Tier

### Free Tier

The free tier has severe restrictions suitable only for testing and personal projects.

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /2/tweets | 17 tweets | 24 hours |
| GET /2/tweets/search/recent | 180 requests | 15 minutes |
| GET /2/users/:id/mentions | 180 requests | 15 minutes |
| GET /2/users/by/username | 300 requests | 15 minutes |
| POST /2/users/:id/likes | 5 requests | 15 minutes |
| POST /2/users/:id/following | 5 requests | 15 minutes |

**Monthly limits**:
- 1,500 tweets per month (posting)
- 10,000 tweets per month (reading)

### Basic Tier ($100/month)

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /2/tweets | 100 tweets | 24 hours |
| GET /2/tweets/search/recent | 60 requests | 15 minutes |
| GET /2/users/:id/mentions | 180 requests | 15 minutes |
| All read endpoints | Generally 100-300 | 15 minutes |

**Monthly limits**:
- 3,000 tweets per month (posting)
- 10,000 tweets per month (reading)

### Pro Tier ($5,000/month)

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /2/tweets | 300 tweets | 24 hours |
| GET /2/tweets/search/recent | 300 requests | 15 minutes |
| Full archive search | Included | - |
| Filtered stream | Included | - |

**Monthly limits**:
- 300,000 tweets per month (posting)
- 1,000,000 tweets per month (reading)

---

## Exponential Backoff Strategy

When rate limited, use exponential backoff to retry:

```javascript
/**
 * Executes a function with exponential backoff on rate limit errors
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration options
 * @returns {Promise<*>} Result of the function
 */
async function withExponentialBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 60000,
    factor = 2
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if rate limited (429)
      const isRateLimited =
        error.code === 429 ||
        error.rateLimitError ||
        (error.data && error.data.status === 429);

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay
      let delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

      // Use reset time from error if available
      if (error.rateLimit && error.rateLimit.reset) {
        const resetDelay = (error.rateLimit.reset * 1000) - Date.now() + 1000;
        if (resetDelay > 0 && resetDelay < 900000) { // Max 15 minutes
          delay = resetDelay;
        }
      }

      console.warn(
        `Rate limited. Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay / 1000)}s`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const result = await withExponentialBackoff(
  () => client.v2.search('#nodejs'),
  { maxRetries: 3, baseDelay: 2000 }
);
```

---

## Request Queue Management

For high-volume applications, implement a request queue:

```javascript
/**
 * Rate-limited request queue
 */
class RateLimitedQueue {
  constructor(requestsPerWindow = 180, windowMs = 15 * 60 * 1000) {
    this.requestsPerWindow = requestsPerWindow;
    this.windowMs = windowMs;
    this.requests = [];
    this.queue = [];
    this.processing = false;
  }

  /**
   * Add a request to the queue
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} Result of the function
   */
  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests respecting rate limits
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Clean old requests outside window
      const now = Date.now();
      this.requests = this.requests.filter(
        time => now - time < this.windowMs
      );

      // Check if we can make a request
      if (this.requests.length >= this.requestsPerWindow) {
        // Wait until oldest request expires from window
        const oldestRequest = Math.min(...this.requests);
        const waitTime = this.windowMs - (now - oldestRequest) + 100;
        console.log(`Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Execute next request
      const { fn, resolve, reject } = this.queue.shift();
      this.requests.push(Date.now());

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(
      time => now - time < this.windowMs
    ).length;

    return {
      queueLength: this.queue.length,
      requestsInWindow: activeRequests,
      remainingRequests: this.requestsPerWindow - activeRequests
    };
  }
}

// Usage
const queue = new RateLimitedQueue(180, 15 * 60 * 1000);

// Add requests - they'll be executed respecting rate limits
const results = await Promise.all([
  queue.add(() => client.v2.search('#nodejs')),
  queue.add(() => client.v2.search('#javascript')),
  queue.add(() => client.v2.search('#typescript')),
]);
```

---

## Best Practices

### 1. Cache Responses

Reduce API calls by caching responses:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserWithCache(username) {
  const cacheKey = `user:${username}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const result = await getUserByUsername(username);
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
```

### 2. Batch Requests When Possible

Use batch endpoints to reduce request count:

```javascript
// Bad: 10 separate requests
for (const id of tweetIds) {
  await getTweet(id);
}

// Good: 1 batch request
const tweets = await getTweets(tweetIds.slice(0, 100));
```

### 3. Use Pagination Efficiently

Don't fetch more data than needed:

```javascript
// Specify exact count needed
const result = await searchTweets(query, {
  maxResults: 10,  // Don't request 100 if you only need 10
  tweetFields: ['text', 'public_metrics']  // Only request needed fields
});
```

### 4. Monitor Rate Limits Proactively

Track your rate limit usage:

```javascript
class RateLimitMonitor {
  constructor() {
    this.limits = new Map();
  }

  update(endpoint, headers) {
    this.limits.set(endpoint, {
      limit: parseInt(headers['x-rate-limit-limit']),
      remaining: parseInt(headers['x-rate-limit-remaining']),
      reset: new Date(parseInt(headers['x-rate-limit-reset']) * 1000),
      updated: new Date()
    });
  }

  getStatus(endpoint) {
    return this.limits.get(endpoint);
  }

  isNearLimit(endpoint, threshold = 10) {
    const status = this.limits.get(endpoint);
    if (!status) return false;
    return status.remaining <= threshold;
  }

  getAllStatus() {
    const result = {};
    this.limits.forEach((value, key) => {
      result[key] = {
        ...value,
        percentUsed: ((value.limit - value.remaining) / value.limit * 100).toFixed(1)
      };
    });
    return result;
  }
}
```

### 5. Implement Circuit Breaker

Prevent cascading failures during rate limiting:

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const breaker = new CircuitBreaker({ failureThreshold: 3 });

try {
  const result = await breaker.execute(() => searchTweets(query));
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    console.log('Too many failures, backing off...');
  }
}
```

---

## Handling Rate Limit Errors

### Error Response Format

```json
{
  "title": "Too Many Requests",
  "type": "about:blank",
  "status": 429,
  "detail": "Too Many Requests"
}
```

### Detection and Handling

```javascript
async function handleRateLimitError(error) {
  // Check if it's a rate limit error
  if (error.code === 429 || (error.data && error.data.status === 429)) {
    const resetTime = error.rateLimit?.reset;

    if (resetTime) {
      const waitMs = (resetTime * 1000) - Date.now() + 1000;
      console.log(`Rate limited. Reset at ${new Date(resetTime * 1000)}`);
      console.log(`Waiting ${Math.round(waitMs / 1000)} seconds...`);

      await new Promise(resolve => setTimeout(resolve, waitMs));
      return true; // Indicate retry is possible
    }
  }

  return false; // Not a rate limit error
}
```

---

## Rate Limit Strategies by Use Case

### High-Volume Search Bot

```javascript
// Use queue with conservative limits
const searchQueue = new RateLimitedQueue(100, 15 * 60 * 1000); // 100 per 15 min

// Batch and cache results
const searchCache = new Map();

async function batchSearch(queries) {
  const results = {};

  for (const query of queries) {
    const cached = searchCache.get(query);
    if (cached && Date.now() - cached.time < 60000) {
      results[query] = cached.data;
      continue;
    }

    const data = await searchQueue.add(() => searchTweets(query));
    searchCache.set(query, { data, time: Date.now() });
    results[query] = data;
  }

  return results;
}
```

### Mention Monitoring Bot

```javascript
// Poll at sustainable rate
async function monitorMentions(userId, interval = 60000) {
  let lastSeenId = null;

  setInterval(async () => {
    try {
      const mentions = await getUserMentions(userId, {
        sinceId: lastSeenId,
        maxResults: 10
      });

      if (mentions.data && mentions.data.length > 0) {
        lastSeenId = mentions.data[0].id;
        // Process new mentions
        mentions.data.forEach(processMention);
      }
    } catch (error) {
      if (error.code === 429) {
        console.log('Rate limited, will retry next interval');
      } else {
        console.error('Error fetching mentions:', error.message);
      }
    }
  }, interval);
}
```

### Posting Bot (Free Tier)

```javascript
// Respect 17 tweets per 24 hours limit
class TweetScheduler {
  constructor() {
    this.tweetsToday = 0;
    this.dayStart = Date.now();
    this.maxTweetsPerDay = 17;
  }

  async scheduleTweet(text) {
    // Reset counter daily
    if (Date.now() - this.dayStart > 24 * 60 * 60 * 1000) {
      this.tweetsToday = 0;
      this.dayStart = Date.now();
    }

    if (this.tweetsToday >= this.maxTweetsPerDay) {
      const nextReset = this.dayStart + 24 * 60 * 60 * 1000;
      throw new Error(
        `Daily tweet limit reached. Resets at ${new Date(nextReset)}`
      );
    }

    const result = await postTweet(text);
    this.tweetsToday++;
    console.log(`Tweets today: ${this.tweetsToday}/${this.maxTweetsPerDay}`);
    return result;
  }
}
```

---

## Monitoring and Alerting

### Log Rate Limit Usage

```javascript
function logRateLimitStatus(endpoint, headers) {
  const remaining = headers['x-rate-limit-remaining'];
  const limit = headers['x-rate-limit-limit'];
  const percent = ((limit - remaining) / limit * 100).toFixed(1);

  console.log(
    `[${endpoint}] Rate limit: ${remaining}/${limit} remaining (${percent}% used)`
  );

  if (remaining < 10) {
    console.warn(`[WARNING] Low rate limit for ${endpoint}: ${remaining} remaining`);
  }
}
```

### Alert on Approaching Limits

```javascript
function checkAndAlert(endpoint, remaining, threshold = 20) {
  if (remaining <= threshold) {
    // Send alert (email, Slack, etc.)
    console.error(`[ALERT] ${endpoint} approaching rate limit: ${remaining} remaining`);
    // alertService.send(`Twitter API rate limit warning: ${endpoint}`);
  }
}
```

---

## Additional Resources

- [Twitter API Rate Limits Documentation](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [Authentication Guide](./AUTHENTICATION.md)
- [API Endpoints Reference](./ENDPOINTS.md)
