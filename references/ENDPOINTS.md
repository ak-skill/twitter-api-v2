# Twitter API v2 Endpoints Reference

This document provides detailed information about key Twitter API v2 endpoints with request/response examples.

## Table of Contents

- [Tweets](#tweets)
  - [POST /2/tweets - Create Tweet](#post-2tweets---create-tweet)
  - [DELETE /2/tweets/:id - Delete Tweet](#delete-2tweetsid---delete-tweet)
  - [GET /2/tweets/search/recent - Search Tweets](#get-2tweetssearchrecent---search-tweets)
  - [GET /2/tweets/:id - Get Tweet](#get-2tweetsid---get-tweet)
- [Users](#users)
  - [GET /2/users/by/username/:username](#get-2usersbyusernameusername---get-user-by-username)
  - [GET /2/users/:id](#get-2usersid---get-user-by-id)
  - [GET /2/users/:id/mentions](#get-2usersidmentions---get-user-mentions)
  - [GET /2/users/:id/tweets](#get-2usersidtweets---get-user-tweets)
- [Interactions](#interactions)
  - [POST /2/users/:id/following](#post-2usersidfollowing---follow-user)
  - [DELETE /2/users/:id/following/:target_user_id](#delete-2usersidfollowingtarget_user_id---unfollow-user)
  - [POST /2/users/:id/likes](#post-2usersidlikes---like-tweet)
  - [POST /2/users/:id/retweets](#post-2usersidretweets---retweet)

---

## Tweets

### POST /2/tweets - Create Tweet

Creates a new tweet on behalf of the authenticated user.

**Authentication**: OAuth 1.0a (User Context) or OAuth 2.0 with `tweet.write` scope

**Rate Limit**: 200 requests per 15 minutes (user), 17 per 24 hours (free tier)

#### Request

```http
POST https://api.twitter.com/2/tweets
Content-Type: application/json
Authorization: OAuth oauth_consumer_key="...", ...

{
  "text": "Hello, Twitter!"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the tweet (max 280 chars) |
| `reply` | object | No | Reply settings |
| `reply.in_reply_to_tweet_id` | string | No | Tweet ID to reply to |
| `quote_tweet_id` | string | No | Tweet ID to quote |
| `media` | object | No | Media attachments |
| `media.media_ids` | string[] | No | Array of media IDs |
| `poll` | object | No | Poll settings |

#### Response

```json
{
  "data": {
    "id": "1234567890123456789",
    "text": "Hello, Twitter!"
  }
}
```

#### Code Example

```javascript
const { postTweet } = require('./scripts/twitter_client');

// Simple tweet
const result = await postTweet('Hello, Twitter!');

// Reply to another tweet
const reply = await postTweet('Great point!', {
  replyToTweetId: '1234567890123456789'
});

// Quote tweet
const quote = await postTweet('Check this out!', {
  quoteTweetId: '1234567890123456789'
});
```

---

### DELETE /2/tweets/:id - Delete Tweet

Deletes a tweet owned by the authenticated user.

**Authentication**: OAuth 1.0a (User Context)

**Rate Limit**: 50 requests per 15 minutes

#### Request

```http
DELETE https://api.twitter.com/2/tweets/1234567890123456789
Authorization: OAuth oauth_consumer_key="...", ...
```

#### Response

```json
{
  "data": {
    "deleted": true
  }
}
```

#### Code Example

```javascript
const { deleteTweet } = require('./scripts/twitter_client');

const result = await deleteTweet('1234567890123456789');
console.log(`Deleted: ${result.data.deleted}`);
```

---

### GET /2/tweets/search/recent - Search Tweets

Searches tweets from the last 7 days.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 180 requests per 15 minutes (user), 450 per 15 min (app)

#### Request

```http
GET https://api.twitter.com/2/tweets/search/recent?query=%23nodejs&max_results=10&tweet.fields=created_at,public_metrics
Authorization: Bearer {bearer_token}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (max 512 chars) |
| `max_results` | integer | No | Results per page (10-100, default 10) |
| `start_time` | string | No | ISO 8601 timestamp for start |
| `end_time` | string | No | ISO 8601 timestamp for end |
| `since_id` | string | No | Return results after this tweet ID |
| `until_id` | string | No | Return results before this tweet ID |
| `tweet.fields` | string | No | Comma-separated tweet fields |
| `user.fields` | string | No | Comma-separated user fields |
| `expansions` | string | No | Comma-separated expansions |

#### Search Query Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `keyword` | `javascript` | Contains keyword |
| `#hashtag` | `#nodejs` | Contains hashtag |
| `@mention` | `@nodejs` | Mentions user |
| `from:` | `from:nodejs` | Tweets from user |
| `to:` | `to:nodejs` | Replies to user |
| `-` | `-is:retweet` | Exclude matching |
| `is:retweet` | `is:retweet` | Only retweets |
| `is:reply` | `is:reply` | Only replies |
| `has:links` | `has:links` | Contains links |
| `has:media` | `has:media` | Contains media |
| `lang:` | `lang:en` | Specific language |

#### Response

```json
{
  "data": [
    {
      "id": "1234567890123456789",
      "text": "Just learned about Node.js #nodejs",
      "created_at": "2024-01-15T12:00:00.000Z",
      "public_metrics": {
        "retweet_count": 5,
        "reply_count": 2,
        "like_count": 15,
        "quote_count": 1
      }
    }
  ],
  "meta": {
    "newest_id": "1234567890123456789",
    "oldest_id": "1234567890123456788",
    "result_count": 10,
    "next_token": "b26v89c19zqg8o3fo7gesq314yb6644i4jasc"
  }
}
```

#### Code Example

```javascript
const { searchTweets } = require('./scripts/twitter_client');

const result = await searchTweets('#nodejs -is:retweet lang:en', {
  maxResults: 20,
  tweetFields: ['created_at', 'public_metrics', 'author_id']
});

result.data.forEach(tweet => {
  console.log(`${tweet.text}`);
  console.log(`Likes: ${tweet.public_metrics.like_count}`);
});
```

---

### GET /2/tweets/:id - Get Tweet

Retrieves a single tweet by ID.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 900 requests per 15 minutes (user), 900 per 15 min (app)

#### Request

```http
GET https://api.twitter.com/2/tweets/1234567890123456789?tweet.fields=created_at,public_metrics
Authorization: Bearer {bearer_token}
```

#### Response

```json
{
  "data": {
    "id": "1234567890123456789",
    "text": "Hello, Twitter!",
    "created_at": "2024-01-15T12:00:00.000Z",
    "public_metrics": {
      "retweet_count": 10,
      "reply_count": 5,
      "like_count": 25,
      "quote_count": 2
    }
  }
}
```

#### Code Example

```javascript
const { getTweet } = require('./scripts/twitter_client');

const result = await getTweet('1234567890123456789', {
  tweetFields: ['created_at', 'public_metrics']
});

console.log(`Tweet: ${result.data.text}`);
console.log(`Likes: ${result.data.public_metrics.like_count}`);
```

---

## Users

### GET /2/users/by/username/:username - Get User by Username

Retrieves user information by username.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 300 requests per 15 minutes

#### Request

```http
GET https://api.twitter.com/2/users/by/username/nodejs?user.fields=created_at,description,public_metrics
Authorization: Bearer {bearer_token}
```

#### Response

```json
{
  "data": {
    "id": "91985735",
    "name": "Node.js",
    "username": "nodejs",
    "created_at": "2009-11-22T19:16:10.000Z",
    "description": "The Node.js JavaScript Runtime",
    "public_metrics": {
      "followers_count": 500000,
      "following_count": 150,
      "tweet_count": 5000,
      "listed_count": 2500
    }
  }
}
```

#### Code Example

```javascript
const { getUserByUsername } = require('./scripts/twitter_client');

const result = await getUserByUsername('nodejs', {
  userFields: ['created_at', 'description', 'public_metrics']
});

console.log(`User: @${result.data.username}`);
console.log(`Followers: ${result.data.public_metrics.followers_count}`);
```

---

### GET /2/users/:id - Get User by ID

Retrieves user information by ID.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 300 requests per 15 minutes

#### Request

```http
GET https://api.twitter.com/2/users/91985735?user.fields=created_at,description,public_metrics
Authorization: Bearer {bearer_token}
```

#### Response

Same as Get User by Username.

---

### GET /2/users/:id/mentions - Get User Mentions

Retrieves tweets that mention the specified user.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 180 requests per 15 minutes

#### Request

```http
GET https://api.twitter.com/2/users/91985735/mentions?max_results=10&tweet.fields=created_at,author_id
Authorization: Bearer {bearer_token}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `max_results` | integer | No | Results per page (5-100, default 10) |
| `pagination_token` | string | No | Token for next page |
| `since_id` | string | No | Return results after this tweet ID |
| `until_id` | string | No | Return results before this tweet ID |
| `start_time` | string | No | ISO 8601 timestamp for start |
| `end_time` | string | No | ISO 8601 timestamp for end |

#### Response

```json
{
  "data": [
    {
      "id": "1234567890123456789",
      "text": "@nodejs is amazing for backend development!",
      "created_at": "2024-01-15T12:00:00.000Z",
      "author_id": "123456789"
    }
  ],
  "meta": {
    "result_count": 10,
    "next_token": "7140dx..."
  }
}
```

#### Code Example

```javascript
const { getUserMentions, getAuthenticatedUserId } = require('./scripts/twitter_client');

const userId = await getAuthenticatedUserId();
const result = await getUserMentions(userId, {
  maxResults: 10,
  tweetFields: ['created_at', 'author_id']
});

result.data.forEach(mention => {
  console.log(`Mention: ${mention.text}`);
});
```

---

### GET /2/users/:id/tweets - Get User Tweets

Retrieves tweets posted by the specified user.

**Authentication**: Bearer Token or OAuth 1.0a

**Rate Limit**: 900 requests per 15 minutes (user), 1500 per 15 min (app)

#### Request

```http
GET https://api.twitter.com/2/users/91985735/tweets?max_results=10&tweet.fields=created_at,public_metrics
Authorization: Bearer {bearer_token}
```

#### Response

```json
{
  "data": [
    {
      "id": "1234567890123456789",
      "text": "Node.js v20 is now available!",
      "created_at": "2024-01-15T12:00:00.000Z",
      "public_metrics": {
        "retweet_count": 100,
        "reply_count": 25,
        "like_count": 500,
        "quote_count": 15
      }
    }
  ],
  "meta": {
    "result_count": 10,
    "next_token": "7140dx..."
  }
}
```

---

## Interactions

### POST /2/users/:id/following - Follow User

Follows a user on behalf of the authenticated user.

**Authentication**: OAuth 1.0a (User Context)

**Rate Limit**: 50 requests per 15 minutes

#### Request

```http
POST https://api.twitter.com/2/users/123456789/following
Content-Type: application/json
Authorization: OAuth oauth_consumer_key="...", ...

{
  "target_user_id": "91985735"
}
```

#### Response

```json
{
  "data": {
    "following": true,
    "pending_follow": false
  }
}
```

**Note**: `pending_follow` is `true` if the target account is protected.

#### Code Example

```javascript
const { followUser, followUserByUsername } = require('./scripts/twitter_client');

// By user ID
await followUser('91985735');

// By username
await followUserByUsername('nodejs');
```

---

### DELETE /2/users/:id/following/:target_user_id - Unfollow User

Unfollows a user.

**Authentication**: OAuth 1.0a (User Context)

**Rate Limit**: 50 requests per 15 minutes

#### Request

```http
DELETE https://api.twitter.com/2/users/123456789/following/91985735
Authorization: OAuth oauth_consumer_key="...", ...
```

#### Response

```json
{
  "data": {
    "following": false
  }
}
```

---

### POST /2/users/:id/likes - Like Tweet

Likes a tweet on behalf of the authenticated user.

**Authentication**: OAuth 1.0a (User Context)

**Rate Limit**: 50 requests per 15 minutes (free tier: 5 per 15 min)

#### Request

```http
POST https://api.twitter.com/2/users/123456789/likes
Content-Type: application/json
Authorization: OAuth oauth_consumer_key="...", ...

{
  "tweet_id": "1234567890123456789"
}
```

#### Response

```json
{
  "data": {
    "liked": true
  }
}
```

#### Code Example

```javascript
const { likeTweet, unlikeTweet } = require('./scripts/twitter_client');

// Like a tweet
await likeTweet('1234567890123456789');

// Unlike a tweet
await unlikeTweet('1234567890123456789');
```

---

### POST /2/users/:id/retweets - Retweet

Retweets a tweet on behalf of the authenticated user.

**Authentication**: OAuth 1.0a (User Context)

**Rate Limit**: 50 requests per 15 minutes

#### Request

```http
POST https://api.twitter.com/2/users/123456789/retweets
Content-Type: application/json
Authorization: OAuth oauth_consumer_key="...", ...

{
  "tweet_id": "1234567890123456789"
}
```

#### Response

```json
{
  "data": {
    "retweeted": true
  }
}
```

#### Code Example

```javascript
const { retweet, unretweet } = require('./scripts/twitter_client');

// Retweet
await retweet('1234567890123456789');

// Remove retweet
await unretweet('1234567890123456789');
```

---

## Tweet Fields Reference

Available fields for `tweet.fields` parameter:

| Field | Description |
|-------|-------------|
| `attachments` | Media and poll attachments |
| `author_id` | ID of the tweet author |
| `context_annotations` | Entity recognition annotations |
| `conversation_id` | ID of the conversation thread |
| `created_at` | Tweet creation timestamp |
| `entities` | URLs, mentions, hashtags, cashtags |
| `geo` | Location information |
| `id` | Tweet ID |
| `in_reply_to_user_id` | ID of user being replied to |
| `lang` | Language code |
| `public_metrics` | Engagement counts |
| `possibly_sensitive` | Sensitive content flag |
| `referenced_tweets` | Quoted/replied tweets |
| `reply_settings` | Who can reply |
| `source` | Client used to post |
| `text` | Tweet content |
| `withheld` | Withholding information |

---

## User Fields Reference

Available fields for `user.fields` parameter:

| Field | Description |
|-------|-------------|
| `created_at` | Account creation timestamp |
| `description` | User bio |
| `entities` | URLs in description |
| `id` | User ID |
| `location` | User location |
| `name` | Display name |
| `pinned_tweet_id` | ID of pinned tweet |
| `profile_image_url` | Avatar URL |
| `protected` | Protected account flag |
| `public_metrics` | Follower/following counts |
| `url` | Website URL |
| `username` | Handle (without @) |
| `verified` | Verified badge |
| `withheld` | Withholding information |

---

## Error Responses

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Twitter server error |
| 503 | Service Unavailable | Temporary outage |

### Error Response Format

```json
{
  "errors": [
    {
      "message": "You are not permitted to perform this action.",
      "code": 403,
      "type": "forbidden"
    }
  ]
}
```

---

## Additional Resources

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [twitter-api-v2 npm package](https://github.com/PLhery/node-twitter-api-v2)
- [Authentication Guide](./AUTHENTICATION.md)
- [Rate Limits Guide](./RATE_LIMITS.md)
