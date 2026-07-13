// Mock Data for Dome Social Media Hub (Customized Departments with All Platform Options)

export const DEPARTMENTS = [
  { id: 'namibia', name: 'Dome Namibia', icon: '' },
  { id: 'gym', name: 'Dome Gym', icon: '' },
  { id: 'cycling', name: 'Dome Indoor Cycling Studio', icon: '' },
  { id: 'hotel', name: 'Dome Hotel', icon: '' },
  { id: 'kinderzone', name: 'Kinderzone', icon: '' },
  { id: 'pitstop', name: 'Pitstop Sports Lounge', icon: '' }
];

export const SOCIAL_ACCOUNTS = [
  // Dome Namibia
  { id: 'nam-fb', departmentId: 'namibia', platform: 'facebook', name: 'Dome Namibia', handle: 'domenamibia', avatar: 'DN', connected: true },
  { id: 'nam-ig', departmentId: 'namibia', platform: 'instagram', name: 'Dome Namibia', handle: '@domenamibia', avatar: 'DN', connected: true },
  { id: 'nam-go', departmentId: 'namibia', platform: 'google', name: 'The Dome Complex Namibia', handle: 'Google Business Profile', avatar: 'DN', connected: true },
  { id: 'nam-li', departmentId: 'namibia', platform: 'linkedin', name: 'The Dome Namibia', handle: 'company/thedomenamibia', avatar: 'DN', connected: true },

  // Dome Gym
  { id: 'gym-fb', departmentId: 'gym', platform: 'facebook', name: 'Dome Gym', handle: 'domegym', avatar: 'DG', connected: true },
  { id: 'gym-ig', departmentId: 'gym', platform: 'instagram', name: 'Dome Gym & Fitness', handle: '@domegym', avatar: 'DG', connected: true },
  { id: 'gym-go', departmentId: 'gym', platform: 'google', name: 'Dome Gym', handle: 'Google Business Profile', avatar: 'DG', connected: false },
  { id: 'gym-li', departmentId: 'gym', platform: 'linkedin', name: 'Dome Gym', handle: 'company/domegym', avatar: 'DG', connected: false },

  // Dome Indoor Cycling Studio
  { id: 'cyc-fb', departmentId: 'cycling', platform: 'facebook', name: 'Dome Indoor Cycling Studio', handle: 'domecycling', avatar: 'DC', connected: true },
  { id: 'cyc-ig', departmentId: 'cycling', platform: 'instagram', name: 'Dome Indoor Cycling', handle: '@domecycling', avatar: 'DC', connected: false },
  { id: 'cyc-go', departmentId: 'cycling', platform: 'google', name: 'Dome Indoor Cycling', handle: 'Google Business Profile', avatar: 'DC', connected: false },
  { id: 'cyc-li', departmentId: 'cycling', platform: 'linkedin', name: 'Dome Indoor Cycling', handle: 'company/domecycling', avatar: 'DC', connected: false },

  // Dome Hotel
  { id: 'hot-fb', departmentId: 'hotel', platform: 'facebook', name: 'Dome Hotel Namibia', handle: 'domehotel', avatar: 'DH', connected: true },
  { id: 'hot-ig', departmentId: 'hotel', platform: 'instagram', name: 'Dome Hotel', handle: '@domehotel', avatar: 'DH', connected: false },
  { id: 'hot-go', departmentId: 'hotel', platform: 'google', name: 'Dome Hotel', handle: 'Google Business Profile', avatar: 'DH', connected: false },
  { id: 'hot-li', departmentId: 'hotel', platform: 'linkedin', name: 'Dome Hotel', handle: 'company/domehotel', avatar: 'DH', connected: false },

  // Kinderzone
  { id: 'kin-fb', departmentId: 'kinderzone', platform: 'facebook', name: 'Kinderzone at Dome', handle: 'kinderzonedome', avatar: 'KZ', connected: true },
  { id: 'kin-ig', departmentId: 'kinderzone', platform: 'instagram', name: 'Kinderzone', handle: '@kinderzonedome', avatar: 'KZ', connected: false },
  { id: 'kin-go', departmentId: 'kinderzone', platform: 'google', name: 'Kinderzone', handle: 'Google Business Profile', avatar: 'KZ', connected: false },
  { id: 'kin-li', departmentId: 'kinderzone', platform: 'linkedin', name: 'Kinderzone', handle: 'company/kinderzonedome', avatar: 'KZ', connected: false },

  // Pitstop Sports Lounge
  { id: 'pit-fb', departmentId: 'pitstop', platform: 'facebook', name: 'Pitstop Sports Lounge', handle: 'pitstoplounge', avatar: 'PS', connected: true },
  { id: 'pit-ig', departmentId: 'pitstop', platform: 'instagram', name: 'Pitstop Sports Lounge', handle: '@pitstopsportslounge', avatar: 'PS', connected: false },
  { id: 'pit-go', departmentId: 'pitstop', platform: 'google', name: 'Pitstop Sports Lounge', handle: 'Google Business Profile', avatar: 'PS', connected: true },
  { id: 'pit-li', departmentId: 'pitstop', platform: 'linkedin', name: 'Pitstop Sports Lounge', handle: 'company/pitstoplounge', avatar: 'PS', connected: false }
];

