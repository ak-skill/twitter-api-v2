---
name: twitter-api-v2
description: |
  Twitter/X API v2 integration for posting tweets, searching content, monitoring mentions,
  and automating social media workflows. Activates when user mentions Twitter, X, tweeting,
  posting to Twitter, searching tweets, tracking hashtags, Twitter bot, Twitter automation,
  Twitter OAuth, or analyzing Twitter data.
license: Apache-2.0
compatibility: |
  Requires Node.js 14+ with twitter-api-v2 package.
  Needs network access to api.twitter.com.
  Twitter Developer account with API credentials required.
metadata:
  author: Claude Agent
  version: "1.0.0"
allowed-tools: Bash Read Write Edit
---

# Twitter API v2 Integration

## Overview

This skill enables comprehensive Twitter/X automation through the official API v2. It supports posting tweets and threads, searching content, monitoring mentions and hashtags, and managing user interactions like following, liking, and retweeting. The twitter-api-v2 npm package provides strongly-typed access to all endpoints.

## Setup

### 1. Install Dependencies

Navigate to the scripts directory and install required packages:

```bash
cd scripts
npm install
```

This installs the twitter-api-v2 package and dotenv for credential management.

### 2. Configure Credentials

Copy the environment template and add your credentials:

```bash
cp scripts/.env.example scripts/.env
```

Edit `scripts/.env` with your Twitter Developer credentials:
- **For read-only operations**: Only `TWITTER_BEARER_TOKEN` is required
- **For posting/writing**: All OAuth 1.0a credentials are required

See [references/AUTHENTICATION.md](references/AUTHENTICATION.md) for detailed setup instructions.

### 3. Verify Setup

Test your configuration:

```bash
node scripts/example_usage.js verify
```

## Instructions

### Posting a Tweet

1. Ensure OAuth 1.0a credentials are configured (posting requires user context)
2. Use the `postTweet` function with your tweet text
3. Handle the response which includes the tweet ID

```javascript
const { postTweet } = require('./scripts/twitter_client');

const result = await postTweet('Hello from the API!');
console.log(`Tweet posted: ${result.data.id}`);
```

### Posting a Thread

1. Prepare an array of tweet texts (max 280 characters each)
2. Use the `postThread` function
3. Each tweet automatically replies to the previous one

```javascript
const { postThread } = require('./scripts/twitter_client');

const thread = [
  'This is the first tweet in my thread.',
  'This is the second tweet, automatically linked.',
  'And this is the conclusion!'
];
const results = await postThread(thread);
```

### Fetching and Summarizing a Tweet

1. Use the CLI tool `fetch_tweet.js` to fetch any tweet by ID or URL
2. Only requires Bearer token (read-only access)
3. Displays tweet content, author info, and engagement metrics

```bash
node scripts/fetch_tweet.js "https://x.com/username/status/123456789"
# Or use just the tweet ID
node scripts/fetch_tweet.js "123456789"
```

The tool will display:
- Author name and username
- Tweet content
- Engagement metrics (likes, retweets, replies, impressions)
- Post date and URL

### Searching Tweets

1. Bearer token is sufficient for search (read-only)
2. Use `searchTweets` with a query string
3. Query supports operators: `from:`, `to:`, `#hashtag`, `-exclude`

```javascript
const { searchTweets } = require('./scripts/twitter_client');

const tweets = await searchTweets('#nodejs -is:retweet', { maxResults: 10 });
tweets.data.forEach(tweet => console.log(tweet.text));
```

### Monitoring Mentions

1. Requires authenticated user ID
2. Use `getUserMentions` with the user ID
3. Poll periodically (respect rate limits)

```javascript
const { getUserMentions, getAuthenticatedUserId } = require('./scripts/twitter_client');

const userId = await getAuthenticatedUserId();
const mentions = await getUserMentions(userId);
```

### User Interactions

Follow, like, and retweet operations require OAuth 1.0a:

```javascript
const { followUser, likeTweet, retweet } = require('./scripts/twitter_client');

await followUser('target_user_id');
await likeTweet('tweet_id_to_like');
await retweet('tweet_id_to_retweet');
```

## Usage Examples

### Example 1: Fetch and Summarize a Tweet

**Input**: "Fetch and summarize https://x.com/user/status/123456789"

**Output**:
```bash
node scripts/fetch_tweet.js "https://x.com/user/status/123456789"
```

The script will display a formatted summary including:
- Author information (name, username)
- Tweet content
- Engagement metrics (likes, retweets, replies, impressions)
- Posted date and URL
- Brief text summary

### Example 2: Post a Simple Tweet

**Input**: "Post a tweet saying 'Just shipped a new feature!'"

**Output**:
```javascript
const { postTweet } = require('./scripts/twitter_client');

async function main() {
  try {
    const result = await postTweet('Just shipped a new feature!');
    console.log('Tweet posted successfully!');
    console.log(`Tweet ID: ${result.data.id}`);
    console.log(`URL: https://twitter.com/user/status/${result.data.id}`);
  } catch (error) {
    console.error('Failed to post tweet:', error.message);
  }
}

main();
```

### Example 3: Search Recent Tweets

**Input**: "Find recent tweets about #JavaScript that are not retweets"

**Output**:
```javascript
const { searchTweets } = require('./scripts/twitter_client');

