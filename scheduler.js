// Background cron worker daemon for Dome Social Media Hub

import cron from 'node-cron';
import { getDueScheduledPosts, updatePost, getAccountTokensForDept } from './db.js';

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
      console.log(`Scheduler: Processing publication for post "${post.id}"...`);
      
      // Fetch connections configuration for the post's department
      const tokens = await getAccountTokensForDept(post.departmentId);
      
      // Staggered delay (1.5s prevents concurrent network requests and respects breaker protections)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Loop through each target platform and run real or mock publishing
      for (const platform of post.platforms) {
        const tokenInfo = tokens.find(t => t.platform === platform);
        
        if (tokenInfo && tokenInfo.accessToken && !tokenInfo.accessToken.startsWith('mock_')) {
          console.log(`Scheduler: [LIVE] Publishing to ${platform} (handle: ${tokenInfo.handle})...`);
          
          try {
            if (platform === 'facebook') {
              // Direct HTTP POST to Facebook Graph API
              let url = `https://graph.facebook.com/v18.0/${tokenInfo.handle}/feed`;
              let body = { message: post.content, access_token: tokenInfo.accessToken };
              
              if (post.mediaUrl) {
                // If image attachment is present, post to /photos
                url = `https://graph.facebook.com/v18.0/${tokenInfo.handle}/photos`;
                body = { url: post.mediaUrl, caption: post.content, access_token: tokenInfo.accessToken };
              }
              
              const fbRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              
              const fbJson = await fbRes.json();
              if (!fbRes.ok) {
                throw new Error(fbJson.error?.message || 'Facebook API returned error status');
              }
              
              console.log(`Scheduler: [LIVE SUCCESS] Posted to Facebook! Post ID: ${fbJson.id || fbJson.post_id}`);
            } else {
              console.log(`Scheduler: Live posting not yet mapped for platform ${platform}. Simulating success.`);
            }
          } catch (apiErr) {
            console.error(`Scheduler: [LIVE ERROR] Publishing failed for ${platform}:`, apiErr.message);
          }
        } else {
          // Simulated/Mock publish
          console.log(`Scheduler: [SIMULATED] Posted successfully to ${platform}.`);
        }
      }

      // Generate randomized mock analytics engagement metrics
      const mockMetrics = {
        impressions: Math.floor(Math.random() * 5500) + 1200,
        engagements: Math.floor(Math.random() * 950) + 100,
        clicks: Math.floor(Math.random() * 250) + 20,
        shares: Math.floor(Math.random() * 45)
      };

      // Mark post published in database
      await updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        metrics: mockMetrics
      });

      console.log(`Scheduler: Completed publication queue for post "${post.id}".`);
    }
  } catch (err) {
    console.error('Scheduler: Error during check run:', err);
  }
});
