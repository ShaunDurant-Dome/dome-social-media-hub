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
            
            } else if (platform === 'google') {
              // Direct HTTP POST to Google Business Profile API
              let accessToken = tokenInfo.accessToken;
              
              // If OAuth credentials are set in environment, exchange refresh token for temporary access token
              if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
                try {
                  const oauthRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      client_id: process.env.GOOGLE_CLIENT_ID,
                      client_secret: process.env.GOOGLE_CLIENT_SECRET,
                      refresh_token: tokenInfo.accessToken,
                      grant_type: 'refresh_token'
                    })
                  });
                  const oauthJson = await oauthRes.json();
                  if (oauthJson.access_token) {
                    accessToken = oauthJson.access_token;
                    console.log('Scheduler: Swapped Google Refresh Token for active Access Token.');
                  }
                } catch (e) {
                  console.error('Scheduler: Google Token Refresh failed, attempting direct authentication:', e.message);
                }
              }
              
              // Google Local Posts endpoint
              // Handle format expected: accounts/{accountId}/locations/{locationId}
              const locationPath = tokenInfo.handle.startsWith('accounts/') ? tokenInfo.handle : `accounts/self/locations/${tokenInfo.handle}`;
              const url = `https://mybusiness.googleapis.com/v4/${locationPath}/localPosts`;
              
              const body = {
                summary: post.content,
                topicType: 'STANDARD'
              };
              
              if (post.mediaUrl) {
                body.media = [{
                  mediaFormat: 'PHOTO',
                  sourceUrl: post.mediaUrl
                }];
              }
              
              const googleRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(body)
              });
              
              const googleJson = await googleRes.json();
              if (!googleRes.ok) {
                throw new Error(googleJson.error?.message || 'Google My Business API returned error status');
              }
              
              console.log(`Scheduler: [LIVE SUCCESS] Posted to Google Business Profile! Post ID: ${googleJson.name}`);
            
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
