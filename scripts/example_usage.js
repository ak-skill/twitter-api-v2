#!/usr/bin/env node

/**
 * Twitter API v2 Example Usage
 *
 * Comprehensive examples demonstrating all major Twitter API v2 operations.
 * Run specific examples using command line arguments.
 *
 * Usage:
 *   node example_usage.js [command]
 *
 * Commands:
 *   verify    - Verify API credentials
 *   search    - Search for tweets
 *   user      - Get user information
 *   mentions  - Get user mentions
 *   post      - Post a tweet (requires OAuth 1.0a)
 *   thread    - Post a thread (requires OAuth 1.0a)
 *   like      - Like a tweet (requires OAuth 1.0a)
 *   follow    - Follow a user (requires OAuth 1.0a)
 *   all       - Run all read-only examples
 */

const {
  verifyCredentials,
  checkCredentials,
  searchTweets,
  getTweet,
  getUserByUsername,
  getUserMentions,
  getUserTimeline,
  getAuthenticatedUserId,
  postTweet,
  postThread,
  likeTweet,
  followUser,
  followUserByUsername,
  retweet,
} = require('./twitter_client');

// ============================================================================
// EXAMPLE: Verify Credentials
// ============================================================================

async function exampleVerifyCredentials() {
  console.log('\n=== Verifying Twitter API Credentials ===\n');

  const status = checkCredentials();
  console.log('Configuration status:');
  console.log(`  Bearer Token: ${status.bearerToken ? 'Configured' : 'Not configured'}`);
  console.log(`  OAuth 1.0a: ${status.oauth1 ? 'Configured' : 'Not configured'}`);

  console.log('\nTesting API connection...\n');

  const result = await verifyCredentials();

  console.log('Bearer Token (read-only):');
  if (result.bearerToken.configured) {
    console.log(`  Valid: ${result.bearerToken.valid ? 'Yes' : 'No'}`);
    if (result.bearerToken.error) {
      console.log(`  Error: ${result.bearerToken.error}`);
    }
  } else {
    console.log('  Not configured');
  }

  console.log('\nOAuth 1.0a (read-write):');
  if (result.oauth1.configured) {
    console.log(`  Valid: ${result.oauth1.valid ? 'Yes' : 'No'}`);
    if (result.oauth1.user) {
      console.log(`  Authenticated as: @${result.oauth1.user.username}`);
      console.log(`  User ID: ${result.oauth1.user.id}`);
    }
    if (result.oauth1.error) {
      console.log(`  Error: ${result.oauth1.error}`);
    }
  } else {
    console.log('  Not configured');
  }

  return result;
}

// ============================================================================
// EXAMPLE: Search Tweets
// ============================================================================

