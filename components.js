// Components Render Engines for Dome Social Media Hub

// 1. LIVE PREVIEWS COMPONENT
export function updatePlatformPreview(platform, text, mediaUrl, accounts) {
  // Find account name and handle
  const activeAccount = accounts.find(a => a.platform === platform && a.connected) || {
    name: `The Dome ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
    handle: `@dome${platform}`,
    avatar: 'TD'
  };

  const displayText = text.trim() || "Write text content on the left to see the live feed mockup.";
  const hasMedia = !!mediaUrl;

  switch (platform) {
    case 'facebook':
      document.getElementById('fbAccountName').textContent = activeAccount.name;
      document.getElementById('fbAvatarText').textContent = activeAccount.avatar;
      
      const fbContent = document.getElementById('fbContentText');
      fbContent.innerHTML = formatPostText(displayText);
      
      const fbMediaContainer = document.getElementById('fbMediaContainer');
      const fbMediaImg = document.getElementById('fbMediaImg');
      if (hasMedia) {
        fbMediaImg.src = mediaUrl;
        fbMediaContainer.style.display = 'block';
      } else {
        fbMediaContainer.style.display = 'none';
      }
      break;

    case 'instagram':
      document.getElementById('igAccountHandle').textContent = activeAccount.handle;
      document.getElementById('igAccountHandleCaption').textContent = activeAccount.handle;
      document.getElementById('igAvatarText').textContent = activeAccount.avatar;
      
      const igContent = document.getElementById('igContentText');
      igContent.innerHTML = formatPostText(displayText);
      
      const igMediaContainer = document.getElementById('igMediaContainer');
      const igMediaImg = document.getElementById('igMediaImg');
      if (hasMedia) {
        igMediaImg.src = mediaUrl;
        igMediaContainer.style.display = 'block';
      } else {
        // Instagram requires media
        igMediaImg.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
        igMediaContainer.style.display = 'block';
      }
      break;

    case 'linkedin':
      document.getElementById('liAccountName').textContent = activeAccount.name;
      document.getElementById('liAvatarText').textContent = activeAccount.avatar;
      document.getElementById('liAccountFollowers').textContent = platform === 'linkedin' ? '14,210 followers' : '10,000 followers';
      
      const liContent = document.getElementById('liContentText');
      liContent.innerHTML = formatPostText(displayText);
      
      const liMediaContainer = document.getElementById('liMediaContainer');
      const liMediaImg = document.getElementById('liMediaImg');
      if (hasMedia) {
        liMediaImg.src = mediaUrl;
        liMediaContainer.style.display = 'block';
      } else {
        liMediaContainer.style.display = 'none';
      }
      break;

    case 'google':
      document.getElementById('goAccountName').textContent = activeAccount.name;
      
      const goContent = document.getElementById('goContentText');
      goContent.innerHTML = formatPostText(displayText);
      
      const goMediaContainer = document.getElementById('goMediaContainer');
      const goMediaImg = document.getElementById('goMediaImg');
      if (hasMedia) {
        goMediaImg.src = mediaUrl;
        goMediaContainer.style.display = 'block';
      } else {
        goMediaContainer.style.display = 'none';
      }
      break;
  }
}

// Format hashtags and links for realistic preview display
function formatPostText(text) {
  if (!text) return '';
  // Escape html
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight hashtags
  escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: var(--fb-color); cursor: pointer;">$1</span>');
  
  // Highlight user tags
  escaped = escaped.replace(/(@[a-zA-Z0-9_.]+)/g, '<span style="color: var(--fb-color); cursor: pointer;">$1</span>');
  
  // Convert newlines to breaktags
  return escaped.replace(/\n/g, '<br>');
}


// 2. CONTENT CALENDAR COMPONENT
export function renderCalendar(containerId, currentDate, posts, handlers) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Header month-year string
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

  // First day of month (0 = Sunday, 1 = Monday...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Total days in previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const totalCells = 42; // 6 rows of 7 days
  
  // Array of day objects to render
  const daysArray = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      dayNumber: prevMonthTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthTotalDays - i)
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      dayNumber: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month padding days
  const remainingCells = totalCells - daysArray.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysArray.push({
      dayNumber: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const today = new Date();

  // Render cells
  daysArray.forEach(cell => {
    const cellEl = document.createElement('div');
    cellEl.className = 'calendar-day-cell';
    if (!cell.isCurrentMonth) cellEl.className += ' outside-month';
    
    // Check if cell represents today
    if (cell.date.getDate() === today.getDate() && 
        cell.date.getMonth() === today.getMonth() && 
        cell.date.getFullYear() === today.getFullYear()) {
      cellEl.className += ' today';
    }

    // Day number element
    const numEl = document.createElement('span');
    numEl.className = 'day-number';
    numEl.textContent = cell.dayNumber;
    cellEl.appendChild(numEl);

    // Event container inside cell
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-events-container';
    
    // Set up drag and drop listeners on cell
    const dateStr = cell.date.toDateString();
    cellEl.setAttribute('data-date', cell.date.toISOString());
    
    cellEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      cellEl.style.background = 'rgba(245, 130, 31, 0.1)';
    });

    cellEl.addEventListener('dragleave', () => {
      cellEl.style.background = '';
    });

    cellEl.addEventListener('drop', (e) => {
      e.preventDefault();
      cellEl.style.background = '';
      const postId = e.dataTransfer.getData('text/plain');
      const targetDateIso = cellEl.getAttribute('data-date');
      if (handlers.onPostDropped) {
        handlers.onPostDropped(postId, targetDateIso);
      }
    });

    // Filter posts for this specific day
    const dayPosts = posts.filter(post => {
      if (post.status !== 'scheduled' || !post.scheduledDate) return false;
      const schedDate = new Date(post.scheduledDate);
      return schedDate.getDate() === cell.date.getDate() &&
             schedDate.getMonth() === cell.date.getMonth() &&
             schedDate.getFullYear() === cell.date.getFullYear();
    });

    // Render post items inside cell
    dayPosts.forEach(post => {
      const pill = document.createElement('div');
      pill.className = 'calendar-event-pill';
      pill.draggable = true;
      pill.setAttribute('data-post-id', post.id);

      // Short preview text
      const shortText = post.content ? post.content.substring(0, 18) + (post.content.length > 18 ? '...' : '') : 'Media Post';
      
      const label = document.createElement('span');
      label.textContent = shortText;
      pill.appendChild(label);

      // Platform dots indicators
      const dots = document.createElement('div');
      dots.className = 'calendar-event-platforms';
      
      post.platforms.forEach(plat => {
        const dot = document.createElement('span');
        dot.className = `calendar-platform-dot ${plat}`;
        dots.appendChild(dot);
      });
      pill.appendChild(dots);

      // Event handlers for drag & drop
      pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        pill.style.opacity = '0.5';
      });

      pill.addEventListener('dragend', () => {
        pill.style.opacity = '';
      });

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        if (handlers.onPostClicked) {
          handlers.onPostClicked(post);
        }
      });

      eventsContainer.appendChild(pill);
    });

    cellEl.appendChild(eventsContainer);
    container.appendChild(cellEl);
  });
}


// 3. ANALYTICS CHARTS COMPONENT
export function renderAnalytics(overviewGridId, chartBarsId, platformListId, data) {
  // A. Render Overview Cards
  const grid = document.getElementById(overviewGridId);
  if (grid) {
    grid.innerHTML = `
      <div class="glass-panel stat-card">
        <div class="stat-header">
          <span class="stat-title">Aggregated Impressions</span>
          <span style="font-size: 1.1rem;">👁️</span>
        </div>
        <div class="stat-value">${formatNumber(data.overview.impressions)}</div>
        <div class="stat-trend positive">▲ 12.4% <span style="color:var(--text-muted); font-size:0.7rem; font-weight:normal;">vs last month</span></div>
      </div>
      
      <div class="glass-panel stat-card">
        <div class="stat-header">
          <span class="stat-title">Avg Engagement Rate</span>
          <span style="font-size: 1.1rem;">🔥</span>
        </div>
        <div class="stat-value">${data.overview.engagementRate}%</div>
        <div class="stat-trend positive">▲ 0.8% <span style="color:var(--text-muted); font-size:0.7rem; font-weight:normal;">vs last month</span></div>
      </div>

      <div class="glass-panel stat-card">
        <div class="stat-header">
          <span class="stat-title">Link Clicks</span>
          <span style="font-size: 1.1rem;">🖱️</span>
        </div>
        <div class="stat-value">${formatNumber(data.overview.clicks)}</div>
        <div class="stat-trend positive">▲ 8.1% <span style="color:var(--text-muted); font-size:0.7rem; font-weight:normal;">vs last month</span></div>
      </div>

      <div class="glass-panel stat-card">
        <div class="stat-header">
          <span class="stat-title">New Followers</span>
          <span style="font-size: 1.1rem;">📈</span>
        </div>
        <div class="stat-value">+${data.overview.followersAdded}</div>
        <div class="stat-trend positive">▲ 15.2% <span style="color:var(--text-muted); font-size:0.7rem; font-weight:normal;">vs last month</span></div>
      </div>
    `;
  }

  // B. Render Stacked Bar Chart
  const chartContainer = document.getElementById(chartBarsId);
  if (chartContainer) {
    chartContainer.innerHTML = '';
    
    // Find maximum sum of reach in any week to calibrate percentages
    const sums = data.history.map(w => (w.fb || 0) + (w.ig || 0) + (w.li || 0) + (w.go || 0));
    const maxSum = Math.max(...sums, 1); // Avoid division by zero

    data.history.forEach(week => {
      const barGroup = document.createElement('div');
      barGroup.className = 'chart-bar-group';

      const stack = document.createElement('div');
      stack.className = 'bar-multi-stack';

      // Facebook Bar
      if (week.fb !== undefined) {
        const fbFill = document.createElement('div');
        fbFill.className = 'chart-bar-fill facebook';
        const height = (week.fb / maxSum) * 100;
        fbFill.style.height = `${height}%`;
        fbFill.innerHTML = `<span class="bar-tooltip">Facebook: ${formatNumber(week.fb)} Reach</span>`;
        stack.appendChild(fbFill);
      }

      // Instagram Bar
      if (week.ig !== undefined) {
        const igFill = document.createElement('div');
        igFill.className = 'chart-bar-fill instagram';
        const height = (week.ig / maxSum) * 100;
        igFill.style.height = `${height}%`;
        igFill.innerHTML = `<span class="bar-tooltip">Instagram: ${formatNumber(week.ig)} Reach</span>`;
        stack.appendChild(igFill);
      }

      // LinkedIn Bar
      if (week.li !== undefined) {
        const liFill = document.createElement('div');
        liFill.className = 'chart-bar-fill linkedin';
        const height = (week.li / maxSum) * 100;
        liFill.style.height = `${height}%`;
        liFill.innerHTML = `<span class="bar-tooltip">LinkedIn: ${formatNumber(week.li)} Reach</span>`;
        stack.appendChild(liFill);
      }

      // Google Bar
      if (week.go !== undefined) {
        const goFill = document.createElement('div');
        goFill.className = 'chart-bar-fill google';
        const height = (week.go / maxSum) * 100;
        goFill.style.height = `${height}%`;
        goFill.innerHTML = `<span class="bar-tooltip">Google Search: ${formatNumber(week.go)} views</span>`;
        stack.appendChild(goFill);
      }

      barGroup.appendChild(stack);

      const label = document.createElement('span');
      label.className = 'chart-x-label';
      label.textContent = week.date;
      barGroup.appendChild(label);

      chartContainer.appendChild(barGroup);
    });
  }

  // C. Render Platform breakdowns List
  const breakdownList = document.getElementById(platformListId);
  if (breakdownList) {
    breakdownList.innerHTML = '';
    
    const platforms = [
      { key: 'facebook', name: 'Facebook', icon: 'FB', color: 'facebook' },
      { key: 'instagram', name: 'Instagram', icon: 'IG', color: 'instagram' },
      { key: 'linkedin', name: 'LinkedIn', icon: 'LI', color: 'linkedin' },
      { key: 'google', name: 'Google Business', icon: 'GO', color: 'google' }
    ];

    platforms.forEach(plat => {
      const platData = data.platforms[plat.key] || { reach: 0, engagement: 0, clicks: 0 };
      
      const card = document.createElement('div');
      card.className = 'platform-breakdown-card';
      
      card.innerHTML = `
        <div class="platform-breakdown-info">
          <div class="platform-icon-circle ${plat.color}">
            <span style="font-weight: 700; font-size: 0.8rem;">${plat.icon}</span>
          </div>
          <div>
            <div class="platform-perf-name">${plat.name}</div>
            <div class="platform-perf-reach">${formatNumber(platData.reach)} Reach</div>
          </div>
        </div>
        <div class="platform-breakdown-stats">
          <div class="platform-breakdown-stat-col">
            <span class="perf-label">Engagements</span>
            <span class="perf-val">${formatNumber(platData.engagement)}</span>
          </div>
          <div class="platform-breakdown-stat-col">
            <span class="perf-label">Clicks</span>
            <span class="perf-val">${formatNumber(platData.clicks)}</span>
          </div>
        </div>
      `;
      breakdownList.appendChild(card);
    });
  }
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num;
}


// 4. POST LIST & QUEUE ENGINE
export function renderPostQueue(containerId, posts, accounts, activeDeptId, currentFilter, handlers) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Filter posts by department
  let filteredPosts = posts.filter(post => post.departmentId === activeDeptId);

  // Filter posts by status tab
  if (currentFilter !== 'all') {
    filteredPosts = filteredPosts.filter(post => post.status === currentFilter);
  }

  // Sort: Scheduled posts first (soonest first), then published (newest first), then drafts
  filteredPosts.sort((a, b) => {
    if (a.status === 'scheduled' && b.status === 'scheduled') {
      return new Date(a.scheduledDate) - new Date(b.scheduledDate);
    }
    if (a.status === 'published' && b.status === 'published') {
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    }
    // Pull drafts to the bottom
    if (a.status === 'draft') return 1;
    if (b.status === 'draft') return -1;
    return 0;
  });

  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="no-posts-state">
        <span style="font-size: 2rem; display:block; margin-bottom:10px;">📭</span>
        No posts found for this selection. Create a new post above!
      </div>
    `;
    return;
  }

  filteredPosts.forEach(post => {
    const row = document.createElement('div');
    row.className = 'post-item-row';

    // A. Media thumbnail
    const mediaCol = document.createElement('div');
    mediaCol.className = 'post-item-media';
    if (post.mediaUrl) {
      const img = document.createElement('img');
      img.src = post.mediaUrl;
      img.alt = 'Attachment';
      mediaCol.appendChild(img);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'post-item-media-placeholder';
      placeholder.textContent = '📝';
      mediaCol.appendChild(placeholder);
    }
    row.appendChild(mediaCol);

    // B. Post Info & Platforms
    const infoCol = document.createElement('div');
    infoCol.className = 'post-item-content';
    
    const textPreview = document.createElement('div');
    textPreview.className = 'post-item-text';
    textPreview.textContent = post.content || '(No text content)';
    infoCol.appendChild(textPreview);

    const targetChips = document.createElement('div');
    targetChips.className = 'post-item-targets';
    
    post.platforms.forEach(plat => {
      const badge = document.createElement('span');
      badge.className = `platform-badge-mini ${plat}`;
      badge.textContent = plat.charAt(0).toUpperCase();
      badge.style.width = '18px';
      badge.style.height = '18px';
      badge.style.fontSize = '0.6rem';
      targetChips.appendChild(badge);
    });
    infoCol.appendChild(targetChips);
    row.appendChild(infoCol);

    // C. Scheduling / Status Meta
    const metaCol = document.createElement('div');
    metaCol.className = 'post-item-meta';
    
    const badgeSpan = document.createElement('span');
    badgeSpan.className = `status-badge ${post.status}`;
    badgeSpan.textContent = post.status;
    
    if (post.status === 'failed' && post.errorDetails) {
      try {
        const errorDetails = JSON.parse(post.errorDetails);
        let errText = 'Publication Errors:';
        for (const [plat, msg] of Object.entries(errorDetails)) {
          errText += `\n• ${plat.toUpperCase()}: ${msg}`;
        }
        badgeSpan.title = errText;
        badgeSpan.style.cursor = 'help';
        badgeSpan.style.textDecoration = 'underline dotted';
      } catch (e) {}
    }
    
    metaCol.appendChild(badgeSpan);

    const timeDetail = document.createElement('span');
    timeDetail.className = 'meta-value';
    if (post.status === 'scheduled') {
      const sDate = new Date(post.scheduledDate);
      timeDetail.textContent = sDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else if (post.status === 'published') {
      const pDate = new Date(post.publishedAt || post.createdAt);
      timeDetail.textContent = pDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
      timeDetail.textContent = 'Draft';
      timeDetail.style.color = 'var(--text-muted)';
    }
    metaCol.appendChild(timeDetail);
    row.appendChild(metaCol);

    // D. Action Buttons
    const actionsCol = document.createElement('div');
    actionsCol.className = 'post-item-actions';

    // Edit button (only for drafts and scheduled)
    if (post.status !== 'published') {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit Post';
      editBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      `;
      editBtn.addEventListener('click', () => {
        if (handlers.onEdit) handlers.onEdit(post);
      });
      actionsCol.appendChild(editBtn);
    }

    // Publish Now button (only for scheduled or draft)
    if (post.status !== 'published') {
      const pubBtn = document.createElement('button');
      pubBtn.className = 'btn-icon publish';
      pubBtn.title = 'Publish Instantly';
      pubBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 2 11 13 22 2"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      `;
      pubBtn.addEventListener('click', () => {
        if (handlers.onPublishNow) handlers.onPublishNow(post.id);
      });
      actionsCol.appendChild(pubBtn);
    }

    // Delete button (always available)
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon delete';
    delBtn.title = 'Delete Post';
    delBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;
    delBtn.addEventListener('click', () => {
      if (handlers.onDelete) handlers.onDelete(post.id);
    });
    actionsCol.appendChild(delBtn);

    row.appendChild(actionsCol);
    container.appendChild(row);
  });
}
