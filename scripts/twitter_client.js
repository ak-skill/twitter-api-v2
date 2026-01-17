/**
 * Twitter API v2 Client Helper
 *
 * A comprehensive Node.js client for Twitter API v2 using the twitter-api-v2 package.
 * Provides functions for posting, searching, monitoring, and user interactions.
 *
 * @requires twitter-api-v2
 * @requires dotenv
 *
 * Usage:
 *   const { postTweet, searchTweets, getUserMentions } = require('./twitter_client');
 *
 * Environment Variables Required:
 *   - TWITTER_BEARER_TOKEN: For read-only operations
 *   - TWITTER_API_KEY, TWITTER_API_SECRET: For OAuth 1.0a
 *   - TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET: For OAuth 1.0a user context
 */

const { TwitterApi } = require('twitter-api-v2');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryBaseDelay: 1000, // milliseconds
  maxTweetLength: 280,
};

/**
 * Creates a read-only client using Bearer Token (OAuth 2.0 App-Only)
 * Use for: search, user lookup, tweet lookup
 * @returns {TwitterApi} Read-only Twitter client
 * @throws {Error} If TWITTER_BEARER_TOKEN is not set
 */
function createReadOnlyClient() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error(
      'TWITTER_BEARER_TOKEN not found. Set it in your .env file for read-only operations.'
    );
  }
  return new TwitterApi(bearerToken).readOnly;
}

/**
 * Creates a read-write client using OAuth 1.0a (User Context)
 * Use for: posting tweets, following, liking, retweeting
 * @returns {TwitterApi} Read-write Twitter client
 * @throws {Error} If OAuth 1.0a credentials are not set
 */
function createReadWriteClient() {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } =
    process.env;

  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error(
      'OAuth 1.0a credentials not found. Set TWITTER_API_KEY, TWITTER_API_SECRET, ' +
        'TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET in your .env file.'
    );
  }

  return new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });
}

/**
 * Sleeps for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff retry on rate limit errors
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.baseDelay - Base delay in ms for exponential backoff
 * @returns {Promise<*>} Result of the function
 * @throws {Error} After max retries exceeded
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || CONFIG.maxRetries;
  const baseDelay = options.baseDelay || CONFIG.retryBaseDelay;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimited = error.code === 429 || error.rateLimitError;

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = baseDelay * Math.pow(2, attempt);

      // If we have reset time from headers, use that instead
      if (error.rateLimit && error.rateLimit.reset) {
        const resetTime = error.rateLimit.reset * 1000; // Convert to ms
        const waitTime = resetTime - Date.now() + 1000; // Add 1s buffer
        if (waitTime > 0 && waitTime < 900000) {
          // Max 15 minutes
          delay = waitTime;
        }
      }

      console.warn(`Rate limited. Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Validates tweet text length
 * @param {string} text - Tweet text to validate
 * @throws {Error} If text exceeds maximum length
 */
function validateTweetLength(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Tweet text is required and must be a string');
  }
  if (text.length > CONFIG.maxTweetLength) {
    throw new Error(`Tweet exceeds maximum length of ${CONFIG.maxTweetLength} characters (got ${text.length})`);
  }
  if (text.trim().length === 0) {
    throw new Error('Tweet text cannot be empty');
  }
}

// ============================================================================
// POSTING FUNCTIONS (Require OAuth 1.0a)
// ============================================================================

/**
 * Posts a single tweet
 * @param {string} text - Tweet content (max 280 characters)
 * @param {Object} options - Additional options
 * @param {string} options.replyToTweetId - Tweet ID to reply to
 * @param {string[]} options.mediaIds - Array of media IDs to attach
 * @param {string} options.quoteTweetId - Tweet ID to quote
 * @returns {Promise<Object>} Created tweet data
 *
 * @example
 * const result = await postTweet('Hello, Twitter!');
 * console.log(`Tweet ID: ${result.data.id}`);
 *
 * @example
 * // Reply to another tweet
 * const reply = await postTweet('Great point!', { replyToTweetId: '123456789' });
 */
