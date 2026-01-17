# Twitter API v2 Integration

A comprehensive Claude Code skill for automating Twitter/X operations using the official API v2.

## Overview

This skill enables Claude to interact with Twitter/X API v2, providing capabilities for posting tweets, searching content, monitoring mentions and hashtags, and managing user interactions. It uses the official `twitter-api-v2` npm package with support for both OAuth 2.0 Bearer Token (read-only) and OAuth 1.0a (read-write) authentication.

## Features

- ✅ **Post tweets, threads, and replies** - Create and manage Twitter content
- ✅ **Search tweets** - Advanced search with operators and filters
- ✅ **Monitor mentions and hashtags** - Track engagement and conversations
- ✅ **User interactions** - Follow, like, retweet, and manage relationships
- ✅ **Rate limit handling** - Automatic retry with exponential backoff
- ✅ **Comprehensive documentation** - Full API reference and examples

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Configure Credentials

```bash
cp scripts/.env.example scripts/.env
# Edit .env with your Twitter API credentials
```

Get your credentials from the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).

### 3. Verify Setup

```bash
node scripts/example_usage.js verify
```

## Usage

This skill activates when Claude detects keywords like:
- "Twitter", "X", "tweet", "posting to Twitter"
- "search tweets", "track hashtags"
- "Twitter bot", "Twitter automation"
- "Twitter OAuth", "Twitter API"

Once activated, Claude can help you:
- Post tweets and threads programmatically
- Search and analyze Twitter content
- Monitor mentions and track engagement
- Automate user interactions

## Installation

This skill is compatible with Claude Code and follows the Agent Skills open standard.

To use this skill:

1. Clone this repository:
   ```bash
   git clone https://github.com/ak-skill/twitter-api-v2.git
   ```

2. Place it in your `.claude/skills/` directory:
   ```bash
   cp -r twitter-api-v2 ~/.config/claude/skills/
   ```

3. Install dependencies as shown in Quick Start

4. The skill will be automatically available in Claude Code

## Documentation

- [SKILL.md](SKILL.md) - Complete skill definition and instructions
- [references/AUTHENTICATION.md](references/AUTHENTICATION.md) - Authentication setup guide
- [references/ENDPOINTS.md](references/ENDPOINTS.md) - API endpoint documentation
- [references/RATE_LIMITS.md](references/RATE_LIMITS.md) - Rate limit management

## Requirements

- Node.js 14+ with npm
- Twitter Developer account with API credentials
- Network access to api.twitter.com

## Examples

See [scripts/example_usage.js](scripts/example_usage.js) for comprehensive examples of:
- Posting tweets and threads
- Searching tweets with filters
- Monitoring mentions
- Following users and managing interactions

## License

Apache-2.0

## Contributing

This skill was created by Claude Agent. Contributions, issues, and feature requests are welcome!