// Helper to generate dynamic dates relative to today
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days, hours = 12) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

export const INITIAL_POSTS = [];

// Historical analytics logs
export const ANALYTICS_DATA = {
  namibia: {
    overview: { impressions: 145320, engagementRate: 15.4, clicks: 7120, followersAdded: 1240 },
    platforms: {
      facebook: { reach: 68000, engagement: 8200, clicks: 3100 },
      instagram: { reach: 52000, engagement: 7100, clicks: 2100 },
      linkedin: { reach: 18320, engagement: 2100, clicks: 1420 },
      google: { reach: 7000, engagement: 0, clicks: 500 }
    },
    history: [
      { date: 'Week 1', fb: 14500, ig: 11200, li: 3500, go: 1100 },
      { date: 'Week 2', fb: 16200, ig: 12500, li: 4100, go: 1300 },
      { date: 'Week 3', fb: 18900, ig: 13100, li: 4800, go: 2100 },
      { date: 'Week 4', fb: 18400, ig: 15200, li: 5920, go: 2500 }
    ]
  },
  gym: {
    overview: { impressions: 58100, engagementRate: 12.2, clicks: 2980, followersAdded: 580 },
    platforms: {
      facebook: { reach: 31000, engagement: 3400, clicks: 1700 },
      instagram: { reach: 24200, engagement: 2900, clicks: 1100 },
      google: { reach: 2900, engagement: 0, clicks: 180 },
      linkedin: { reach: 0, engagement: 0, clicks: 0 }
    },
    history: [
      { date: 'Week 1', fb: 6800, ig: 5100, li: 0, go: 400 },
      { date: 'Week 2', fb: 7200, ig: 5500, li: 0, go: 450 },
      { date: 'Week 3', fb: 8100, ig: 6600, li: 0, go: 420 },
      { date: 'Week 4', fb: 8900, ig: 7000, li: 0, go: 510 }
    ]
  },
  cycling: {
    overview: { impressions: 12400, engagementRate: 9.8, clicks: 820, followersAdded: 140 },
    platforms: {
      facebook: { reach: 12400, engagement: 1200, clicks: 820 },
      instagram: { reach: 0, engagement: 0, clicks: 0 },
      google: { reach: 0, engagement: 0, clicks: 0 },
      linkedin: { reach: 0, engagement: 0, clicks: 0 }
    },
    history: [
      { date: 'Week 1', fb: 2800, ig: 0, li: 0, go: 0 },
      { date: 'Week 2', fb: 3000, ig: 0, li: 0, go: 0 },
      { date: 'Week 3', fb: 3100, ig: 0, li: 0, go: 0 },
      { date: 'Week 4', fb: 3500, ig: 0, li: 0, go: 0 }
    ]
  },
  hotel: {
    overview: { impressions: 38400, engagementRate: 11.5, clicks: 1850, followersAdded: 290 },
    platforms: {
      facebook: { reach: 38400, engagement: 4400, clicks: 1850 },
      instagram: { reach: 0, engagement: 0, clicks: 0 },
      google: { reach: 0, engagement: 0, clicks: 0 },
      linkedin: { reach: 0, engagement: 0, clicks: 0 }
    },
    history: [
      { date: 'Week 1', fb: 8500, ig: 0, li: 0, go: 0 },
      { date: 'Week 2', fb: 9100, ig: 0, li: 0, go: 0 },
      { date: 'Week 3', fb: 9900, ig: 0, li: 0, go: 0 },
      { date: 'Week 4', fb: 10900, ig: 0, li: 0, go: 0 }
    ]
  },
  kinderzone: {
    overview: { impressions: 21900, engagementRate: 14.1, clicks: 1120, followersAdded: 310 },
    platforms: {
      facebook: { reach: 21900, engagement: 3100, clicks: 1120 },
      instagram: { reach: 0, engagement: 0, clicks: 0 },
      google: { reach: 0, engagement: 0, clicks: 0 },
      linkedin: { reach: 0, engagement: 0, opacity: 0 }
    },
    history: [
      { date: 'Week 1', fb: 4900, ig: 0, li: 0, go: 0 },
      { date: 'Week 2', fb: 5200, ig: 0, li: 0, go: 0 },
      { date: 'Week 3', fb: 5600, ig: 0, li: 0, go: 0 },
      { date: 'Week 4', fb: 6200, ig: 0, li: 0, go: 0 }
    ]
  },
  pitstop: {
    overview: { impressions: 48900, engagementRate: 15.2, clicks: 2890, followersAdded: 480 },
    platforms: {
      facebook: { reach: 24000, engagement: 3600, clicks: 1400 },
      instagram: { reach: 20000, engagement: 3200, clicks: 1100 },
      google: { reach: 4900, engagement: 0, clicks: 390 },
      linkedin: { reach: 0, engagement: 0, clicks: 0 }
    },
    history: [
      { date: 'Week 1', fb: 5100, ig: 4500, li: 0, go: 900 },
      { date: 'Week 2', fb: 5800, ig: 4900, li: 0, go: 1000 },
      { date: 'Week 3', fb: 6200, ig: 5100, li: 0, go: 1200 },
      { date: 'Week 4', fb: 6900, ig: 5500, li: 0, go: 1800 }
    ]
  }
};