async function postTweet(text, options = {}) {
  validateTweetLength(text);

  const client = createReadWriteClient();

  const tweetParams = { text };

  if (options.replyToTweetId) {
    tweetParams.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  if (options.mediaIds && options.mediaIds.length > 0) {
    tweetParams.media = { media_ids: options.mediaIds };
  }

  if (options.quoteTweetId) {
    tweetParams.quote_tweet_id = options.quoteTweetId;
  }

  return withRetry(() => client.v2.tweet(tweetParams));
}

/**
 * Posts a thread (multiple connected tweets)
 * @param {string[]} tweets - Array of tweet texts
 * @returns {Promise<Object[]>} Array of created tweet data
 *
 * @example
 * const thread = await postThread([
 *   'This is part 1 of my thread.',
 *   'This is part 2, automatically linked.',
 *   'And this is the conclusion!'
 * ]);
 */
async function postThread(tweets) {
  if (!Array.isArray(tweets) || tweets.length === 0) {
    throw new Error('Thread must be a non-empty array of tweet texts');
  }

  // Validate all tweets before posting
  tweets.forEach((text, index) => {
    try {
      validateTweetLength(text);
    } catch (error) {
      throw new Error(`Tweet ${index + 1}: ${error.message}`);
    }
  });

  const client = createReadWriteClient();
  const results = [];
  let previousTweetId = null;

  for (let i = 0; i < tweets.length; i++) {
    const tweetParams = { text: tweets[i] };

    if (previousTweetId) {
      tweetParams.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const result = await withRetry(() => client.v2.tweet(tweetParams));
    results.push(result);
    previousTweetId = result.data.id;
  }

  return results;
}

/**
 * Deletes a tweet
 * @param {string} tweetId - ID of the tweet to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
async function deleteTweet(tweetId) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadWriteClient();
  return withRetry(() => client.v2.deleteTweet(tweetId));
}

// ============================================================================
// SEARCH AND LOOKUP FUNCTIONS (Bearer Token sufficient)
// ============================================================================

/**
 * Searches recent tweets (last 7 days)
 * @param {string} query - Search query (supports operators like from:, #hashtag, -is:retweet)
 * @param {Object} options - Search options
 * @param {number} options.maxResults - Maximum results (10-100, default 10)
 * @param {string[]} options.tweetFields - Fields to include (created_at, public_metrics, etc.)
 * @param {string[]} options.userFields - User fields to include
 * @param {string[]} options.expansions - Expansions to include
 * @returns {Promise<Object>} Search results with tweets
 *
 * @example
 * const results = await searchTweets('#JavaScript -is:retweet', {
 *   maxResults: 20,
 *   tweetFields: ['created_at', 'public_metrics']
 * });
 */
async function searchTweets(query, options = {}) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required');
  }

  const client = createReadOnlyClient();

  const searchParams = {
    max_results: options.maxResults || 10,
    'tweet.fields': options.tweetFields || ['created_at', 'public_metrics', 'author_id'],
  };

  if (options.userFields) {
    searchParams['user.fields'] = options.userFields;
  }

  if (options.expansions) {
    searchParams.expansions = options.expansions;
  }

  if (options.sinceId) {
    searchParams.since_id = options.sinceId;
  }

  if (options.untilId) {
    searchParams.until_id = options.untilId;
  }

  return withRetry(() => client.v2.search(query, searchParams));
}

/**
 * Gets a single tweet by ID
 * @param {string} tweetId - Tweet ID
 * @param {Object} options - Options
 * @param {string[]} options.tweetFields - Fields to include
 * @param {string[]} options.expansions - Expansions to include
 * @returns {Promise<Object>} Tweet data
 */
async function getTweet(tweetId, options = {}) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadOnlyClient();

  const params = {
    'tweet.fields': options.tweetFields || ['created_at', 'public_metrics', 'author_id'],
  };

  if (options.expansions) {
    params.expansions = options.expansions;
  }

  return withRetry(() => client.v2.singleTweet(tweetId, params));
}

/**
 * Gets multiple tweets by IDs
 * @param {string[]} tweetIds - Array of tweet IDs (max 100)
 * @param {Object} options - Options
 * @returns {Promise<Object>} Tweets data
 */
async function getTweets(tweetIds, options = {}) {
  if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
    throw new Error('Tweet IDs array is required');
  }

  if (tweetIds.length > 100) {
    throw new Error('Maximum 100 tweet IDs per request');
  }

  const client = createReadOnlyClient();

  const params = {
    'tweet.fields': options.tweetFields || ['created_at', 'public_metrics', 'author_id'],
  };

  return withRetry(() => client.v2.tweets(tweetIds, params));
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

/**
 * Gets the authenticated user's ID (for OAuth 1.0a client)
 * @returns {Promise<string>} User ID
 */
async function getAuthenticatedUserId() {
  const client = createReadWriteClient();
  const me = await withRetry(() => client.v2.me());
  return me.data.id;
}

/**
 * Gets user information by username
 * @param {string} username - Twitter username (without @)
 * @param {Object} options - Options
 * @param {string[]} options.userFields - Fields to include
 * @returns {Promise<Object>} User data
 */
async function getUserByUsername(username, options = {}) {
  if (!username) {
    throw new Error('Username is required');
  }

  const client = createReadOnlyClient();

  const params = {
    'user.fields':
      options.userFields || ['created_at', 'description', 'public_metrics', 'profile_image_url'],
  };

  return withRetry(() => client.v2.userByUsername(username, params));
}

/**
 * Gets user information by ID
 * @param {string} userId - Twitter user ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} User data
 */
async function getUserById(userId, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const client = createReadOnlyClient();

  const params = {
    'user.fields':
      options.userFields || ['created_at', 'description', 'public_metrics', 'profile_image_url'],
  };

  return withRetry(() => client.v2.user(userId, params));
}