async function exampleSearchTweets() {
  console.log('\n=== Searching Recent Tweets ===\n');

  // Search for tweets about JavaScript, excluding retweets
  const query = '#JavaScript -is:retweet lang:en';
  console.log(`Query: "${query}"\n`);

  try {
    const result = await searchTweets(query, {
      maxResults: 5,
      tweetFields: ['created_at', 'public_metrics', 'author_id'],
    });

    if (!result.data || result.data.length === 0) {
      console.log('No tweets found matching the query.');
      return;
    }

    console.log(`Found ${result.data.length} tweets:\n`);

    result.data.forEach((tweet, index) => {
      console.log(`${index + 1}. Tweet ID: ${tweet.id}`);
      console.log(`   Text: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
      console.log(`   Created: ${tweet.created_at}`);
      if (tweet.public_metrics) {
        console.log(`   Likes: ${tweet.public_metrics.like_count}, Retweets: ${tweet.public_metrics.retweet_count}`);
      }
      console.log('');
    });

    return result;
  } catch (error) {
    console.error('Search failed:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Get User Information
// ============================================================================

async function exampleGetUser() {
  console.log('\n=== Getting User Information ===\n');

  const username = 'nodejs';
  console.log(`Looking up user: @${username}\n`);

  try {
    const result = await getUserByUsername(username, {
      userFields: ['created_at', 'description', 'public_metrics', 'profile_image_url', 'verified'],
    });

    if (!result.data) {
      console.log(`User @${username} not found.`);
      return;
    }

    const user = result.data;
    console.log(`User: @${user.username}`);
    console.log(`Name: ${user.name}`);
    console.log(`ID: ${user.id}`);
    console.log(`Description: ${user.description || 'N/A'}`);
    console.log(`Created: ${user.created_at}`);
    console.log(`Profile Image: ${user.profile_image_url}`);

    if (user.public_metrics) {
      console.log('\nMetrics:');
      console.log(`  Followers: ${user.public_metrics.followers_count.toLocaleString()}`);
      console.log(`  Following: ${user.public_metrics.following_count.toLocaleString()}`);
      console.log(`  Tweets: ${user.public_metrics.tweet_count.toLocaleString()}`);
    }

    return result;
  } catch (error) {
    console.error('User lookup failed:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Get User Mentions
// ============================================================================

async function exampleGetMentions() {
  console.log('\n=== Getting User Mentions ===\n');

  try {
    // Get authenticated user's ID
    const userId = await getAuthenticatedUserId();
    console.log(`Getting mentions for user ID: ${userId}\n`);

    const result = await getUserMentions(userId, {
      maxResults: 5,
      tweetFields: ['created_at', 'author_id', 'conversation_id', 'public_metrics'],
    });

    if (!result.data || result.data.length === 0) {
      console.log('No recent mentions found.');
      return;
    }

    console.log(`Found ${result.data.length} mentions:\n`);

    result.data.forEach((tweet, index) => {
      console.log(`${index + 1}. Tweet ID: ${tweet.id}`);
      console.log(`   Text: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
      console.log(`   Created: ${tweet.created_at}`);
      console.log(`   Author ID: ${tweet.author_id}`);
      console.log('');
    });

    return result;
  } catch (error) {
    console.error('Failed to get mentions:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Get User Timeline
// ============================================================================

async function exampleGetTimeline() {
  console.log('\n=== Getting User Timeline ===\n');

  try {
    const user = await getUserByUsername('nodejs');
    if (!user.data) {
      console.log('User not found.');
      return;
    }

    console.log(`Getting timeline for @${user.data.username}\n`);

    const result = await getUserTimeline(user.data.id, {
      maxResults: 5,
      tweetFields: ['created_at', 'public_metrics'],
    });

    if (!result.data || result.data.length === 0) {
      console.log('No tweets found in timeline.');
      return;
    }

    console.log(`Found ${result.data.length} tweets:\n`);

    result.data.forEach((tweet, index) => {
      console.log(`${index + 1}. ${tweet.text.substring(0, 80)}${tweet.text.length > 80 ? '...' : ''}`);
      console.log(`   Created: ${tweet.created_at}`);
      if (tweet.public_metrics) {
        console.log(`   Engagement: ${tweet.public_metrics.like_count} likes, ${tweet.public_metrics.retweet_count} retweets`);
      }
      console.log('');
    });

    return result;
  } catch (error) {
    console.error('Failed to get timeline:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Post a Tweet (Requires OAuth 1.0a)
// ============================================================================

async function examplePostTweet() {
  console.log('\n=== Posting a Tweet ===\n');

  const status = checkCredentials();
  if (!status.oauth1) {
    console.log('OAuth 1.0a credentials not configured. Cannot post tweets.');
    console.log('Please configure TWITTER_API_KEY, TWITTER_API_SECRET,');
    console.log('TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET in your .env file.');
    return;
  }

  // Generate a unique tweet to avoid duplicate detection
  const timestamp = new Date().toISOString();
  const tweetText = `Testing Twitter API v2 integration - ${timestamp}`;

  console.log(`Posting tweet: "${tweetText}"\n`);

  try {
    const result = await postTweet(tweetText);
    console.log('Tweet posted successfully!');
    console.log(`Tweet ID: ${result.data.id}`);
    console.log(`URL: https://twitter.com/user/status/${result.data.id}`);
    return result;
  } catch (error) {
    console.error('Failed to post tweet:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Post a Thread (Requires OAuth 1.0a)
// ============================================================================

async function examplePostThread() {
  console.log('\n=== Posting a Thread ===\n');

  const status = checkCredentials();
  if (!status.oauth1) {
    console.log('OAuth 1.0a credentials not configured. Cannot post threads.');
    return;
  }

  const timestamp = new Date().toISOString();
  const threadTweets = [
    `Thread Example - Part 1 (${timestamp}):\n\nThis is the first tweet in a thread posted via Twitter API v2.`,
    `Thread Example - Part 2:\n\nThis tweet automatically replies to the first one, creating a connected thread.`,
    `Thread Example - Part 3 (Final):\n\nThis concludes the thread. All tweets are linked together automatically.`,
  ];

  console.log('Posting thread with 3 tweets...\n');

  try {
    const results = await postThread(threadTweets);
    console.log('Thread posted successfully!\n');

    results.forEach((result, index) => {
      console.log(`Tweet ${index + 1} ID: ${result.data.id}`);
    });

    console.log(`\nThread URL: https://twitter.com/user/status/${results[0].data.id}`);
    return results;
  } catch (error) {
    console.error('Failed to post thread:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Like a Tweet (Requires OAuth 1.0a)
// ============================================================================

async function exampleLikeTweet() {
  console.log('\n=== Liking a Tweet ===\n');

  const status = checkCredentials();
  if (!status.oauth1) {
    console.log('OAuth 1.0a credentials not configured. Cannot like tweets.');
    return;
  }

  // First, search for a tweet to like
  console.log('Finding a tweet to like...\n');

  try {
    const searchResult = await searchTweets('#nodejs -is:retweet', { maxResults: 1 });

    if (!searchResult.data || searchResult.data.length === 0) {
      console.log('No tweets found to like.');
      return;
    }

    const tweetToLike = searchResult.data[0];
    console.log(`Found tweet: "${tweetToLike.text.substring(0, 50)}..."`);
    console.log(`Tweet ID: ${tweetToLike.id}\n`);

    const result = await likeTweet(tweetToLike.id);
    console.log(`Like result: ${result.data.liked ? 'Liked successfully!' : 'Already liked'}`);
    return result;
  } catch (error) {
    console.error('Failed to like tweet:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: Follow a User (Requires OAuth 1.0a)
// ============================================================================

async function exampleFollowUser() {
  console.log('\n=== Following a User ===\n');

  const status = checkCredentials();
  if (!status.oauth1) {
    console.log('OAuth 1.0a credentials not configured. Cannot follow users.');
    return;
  }

  const usernameToFollow = 'nodejs';
  console.log(`Attempting to follow @${usernameToFollow}...\n`);

  try {
    const result = await followUserByUsername(usernameToFollow);

    if (result.data.following) {
      console.log(`Successfully followed @${usernameToFollow}!`);
    } else if (result.data.pending_follow) {
      console.log(`Follow request sent to @${usernameToFollow} (account is protected)`);
    }

    return result;
  } catch (error) {
    if (error.message.includes('already')) {
      console.log(`Already following @${usernameToFollow}`);
    } else {
      console.error('Failed to follow user:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// MAIN: Command Line Interface
// ============================================================================

async function main() {
  const command = process.argv[2] || 'verify';

  console.log('Twitter API v2 Example Usage');
  console.log('============================');

  try {
    switch (command.toLowerCase()) {
      case 'verify':
        await exampleVerifyCredentials();
        break;

      case 'search':
        await exampleSearchTweets();
        break;

      case 'user':
        await exampleGetUser();
        break;

      case 'mentions':
        await exampleGetMentions();
        break;

      case 'timeline':
        await exampleGetTimeline();
        break;

      case 'post':
        await examplePostTweet();
        break;

      case 'thread':
        await examplePostThread();
        break;

      case 'like':
        await exampleLikeTweet();
        break;

      case 'follow':
        await exampleFollowUser();
        break;

      case 'all':
        console.log('\nRunning all read-only examples...\n');
        await exampleVerifyCredentials();
        await exampleSearchTweets();
        await exampleGetUser();
        break;

      default:
        console.log(`\nUnknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  verify    - Verify API credentials');
        console.log('  search    - Search for tweets');
        console.log('  user      - Get user information');
        console.log('  mentions  - Get user mentions (requires OAuth 1.0a)');
        console.log('  timeline  - Get user timeline');
        console.log('  post      - Post a tweet (requires OAuth 1.0a)');
        console.log('  thread    - Post a thread (requires OAuth 1.0a)');
        console.log('  like      - Like a tweet (requires OAuth 1.0a)');
        console.log('  follow    - Follow a user (requires OAuth 1.0a)');
        console.log('  all       - Run all read-only examples');
        process.exit(1);
    }

    console.log('\n=== Done ===\n');
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use in other scripts
module.exports = {
  exampleVerifyCredentials,
  exampleSearchTweets,
  exampleGetUser,
  exampleGetMentions,
  exampleGetTimeline,
  examplePostTweet,
  examplePostThread,
  exampleLikeTweet,
  exampleFollowUser,
};