async function main() {
  try {
    const result = await searchTweets('#JavaScript -is:retweet lang:en', {
      maxResults: 20,
      tweetFields: ['created_at', 'public_metrics', 'author_id']
    });

    console.log(`Found ${result.data.length} tweets:\n`);
    result.data.forEach((tweet, i) => {
      console.log(`${i + 1}. ${tweet.text.substring(0, 100)}...`);
      console.log(`   Likes: ${tweet.public_metrics.like_count}`);
      console.log(`   Retweets: ${tweet.public_metrics.retweet_count}\n`);
    });
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

main();
```

### Example 4: Monitor Mentions

**Input**: "Check for new mentions of my account"

**Output**:
```javascript
const { getUserMentions, getAuthenticatedUserId } = require('./scripts/twitter_client');

async function checkMentions() {
  try {
    const userId = await getAuthenticatedUserId();
    const mentions = await getUserMentions(userId, {
      maxResults: 10,
      tweetFields: ['created_at', 'author_id', 'conversation_id']
    });

    if (!mentions.data || mentions.data.length === 0) {
      console.log('No recent mentions found.');
      return;
    }

    console.log(`Found ${mentions.data.length} recent mentions:\n`);
    mentions.data.forEach(mention => {
      console.log(`- ${mention.text}`);
      console.log(`  Posted: ${mention.created_at}\n`);
    });
  } catch (error) {
    console.error('Failed to fetch mentions:', error.message);
  }
}

checkMentions();
```

### Example 5: Follow a User

**Input**: "Follow the user with username 'nodejs'"

**Output**:
```javascript
const { followUserByUsername, getAuthenticatedUserId } = require('./scripts/twitter_client');

async function main() {
  try {
    const result = await followUserByUsername('nodejs');

    if (result.data.following) {
      console.log('Successfully followed @nodejs!');
    } else if (result.data.pending_follow) {
      console.log('Follow request sent (account is protected)');
    }
  } catch (error) {
    if (error.code === 403) {
      console.error('Cannot follow: User may have blocked you or you already follow them');
    } else {
      console.error('Follow failed:', error.message);
    }
  }
}

main();
```

## Authentication

Twitter API v2 supports multiple authentication methods:

### OAuth 2.0 Bearer Token (Recommended for Reading)

- **Best for**: Search, lookup, read-only operations
- **Setup**: Single token from Developer Portal
- **Limitation**: Cannot post, like, follow, or perform user actions

```javascript
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
```

### OAuth 1.0a User Context (Required for Writing)

- **Best for**: Posting tweets, following, liking, retweeting
- **Setup**: Requires API Key, API Secret, Access Token, Access Secret
- **Capability**: Full user context for all operations

```javascript
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
```

See [references/AUTHENTICATION.md](references/AUTHENTICATION.md) for complete setup guide.

## Rate Limiting

Twitter API uses 15-minute rolling windows for rate limits. Key limits for Free tier:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /2/tweets | 17 requests | 24 hours |
| GET /2/tweets/search/recent | 180 requests | 15 minutes |
| GET /2/users/:id/mentions | 180 requests | 15 minutes |
| GET /2/users/by/username | 300 requests | 15 minutes |

### Handling Rate Limits

The twitter_client.js includes automatic retry with exponential backoff:

```javascript
const { searchTweets } = require('./scripts/twitter_client');

// Automatic retry on rate limit (up to 3 attempts)
const result = await searchTweets('query', { autoRetry: true });
```

Monitor rate limit headers in responses:
- `x-rate-limit-limit`: Maximum requests allowed
- `x-rate-limit-remaining`: Requests remaining
- `x-rate-limit-reset`: Unix timestamp when limit resets

See [references/RATE_LIMITS.md](references/RATE_LIMITS.md) for detailed rate limit management.

## Guidelines

- **Respect Rate Limits**: Free tier has very restrictive limits (1,500 tweets/month). Implement proper backoff and caching.
- **Secure Credentials**: Never commit `.env` files. Use environment variables in production.
- **Handle Errors Gracefully**: Twitter API returns specific error codes. Always catch and handle appropriately.
- **Use Appropriate Auth**: Use Bearer Token for reading, OAuth 1.0a for writing.
- **Validate Tweet Length**: Maximum 280 characters. Check before posting to avoid errors.
- **Include Tweet Fields**: Request specific fields (metrics, created_at) to reduce payload and get needed data.
- **Cache User IDs**: User lookups count against rate limits. Cache IDs when possible.
- **Test in Sandbox**: Use Twitter's sandbox environment for development when available.

## Edge Cases

- **Token Expiration**: OAuth 2.0 access tokens expire. Implement token refresh logic or use OAuth 1.0a which doesn't expire.
- **Network Errors**: Implement retry logic for transient failures. Use exponential backoff.
- **Duplicate Tweets**: Twitter rejects duplicate content within short periods. Add timestamps or unique identifiers.
- **Protected Accounts**: Tweets from protected accounts won't appear in search. Follow requests may be pending.
- **Deleted Tweets**: Tweets may be deleted between lookup and display. Handle 404 gracefully.
- **Unicode and Emoji**: Tweet length counts Unicode characters. Emoji count as 2+ characters.
- **Media Uploads**: Media must be uploaded separately before attaching to tweets. Use v1.1 upload endpoint.
- **Thread Failures**: If a thread partially fails, you'll have orphaned tweets. Track progress for recovery.

## References

For detailed technical documentation:
- [references/AUTHENTICATION.md](references/AUTHENTICATION.md) - Complete authentication setup guide
- [references/ENDPOINTS.md](references/ENDPOINTS.md) - API endpoint documentation with examples
- [references/RATE_LIMITS.md](references/RATE_LIMITS.md) - Rate limit details and management strategies
- [scripts/](scripts/) - Executable helper scripts and examples

## Limitations

- **Free Tier Restrictions**: Only 1,500 tweets/month and limited read requests
- **No Streaming on Free**: Filtered stream requires Basic tier ($100/month)
- **Media Requires v1.1**: Image/video upload still uses v1.1 endpoint
- **DMs Restricted**: Direct message API requires elevated access
- **Historical Search Limited**: Free tier only searches last 7 days