/**
 * Gets mentions for a user
 * @param {string} userId - User ID to get mentions for
 * @param {Object} options - Options
 * @param {number} options.maxResults - Maximum results (5-100)
 * @param {string[]} options.tweetFields - Fields to include
 * @returns {Promise<Object>} Mentions data
 */
async function getUserMentions(userId, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const client = createReadOnlyClient();

  const params = {
    max_results: options.maxResults || 10,
    'tweet.fields': options.tweetFields || ['created_at', 'author_id', 'conversation_id'],
  };

  if (options.sinceId) {
    params.since_id = options.sinceId;
  }

  return withRetry(() => client.v2.userMentionTimeline(userId, params));
}

/**
 * Gets a user's timeline (their tweets)
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Timeline tweets
 */
async function getUserTimeline(userId, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const client = createReadOnlyClient();

  const params = {
    max_results: options.maxResults || 10,
    'tweet.fields': options.tweetFields || ['created_at', 'public_metrics'],
    exclude: options.excludeReplies ? ['replies'] : undefined,
  };

  return withRetry(() => client.v2.userTimeline(userId, params));
}

// ============================================================================
// INTERACTION FUNCTIONS (Require OAuth 1.0a)
// ============================================================================

/**
 * Follows a user by their ID
 * @param {string} targetUserId - ID of user to follow
 * @returns {Promise<Object>} Follow result
 */
async function followUser(targetUserId) {
  if (!targetUserId) {
    throw new Error('Target user ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.follow(myUserId, targetUserId));
}

/**
 * Follows a user by their username
 * @param {string} username - Username to follow (without @)
 * @returns {Promise<Object>} Follow result
 */
async function followUserByUsername(username) {
  const user = await getUserByUsername(username);
  if (!user.data) {
    throw new Error(`User @${username} not found`);
  }
  return followUser(user.data.id);
}

/**
 * Unfollows a user
 * @param {string} targetUserId - ID of user to unfollow
 * @returns {Promise<Object>} Unfollow result
 */
async function unfollowUser(targetUserId) {
  if (!targetUserId) {
    throw new Error('Target user ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.unfollow(myUserId, targetUserId));
}

/**
 * Likes a tweet
 * @param {string} tweetId - ID of tweet to like
 * @returns {Promise<Object>} Like result
 */
async function likeTweet(tweetId) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.like(myUserId, tweetId));
}

/**
 * Unlikes a tweet
 * @param {string} tweetId - ID of tweet to unlike
 * @returns {Promise<Object>} Unlike result
 */
async function unlikeTweet(tweetId) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.unlike(myUserId, tweetId));
}

/**
 * Retweets a tweet
 * @param {string} tweetId - ID of tweet to retweet
 * @returns {Promise<Object>} Retweet result
 */
async function retweet(tweetId) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.retweet(myUserId, tweetId));
}

/**
 * Removes a retweet
 * @param {string} tweetId - ID of tweet to unretweet
 * @returns {Promise<Object>} Unretweet result
 */
async function unretweet(tweetId) {
  if (!tweetId) {
    throw new Error('Tweet ID is required');
  }

  const client = createReadWriteClient();
  const myUserId = await getAuthenticatedUserId();

  return withRetry(() => client.v2.unretweet(myUserId, tweetId));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if credentials are configured
 * @returns {Object} Status of each credential type
 */
function checkCredentials() {
  return {
    bearerToken: !!process.env.TWITTER_BEARER_TOKEN,
    oauth1: !!(
      process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_SECRET
    ),
  };
}

/**
 * Verifies API connection and credentials
 * @returns {Promise<Object>} Verification result
 */
async function verifyCredentials() {
  const status = checkCredentials();
  const result = {
    bearerToken: { configured: status.bearerToken, valid: false },
    oauth1: { configured: status.oauth1, valid: false, user: null },
  };

  // Test Bearer Token
  if (status.bearerToken) {
    try {
      const client = createReadOnlyClient();
      await client.v2.search('test', { max_results: 10 });
      result.bearerToken.valid = true;
    } catch (error) {
      result.bearerToken.error = error.message;
    }
  }

  // Test OAuth 1.0a
  if (status.oauth1) {
    try {
      const client = createReadWriteClient();
      const me = await client.v2.me();
      result.oauth1.valid = true;
      result.oauth1.user = me.data;
    } catch (error) {
      result.oauth1.error = error.message;
    }
  }

  return result;
}

// Export all functions
module.exports = {
  // Client creation
  createReadOnlyClient,
  createReadWriteClient,

  // Posting
  postTweet,
  postThread,
  deleteTweet,

  // Search and lookup
  searchTweets,
  getTweet,
  getTweets,

  // User functions
  getAuthenticatedUserId,
  getUserByUsername,
  getUserById,
  getUserMentions,
  getUserTimeline,

  // Interactions
  followUser,
  followUserByUsername,
  unfollowUser,
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,

  // Utilities
  checkCredentials,
  verifyCredentials,

  // Configuration
  CONFIG,
};
