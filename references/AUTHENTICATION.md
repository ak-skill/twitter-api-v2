# Twitter API v2 Authentication Guide

This guide covers all authentication methods for Twitter API v2, from simple Bearer Token setup to full OAuth 1.0a configuration.

## Prerequisites

1. **Twitter Developer Account**: Sign up at [developer.twitter.com](https://developer.twitter.com)
2. **Developer Portal Access**: Apply for access if needed (Essential tier is free)
3. **Project and App**: Create a project and app in the Developer Portal

## Getting Started: Developer Portal Setup

### Step 1: Create a Twitter Developer Account

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Click "Sign up" and log in with your Twitter account
3. Complete the application form:
   - Describe your intended use case
   - Agree to the Developer Agreement
4. Wait for approval (usually instant for Essential tier)

### Step 2: Create a Project and App

1. Navigate to the [Developer Portal Dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Click "Create Project"
3. Enter project details:
   - Project name (e.g., "My Twitter Bot")
   - Use case (e.g., "Building a bot" or "Academic research")
   - Project description
4. Create an app within the project:
   - App name (must be unique across Twitter)
   - App description

### Step 3: Generate Credentials

Navigate to your app's "Keys and Tokens" page:

1. **API Key and Secret** (Consumer Keys):
   - Click "Generate" under API Key and Secret
   - Save both values securely
   - These are used for OAuth 1.0a authentication

2. **Bearer Token**:
   - Click "Generate" under Bearer Token
   - Save the token securely
   - This is used for App-Only (read) authentication

3. **Access Token and Secret**:
   - Click "Generate" under Access Token and Secret
   - Ensure "Read and Write" permissions are enabled
   - Save both values securely
   - These are used for OAuth 1.0a user context

---

## OAuth 2.0 Bearer Token (App-Only)

**Best for**: Read-only operations like search, lookup, and timeline access.

### When to Use

- Searching tweets
- Looking up users by username or ID
- Fetching tweet content
- Getting user timelines (public)
- Any operation that doesn't require user context

### Setup

```bash
# In your .env file
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Code Example

```javascript
const { TwitterApi } = require('twitter-api-v2');

// Create read-only client
const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN).readOnly;

// Search tweets
const result = await client.v2.search('#nodejs', {
  max_results: 10,
  'tweet.fields': ['created_at', 'public_metrics']
});
```

### Limitations

- Cannot post tweets
- Cannot like, retweet, or follow
- Cannot access private/protected accounts
- Cannot send DMs
- No user context (actions are app-level, not user-level)

---

## OAuth 1.0a User Context

**Best for**: Full access including posting, liking, following, and all user actions.

### When to Use

- Posting tweets and threads
- Liking and retweeting
- Following and unfollowing users
- Sending direct messages
- Any action performed on behalf of a user

### Setup

```bash
# In your .env file
TWITTER_API_KEY=xxxxxxxxxxxxxxxxxxxx
TWITTER_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_TOKEN=0000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Generating Access Tokens

For personal use (your own account):

1. Go to Developer Portal > Your App > Keys and Tokens
2. Under "Access Token and Secret", click "Generate"
3. Select "Read and Write" permissions
4. Copy and save both tokens

For third-party users (other accounts):

- You'll need to implement OAuth 1.0a 3-legged flow
- User authorizes your app, you receive their tokens
- Store tokens securely for future API calls

### Code Example

```javascript
const { TwitterApi } = require('twitter-api-v2');

// Create read-write client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Post a tweet
const result = await client.v2.tweet('Hello from the API!');
console.log(`Tweet posted: ${result.data.id}`);
```

### Token Permissions

Access tokens can have different permission levels:

- **Read**: Can only read data (similar to Bearer Token)
- **Read and Write**: Can read and post/interact
- **Read, Write, and Direct Messages**: Full access including DMs

To change permissions:
1. Go to Developer Portal > Your App > Settings
2. Under "User authentication settings", click "Set up"
3. Select the appropriate permissions
4. Regenerate your access tokens (old ones become invalid)

---

## OAuth 2.0 PKCE (User Authorization Flow)

**Best for**: Third-party apps that need users to authorize access.

### When to Use

- Building apps for multiple users
- Users need to log in with Twitter
- You don't control the user's credentials
- More secure than OAuth 1.0a for web apps

### Setup

1. Configure OAuth 2.0 settings in Developer Portal:
   - Go to your app > Settings > User authentication settings
   - Enable OAuth 2.0
   - Add callback URLs (e.g., `http://localhost:3000/callback`)
   - Select scopes you need

2. Get Client ID:
   ```bash
   TWITTER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
   TWITTER_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Code Example

```javascript
const { TwitterApi } = require('twitter-api-v2');

// Step 1: Generate authorization URL
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
  'http://localhost:3000/callback',
  { scope: ['tweet.read', 'tweet.write', 'users.read'] }
);

