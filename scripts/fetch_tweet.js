#!/usr/bin/env node
/**
 * Fetch and summarize a tweet by ID or URL
 * Usage: node fetch_tweet.js <tweet_id_or_url>
 */

const { getTweet, getUserById } = require('./twitter_client');

/**
 * Extracts tweet ID from a Twitter/X URL or returns the ID if already provided
 * @param {string} input - Tweet ID or URL
 * @returns {string} Tweet ID
 */
function extractTweetId(input) {
  if (!input) {
    throw new Error('Tweet ID or URL is required');
  }

  // If it's already a numeric ID, return it
  if (/^\d+$/.test(input)) {
    return input;
  }

  // Extract from URL patterns:
  // https://twitter.com/username/status/123456789
  // https://x.com/username/status/123456789
  const urlPattern = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
  const match = input.match(urlPattern);

  if (match && match[1]) {
    return match[1];
  }

  throw new Error('Invalid tweet ID or URL format');
}

/**
 * Formats a tweet summary for display
 * @param {Object} tweetData - Tweet data from API
 * @param {Object} userData - User data from API
 */
function formatTweetSummary(tweetData, userData) {
  const tweet = tweetData.data;
  const user = userData.data;

  console.log('\n' + '='.repeat(80));
  console.log('TWEET SUMMARY');
  console.log('='.repeat(80));
  console.log();

  console.log(`Author: ${user.name} (@${user.username})`);
  console.log(`Posted: ${new Date(tweet.created_at).toLocaleString()}`);
  console.log(`URL: https://x.com/${user.username}/status/${tweet.id}`);
  console.log();

  console.log('Content:');
  console.log('-'.repeat(80));
  console.log(tweet.text);
  console.log('-'.repeat(80));
  console.log();

  if (tweet.public_metrics) {
    const metrics = tweet.public_metrics;
    console.log('Engagement:');
    console.log(`  ❤️  Likes: ${metrics.like_count.toLocaleString()}`);
    console.log(`  🔄 Retweets: ${metrics.retweet_count.toLocaleString()}`);
    console.log(`  💬 Replies: ${metrics.reply_count.toLocaleString()}`);
    console.log(`  👁️  Impressions: ${metrics.impression_count?.toLocaleString() || 'N/A'}`);
    console.log();
  }

  // Generate a brief summary
  console.log('Summary:');
  const wordCount = tweet.text.split(/\s+/).length;
  const hasHashtags = tweet.text.includes('#');
  const hasMentions = tweet.text.includes('@');
  const hasLinks = /https?:\/\//.test(tweet.text);

  let summary = `A tweet by ${user.name} (@${user.username}) with ${wordCount} words`;

  const features = [];
  if (hasHashtags) features.push('hashtags');
  if (hasMentions) features.push('mentions');
  if (hasLinks) features.push('links');

  if (features.length > 0) {
    summary += ` containing ${features.join(', ')}`;
  }

  summary += `. Posted on ${new Date(tweet.created_at).toLocaleDateString()}.`;

  console.log(summary);
  console.log();
  console.log('='.repeat(80));
}

async function main() {
  try {
    const input = process.argv[2];

    if (!input) {
      console.error('Usage: node fetch_tweet.js <tweet_id_or_url>');
      console.error('Example: node fetch_tweet.js https://x.com/user/status/123456789');
      process.exit(1);
    }

    const tweetId = extractTweetId(input);
    console.log(`Fetching tweet ID: ${tweetId}...`);

    // Fetch tweet with extended fields
    const tweetData = await getTweet(tweetId, {
      tweetFields: ['created_at', 'public_metrics', 'author_id', 'conversation_id', 'lang'],
      expansions: ['author_id']
    });

    if (!tweetData.data) {
      throw new Error('Tweet not found or is not accessible');
    }

    // Fetch user data
    const userData = await getUserById(tweetData.data.author_id);

    // Display summary
    formatTweetSummary(tweetData, userData);

  } catch (error) {
    console.error('\nError:', error.message);

    if (error.code === 401) {
      console.error('\nAuthentication failed. Please check your Twitter API credentials in scripts/.env');
      console.error('Make sure TWITTER_BEARER_TOKEN is set correctly.');
    } else if (error.code === 404) {
      console.error('\nTweet not found. It may have been deleted or the ID is incorrect.');
    } else if (error.message.includes('TWITTER_BEARER_TOKEN')) {
      console.error('\nTo use this script, you need to:');
      console.error('1. Copy scripts/.env.example to scripts/.env');
      console.error('2. Add your Twitter API Bearer Token to the .env file');
      console.error('3. Get credentials from: https://developer.twitter.com/en/portal/dashboard');
    }

    process.exit(1);
  }
}

main();
