// Background cron worker daemon for Dome Social Media Hub

import cron from 'node-cron';
import { getDueScheduledPosts, updatePost } from './db.js';

console.log('Scheduler: Background publication monitor started.');

// Run cron check every minute
cron.schedule('* * * * *', async () => {
  console.log('Scheduler: Checking for due posts...');
  
  try {
    const duePosts = await getDueScheduledPosts();
    
    if (duePosts.length === 0) {
      return;
    }
    
    console.log(`Scheduler: Found ${duePosts.length} post(s) due for publishing.`);

    for (const post of duePosts) {
      console.log(`Scheduler: Publishing post "${post.id}" to [${post.platforms.join(', ')}]...`);
      
      // Simulate API network latency (1.5s write delay aligns with staggering breaker standards)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate randomized mock analytics engagement metrics
      const mockMetrics = {
        impressions: Math.floor(Math.random() * 5500) + 1200,
        engagements: Math.floor(Math.random() * 950) + 100,
        clicks: Math.floor(Math.random() * 250) + 20,
        shares: Math.floor(Math.random() * 45)
      };

      // Update database record
      await updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        metrics: mockMetrics
      });

      console.log(`Scheduler: Successfully published post "${post.id}" on all selected channels.`);
    }
  } catch (err) {
    console.error('Scheduler: Error during check run:', err);
  }
});