// Redirect user to `url`
// Store `codeVerifier` and `state` in session

// Step 2: Handle callback
async function handleCallback(code, codeVerifier) {
  const { client: loggedClient, accessToken, refreshToken } =
    await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: 'http://localhost:3000/callback',
    });

  // loggedClient is now authenticated
  // Store accessToken and refreshToken for future use
  return loggedClient;
}
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `tweet.read` | Read tweets |
| `tweet.write` | Post and delete tweets |
| `users.read` | Read user profiles |
| `follows.read` | Read following/followers |
| `follows.write` | Follow and unfollow |
| `like.read` | Read liked tweets |
| `like.write` | Like and unlike tweets |
| `dm.read` | Read direct messages |
| `dm.write` | Send direct messages |
| `offline.access` | Get refresh token |

---

## Credential Security Best Practices

### Environment Variables

Always use environment variables, never hardcode credentials:

```javascript
// Good
const token = process.env.TWITTER_BEARER_TOKEN;

// Bad - Never do this
const token = 'AAAAAAAAAAAAAAAAAAAAAxxxxxxxxxx';
```

### .gitignore

Add `.env` to your `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
```

### Production Secrets

For production environments:

- Use secrets management services (AWS Secrets Manager, HashiCorp Vault)
- Set environment variables through your deployment platform
- Rotate credentials periodically
- Use least-privilege access (only request needed permissions)

### Credential Rotation

If credentials are compromised:

1. Go to Developer Portal > Your App > Keys and Tokens
2. Click "Regenerate" for the compromised credential
3. Update your application with new credentials
4. Old credentials become invalid immediately

---

## Common Authentication Errors

### Error 401: Unauthorized

**Cause**: Invalid or missing credentials

**Solutions**:
- Verify Bearer Token is correct and complete
- Check API Key/Secret for typos
- Ensure Access Token matches API Key (same app)
- Regenerate credentials if necessary

### Error 403: Forbidden

**Cause**: Credentials don't have required permissions

**Solutions**:
- Check app permissions in Developer Portal
- Ensure Access Token has "Read and Write" for posting
- Verify you're using correct authentication method for the endpoint

### Error 429: Too Many Requests

**Cause**: Rate limit exceeded

**Solutions**:
- Implement exponential backoff
- Check `x-rate-limit-reset` header for reset time
- Reduce request frequency
- Consider upgrading API tier

### "Could not authenticate you"

**Cause**: OAuth 1.0a signature issue

**Solutions**:
- Ensure clock is synchronized (NTP)
- Check for extra whitespace in credentials
- Verify all four OAuth 1.0a credentials are correct
- Use a library that handles signing (like twitter-api-v2)

---

## Testing Your Credentials

Use the provided verification script:

```bash
cd scripts
cp .env.example .env
# Edit .env with your credentials
node example_usage.js verify
```

Expected output for valid credentials:

```
Configuration status:
  Bearer Token: Configured
  OAuth 1.0a: Configured

Testing API connection...

Bearer Token (read-only):
  Valid: Yes

OAuth 1.0a (read-write):
  Valid: Yes
  Authenticated as: @yourusername
  User ID: 1234567890
```

---

## Choosing the Right Authentication

| Use Case | Recommended Auth | Why |
|----------|-----------------|-----|
| Read-only bot | Bearer Token | Simplest setup, no user context needed |
| Personal posting bot | OAuth 1.0a | Full access for your account |
| Multi-user app | OAuth 2.0 PKCE | Secure user authorization flow |
| Analytics dashboard | Bearer Token | Only needs read access |
| Engagement bot | OAuth 1.0a | Needs like/follow/retweet |
| DM automation | OAuth 1.0a + DM permission | Requires elevated access |

## Next Steps

1. [Review API Endpoints](./ENDPOINTS.md) for available operations
2. [Understand Rate Limits](./RATE_LIMITS.md) to avoid throttling
3. Check the [example scripts](../scripts/) for working code examples
