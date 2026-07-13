// Client-Side Application Controller for Dome Social Media Hub

import { 
  updatePlatformPreview, 
  renderCalendar, 
  renderAnalytics, 
  renderPostQueue 
} from './components.js';

// --- STATE MANAGEMENT ---
let state = {
  departments: [],
  accounts: [],
  posts: [],
  analytics: null,
  
  // Navigation & View Filters
  activeDeptId: '',
  activeTab: 'composer',
  currentFilter: 'all',
  currentCalendarDate: new Date(),
  
  // Composer Form Temp State
  selectedPlatforms: [],
  selectedMediaUrl: '',
  editingPostId: null,

  // Authentication State
  currentUser: null,
  users: []
};

// Preset images for media gallery
const MEDIA_PRESETS = [
  { id: 'img-1', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', label: 'Event' },
  { id: 'img-2', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80', label: 'Dining' },
  { id: 'img-3', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', label: 'Fitness' },
  { id: 'img-4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80', label: 'Office' },
  { id: 'img-5', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', label: 'Bar' },
  { id: 'img-6', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', label: 'Concert' }
];

// --- API WRAPPER CLIENT ---
async function request(url, method = 'GET', data = null) {
  try {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, config);
    
    // Auto logout if session token cookie is rejected
    if (response.status === 401 && !url.includes('/api/auth/session')) {
      logoutUser(false); // Logout silently without sending another API call
      throw new Error('Session expired. Please log in again.');
    }
    
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Server request failed');
    }
    
    return resData;
  } catch (err) {
    if (err.message !== 'Session expired. Please log in again.') {
      showToast(err.message, 'error');
    }
    throw err;
  }
}

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  setupEventListeners();
  startWebSchedulerPolling();
});

// Restore active session
async function restoreSession() {
  try {
    const session = await request('/api/auth/session');
    if (session.loggedIn) {
      state.currentUser = session;
      document.getElementById('loginOverlay').classList.remove('active');
      
      // Load departments
      state.departments = await request('/api/departments');
      
      initUI();
      
      // Select default department
      state.activeDeptId = state.currentUser.allowedDepts[0];
      await selectDepartment(state.activeDeptId);
    } else {
      showLoginOverlay();
    }
  } catch (e) {
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  state.currentUser = null;
  document.getElementById('loginOverlay').classList.add('active');
}

// --- UI CONSTRUCTORS ---
function initUI() {
  // Render departments dropdown items
  const deptList = document.getElementById('deptDropdownList');
  deptList.innerHTML = '';
  
  state.departments.forEach(dept => {
    const item = document.createElement('div');
    item.className = 'dept-dropdown-item';
    item.innerHTML = `${dept.name}`;
    item.addEventListener('click', () => {
      selectDepartment(dept.id);
      deptList.classList.remove('active');
    });
    deptList.appendChild(item);
  });

  // Render presets gallery
  const gallery = document.getElementById('mediaPresetGallery');
  gallery.innerHTML = '';
  
  MEDIA_PRESETS.forEach(preset => {
    const thumb = document.createElement('div');
    thumb.className = 'media-thumb';
    thumb.setAttribute('data-url', preset.url);
    thumb.innerHTML = `<img src="${preset.url}" alt="${preset.label}">`;
    thumb.addEventListener('click', () => selectMediaPreset(preset.url, thumb));
    gallery.appendChild(thumb);
  });

  // Default dates in composer
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('postDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('postTime').value = "12:00";
}

// --- CONTROLLERS & ACTIONS ---
async function selectDepartment(deptId) {
  state.activeDeptId = deptId;
  const dept = state.departments.find(d => d.id === deptId);
  if (!dept) return;

  // Update Dropdown Text
  document.getElementById('activeDeptText').textContent = `${dept.name}`;
  
  // Clear composer platform selections
  state.selectedPlatforms = [];
  
  // Render views
  await renderActiveTab();
  
  showToast(`Switched workspace to ${dept.name}`, 'success');
}

function selectMediaPreset(url, element) {
  if (state.selectedMediaUrl === url) {
    clearMedia();
  } else {
    // Toggle on
    state.selectedMediaUrl = url;
    const thumbs = document.querySelectorAll('.media-thumb');
    thumbs.forEach(t => t.classList.remove('selected'));
    element.classList.add('selected');
    
    document.getElementById('mediaUploadBox').style.borderColor = 'var(--orange)';
    document.getElementById('mediaUploadBox').innerHTML = `
      <img src="${url}" style="height: 60px; border-radius: 6px; object-fit: cover; margin-bottom: 5px; display:block; margin: 0 auto 5px auto;">
      <span class="upload-text" style="color:var(--orange); display:block; margin-bottom: 8px;">Media attached successfully</span>
      <button type="button" class="btn btn-secondary" id="removeMediaBtn" style="padding: 4px 10px; font-size: 0.72rem; margin: 0 auto; display: block; border-radius:6px; cursor:pointer;">Remove Image</button>
    `;

    document.getElementById('removeMediaBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      clearMedia();
    });
  }

  updateComposerPreviews();
}

function clearMedia() {
  state.selectedMediaUrl = '';
  const thumbs = document.querySelectorAll('.media-thumb');
  thumbs.forEach(t => t.classList.remove('selected'));
  document.getElementById('mediaUploadBox').style.borderColor = '';
  document.getElementById('mediaUploadBox').innerHTML = `
    <span class="upload-icon">📸</span>
    <span class="upload-text">Click to select an image from the gallery below</span>
    <span class="upload-subtext">Images auto-adjust to platform sizes</span>
  `;
  updateComposerPreviews();
}

// Updates sidebar list of active/inactive platforms
function updateSidebarAccountsList() {
  const list = document.getElementById('sidebarAccountsList');
  list.innerHTML = '';
  
  state.accounts.forEach(acc => {
    const item = document.createElement('div');
    item.className = 'account-status-item';
    
    item.innerHTML = `
      <div class="account-status-info">
        <span class="platform-badge-mini ${acc.platform}">${acc.platform.charAt(0).toUpperCase()}</span>
        <span>${acc.name}</span>
      </div>
      <span class="status-dot ${acc.connected ? 'connected' : 'disconnected'}"></span>
    `;
    list.appendChild(item);
  });
}

// Render available platform buttons in composer card
function renderComposerPlatforms() {
  const container = document.getElementById('composerPlatformGrid');
  container.innerHTML = '';

  state.accounts.forEach(acc => {
    const btn = document.createElement('button');
    btn.className = `platform-btn ${state.selectedPlatforms.includes(acc.platform) ? 'active' : ''} ${acc.platform}`;
    if (!acc.connected) {
      btn.style.opacity = '0.4';
      btn.title = 'Account disconnected. Connect in Settings tab.';
    }

    // Platform SVG code
    let svgPath = '';
    if (acc.platform === 'facebook') {
      svgPath = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>`;
    } else if (acc.platform === 'instagram') {
      svgPath = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
    } else if (acc.platform === 'linkedin') {
      svgPath = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    } else if (acc.platform === 'google') {
      svgPath = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.883-6.437-6.437 0-3.555 2.882-6.437 6.437-6.437 1.487 0 2.846.508 3.924 1.356l3.208-3.208C19.162 2.085 15.827 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.875 0 10.873-4.218 10.873-11.24 0-.763-.08-1.32-.218-1.955H12.24z"/></svg>`;
    }

    btn.innerHTML = `
      ${svgPath}
      <span>${acc.name.split(' ')[1] || acc.name}</span>
    `;

    btn.addEventListener('click', () => {
      if (!acc.connected) {
        showToast(`Please connect the ${acc.platform} channel first!`, 'error');
        switchTab('settings');
        return;
      }
      toggleComposerPlatform(acc.platform);
    });

    container.appendChild(btn);
  });
}

function toggleComposerPlatform(platform) {
  const index = state.selectedPlatforms.indexOf(platform);
  if (index > -1) {
    state.selectedPlatforms.splice(index, 1);
  } else {
    state.selectedPlatforms.push(platform);
  }
  
  renderComposerPlatforms();
  updateComposerPreviews();
}

function updateComposerPreviews() {
  // Adjust preview select tab buttons
  const previewTabBtns = document.querySelectorAll('.preview-tab-btn');
  previewTabBtns.forEach(btn => {
    const plat = btn.getAttribute('data-preview-platform');
    if (state.selectedPlatforms.includes(plat)) {
      btn.style.opacity = '1';
      btn.style.fontWeight = '700';
    } else {
      btn.style.opacity = '0.5';
      btn.style.fontWeight = '400';
    }
  });

  const activePreviewPlat = document.querySelector('.preview-tab-btn.active').getAttribute('data-preview-platform');
  updatePreviewFrame(activePreviewPlat);
}

function updatePreviewFrame(platform) {
  const text = document.getElementById('postText').value;
  const mediaUrl = state.selectedMediaUrl;
  updatePlatformPreview(platform, text, mediaUrl, state.accounts);
}

// Switch tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => {
    if (panel.getAttribute('id') === `tab-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  const heading = document.getElementById('pageHeading');
  const desc = document.getElementById('pageDescription');
  
  if (tabId === 'composer') {
    heading.textContent = "Composer & Live Feed";
    desc.textContent = "Draft and schedule posts across multiple platforms simultaneously.";
  } else if (tabId === 'calendar') {
    heading.textContent = "Content Calendar";
    desc.textContent = "Visualize and coordinate publication scheduling in a monthly layout.";
  } else if (tabId === 'analytics') {
    heading.textContent = "Analytics Reports";
    desc.textContent = "Review engagement and reach performance logs by department.";
  } else if (tabId === 'settings') {
    heading.textContent = "Connected Channels";
    desc.textContent = "Configure user accounts and check local safety buffer configurations.";
  }

  renderActiveTab();
}

async function renderActiveTab() {
  if (!state.currentUser) return;
  
  // 1. Fetch department specific channels first
  state.accounts = await request(`/api/accounts?departmentId=${state.activeDeptId}`);
  updateSidebarAccountsList();

  if (state.activeTab === 'composer') {
    renderComposerPlatforms();
    updateComposerPreviews();
    
    // Fetch posts for active department
    state.posts = await request(`/api/posts?departmentId=${state.activeDeptId}`);
    renderQueue();
  } else if (state.activeTab === 'calendar') {
    state.posts = await request(`/api/posts?departmentId=${state.activeDeptId}`);
    renderCalendarView();
  } else if (state.activeTab === 'analytics') {
    state.analytics = await request(`/api/analytics/${state.activeDeptId}`);
    renderAnalyticsView();
  } else if (state.activeTab === 'settings') {
    renderSettingsView();
  }
}

// --- RENDER IMPLEMENTATIONS ---

function renderQueue() {
  renderPostQueue(
    'postItemsContainer', 
    state.posts, 
    state.accounts, 
    state.activeDeptId, 
    state.currentFilter, 
    {
      onPublishNow: (id) => publishPostInstantly(id),
      onDelete: (id) => deletePost(id),
      onEdit: (post) => loadPostIntoComposer(post)
    }
  );
}

function renderCalendarView() {
  renderCalendar(
    'calendarCellsContainer',
    state.currentCalendarDate,
    state.posts,
    {
      onPostDropped: (postId, targetDateIso) => reschedulePost(postId, targetDateIso),
      onPostClicked: (post) => loadPostIntoComposer(post)
    }
  );
}

function renderAnalyticsView() {
  if (!state.analytics) return;
  renderAnalytics(
    'analyticsOverviewGrid',
    'chartBarsRow',
    'platformBreakdownList',
    state.analytics
  );
}

function renderSettingsView() {
  const container = document.getElementById('settingsAccountsGrid');
  container.innerHTML = '';

  state.accounts.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'connection-card';
    
    card.innerHTML = `
      <div class="connection-info">
        <div class="connection-logo ${acc.platform}">
          <span>${acc.platform.substring(0, 2).toUpperCase()}</span>
        </div>
        <div class="connection-text">
          <span class="connection-title">${acc.name} (${acc.handle})</span>
          <span class="connection-status">
            <span class="status-dot ${acc.connected ? 'connected' : 'disconnected'}"></span>
            ${acc.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <button class="btn ${acc.connected ? 'btn-secondary' : 'btn-primary'}" style="padding: 6px 14px; font-size: 0.8rem;">
        ${acc.connected ? 'Disconnect' : 'Connect API'}
      </button>
    `;

    const button = card.querySelector('button');
    button.addEventListener('click', () => {
      if (acc.connected) {
        disconnectAccount(acc.id);
      } else {
        openOAuthModal(acc);
      }
    });

    container.appendChild(card);
  });

  // Render User Management Card for Admin
  const adminCard = document.getElementById('adminUserManagementCard');
  if (state.currentUser && state.currentUser.role === 'administrator') {
    adminCard.style.display = 'block';
    renderUsersList();
    renderWorkspaceCheckboxes();
  } else {
    adminCard.style.display = 'none';
  }
}

async function renderUsersList() {
  const container = document.getElementById('usersListContainer');
  container.innerHTML = '';

  try {
    state.users = await request('/api/users');
  } catch (e) {
    return;
  }

  state.users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'connection-card';
    card.style.padding = '12px 16px';
    
    const deptNames = user.allowedDepts.map(id => {
      const dept = state.departments.find(d => d.id === id);
      return dept ? dept.name.split(' ')[0] : id;
    }).join(', ');

    card.innerHTML = `
      <div class="connection-info">
        <div class="oauth-avatar-circle" style="width:34px; height:34px; font-size:0.8rem; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--orange); color:#fff; font-weight:bold;">
          ${user.username.substring(0, 2).toUpperCase()}
        </div>
        <div class="connection-text">
          <span class="connection-title" style="font-size:0.88rem; font-weight:700;">${user.username}</span>
          <span style="font-size:0.7rem; color:var(--orange); text-transform:uppercase; font-weight:700; margin-top:2px;">${user.role.replace('_', ' ')}</span>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Workspaces: ${deptNames || 'None'}</span>
        </div>
      </div>
      <button class="btn-icon delete" title="Delete User" ${user.username === 'admin' ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    `;

    const delBtn = card.querySelector('.btn-icon.delete');
    if (user.username !== 'admin') {
      delBtn.addEventListener('click', () => deleteUser(user.username));
    }

    container.appendChild(card);
  });
}

function renderWorkspaceCheckboxes() {
  const container = document.getElementById('workspaceCheckboxes');
  container.innerHTML = '';

  state.departments.forEach(dept => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.fontSize = '0.78rem';
    label.style.color = 'var(--text-secondary)';
    label.style.cursor = 'pointer';

    label.innerHTML = `
      <input type="checkbox" name="allowedWorkspace" value="${dept.id}" checked style="accent-color:var(--orange);">
      <span>${dept.name.split(' ')[0]}</span>
    `;
    container.appendChild(label);
  });
}

async function deleteUser(username) {
  if (confirm(`Are you sure you want to delete the user profile for "${username}"?`)) {
    try {
      await request(`/api/users/${username}`, 'DELETE');
      showToast(`User profile "${username}" deleted.`, 'success');
      await renderUsersList();
    } catch (e) {}
  }
}

async function createNewUserProfile() {
  const usernameInput = document.getElementById('newUsername');
  const passwordInput = document.getElementById('newPassword');
  const roleInput = document.getElementById('newUserRole');

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  const role = roleInput.value;

  const checkboxes = document.querySelectorAll('input[name="allowedWorkspace"]:checked');
  const allowedDepts = Array.from(checkboxes).map(cb => cb.value);

  if (!username || !password) {
    showToast('Please fill in username and password!', 'error');
    return;
  }
  if (allowedDepts.length === 0) {
    showToast('Select at least one allowed department workspace!', 'error');
    return;
  }

  try {
    await request('/api/users', 'POST', { username, password, role, allowedDepts });
    
    usernameInput.value = '';
    passwordInput.value = '';
    
    await renderUsersList();
    showToast(`Successfully created user "${username}"!`, 'success');
  } catch (e) {}
}

// --- SUBMIT WORKFLOWS ---

async function submitPost(status) {
  const textVal = document.getElementById('postText').value.trim();
  const scheduleToggled = document.getElementById('scheduleToggle').checked;
  const dateVal = document.getElementById('postDate').value;
  const timeVal = document.getElementById('postTime').value;

  // Validation
  if (state.selectedPlatforms.length === 0) {
    showToast('Select at least one social media channel!', 'error');
    return;
  }
  if (!textVal && !state.selectedMediaUrl) {
    showToast('Cannot post empty content. Provide text or attach media!', 'error');
    return;
  }

  let scheduledDate = '';
  let finalStatus = status; // 'published' | 'scheduled' | 'draft'

  if (status !== 'draft') {
    if (scheduleToggled) {
      if (!dateVal || !timeVal) {
        showToast('Specify both date and time for scheduled post!', 'error');
        return;
      }
      const targetDate = new Date(`${dateVal}T${timeVal}`);
      if (targetDate <= new Date()) {
        showToast('Scheduled date must be in the future!', 'error');
        return;
      }
      scheduledDate = targetDate.toISOString();
      finalStatus = 'scheduled';
    } else {
      finalStatus = 'published';
    }
  }

  const postData = {
    id: state.editingPostId || 'post-' + Date.now(),
    departmentId: state.activeDeptId,
    platforms: [...state.selectedPlatforms],
    content: textVal,
    mediaUrl: state.selectedMediaUrl,
    mediaType: state.selectedMediaUrl ? 'image' : 'none',
    status: finalStatus,
    scheduledDate: scheduledDate || null,
    createdAt: new Date().toISOString(),
    publishedAt: finalStatus === 'published' ? new Date().toISOString() : null,
    metrics: finalStatus === 'published' ? {
      impressions: Math.floor(Math.random() * 5000) + 500,
      engagements: Math.floor(Math.random() * 800) + 50,
      clicks: Math.floor(Math.random() * 200) + 10,
      shares: Math.floor(Math.random() * 40)
    } : null
  };

  try {
    if (state.editingPostId) {
      await request(`/api/posts/${state.editingPostId}`, 'PUT', postData);
      showToast('Post updated successfully', 'success');
      state.editingPostId = null;
      document.getElementById('publishSubmitBtn').textContent = 'Publish Now';
    } else {
      await request('/api/posts', 'POST', postData);
      showToast('Post successfully saved/queued', 'success');
    }
    
    clearComposer();
    await renderActiveTab();
  } catch (e) {}
}

function clearComposer() {
  document.getElementById('postText').value = '';
  document.getElementById('charCounter').textContent = '0 / 2200 characters';
  state.selectedPlatforms = [];
  state.selectedMediaUrl = '';
  state.editingPostId = null;

  const thumbs = document.querySelectorAll('.media-thumb');
  thumbs.forEach(t => t.classList.remove('selected'));
  document.getElementById('mediaUploadBox').style.borderColor = '';
  document.getElementById('mediaUploadBox').innerHTML = `
    <span class="upload-icon">📸</span>
    <span class="upload-text">Click to select an image from the gallery below</span>
    <span class="upload-subtext">Images auto-adjust to platform sizes</span>
  `;

  document.getElementById('scheduleToggle').checked = false;
  document.getElementById('scheduleFieldsRow').style.display = 'none';
  document.getElementById('publishSubmitBtn').textContent = 'Publish Now';

  renderComposerPlatforms();
  updateComposerPreviews();
}

function loadPostIntoComposer(post) {
  state.editingPostId = post.id;
  document.getElementById('postText').value = post.content || '';
  document.getElementById('charCounter').textContent = `${(post.content || '').length} / 2200 characters`;
  
  state.selectedPlatforms = [...post.platforms];
  state.selectedMediaUrl = post.mediaUrl || '';

  const thumbs = document.querySelectorAll('.media-thumb');
  thumbs.forEach(t => {
    if (t.getAttribute('data-url') === post.mediaUrl) {
      t.classList.add('selected');
    } else {
      t.classList.remove('selected');
    }
  });

  if (post.mediaUrl) {
    document.getElementById('mediaUploadBox').style.borderColor = 'var(--orange)';
    document.getElementById('mediaUploadBox').innerHTML = `
      <img src="${post.mediaUrl}" style="height: 60px; border-radius: 6px; object-fit: cover; margin-bottom: 5px; display:block; margin: 0 auto 5px auto;">
      <span class="upload-text" style="color:var(--orange); display:block; margin-bottom: 8px;">Media attached</span>
      <button type="button" class="btn btn-secondary" id="removeMediaBtn" style="padding: 4px 10px; font-size: 0.72rem; margin: 0 auto; display: block; border-radius:6px; cursor:pointer;">Remove Image</button>
    `;
    
    document.getElementById('removeMediaBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      clearMedia();
    });
  } else {
    document.getElementById('mediaUploadBox').style.borderColor = '';
    document.getElementById('mediaUploadBox').innerHTML = `
      <span class="upload-icon">📸</span>
      <span class="upload-text">Click to select an image from the gallery below</span>
      <span class="upload-subtext">Images auto-adjust to platform sizes</span>
    `;
  }

  if (post.status === 'scheduled' && post.scheduledDate) {
    document.getElementById('scheduleToggle').checked = true;
    document.getElementById('scheduleFieldsRow').style.display = 'grid';
    
    const sDate = new Date(post.scheduledDate);
    const dateStr = sDate.toISOString().split('T')[0];
    const timeStr = sDate.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('postDate').value = dateStr;
    document.getElementById('postTime').value = timeStr;
    document.getElementById('publishSubmitBtn').textContent = 'Update Schedule';
  } else {
    document.getElementById('scheduleToggle').checked = false;
    document.getElementById('scheduleFieldsRow').style.display = 'none';
    document.getElementById('publishSubmitBtn').textContent = 'Publish Changes';
  }

  switchTab('composer');
  renderComposerPlatforms();
  updateComposerPreviews();
  
  showToast('Post loaded into Composer.', 'success');
}

async function publishPostInstantly(id) {
  try {
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    
    const now = new Date().toISOString();
    const mockMetrics = {
      impressions: Math.floor(Math.random() * 6000) + 1000,
      engagements: Math.floor(Math.random() * 1200) + 100,
      clicks: Math.floor(Math.random() * 300) + 20,
      shares: Math.floor(Math.random() * 60)
    };

    await request(`/api/posts/${id}`, 'PUT', { 
      status: 'published', 
      publishedAt: now,
      metrics: mockMetrics
    });
    
    showToast('Post published instantly!', 'success');
    await renderActiveTab();
  } catch (e) {}
}

async function deletePost(id) {
  if (confirm('Are you sure you want to delete this post?')) {
    try {
      await request(`/api/posts/${id}`, 'DELETE');
      showToast('Post deleted successfully', 'success');
      await renderActiveTab();
    } catch (e) {}
  }
}

async function reschedulePost(postId, targetDateIso) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const targetDate = new Date(targetDateIso);
  
  if (post.scheduledDate) {
    const oldDate = new Date(post.scheduledDate);
    targetDate.setHours(oldDate.getHours());
    targetDate.setMinutes(oldDate.getMinutes());
    targetDate.setSeconds(0);
  } else {
    targetDate.setHours(12);
    targetDate.setMinutes(0);
    targetDate.setSeconds(0);
  }

  if (targetDate <= new Date()) {
    showToast('Cannot reschedule post to a past date!', 'error');
    return;
  }

  try {
    await request(`/api/posts/${postId}`, 'PUT', { scheduledDate: targetDate.toISOString() });
    const formattedDate = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    showToast(`Post rescheduled to ${formattedDate}`, 'success');
    await renderActiveTab();
  } catch (e) {}
}

// --- ACCOUNT INTEGRATIONS WORKFLOW ---

async function disconnectAccount(accountId) {
  if (confirm('Are you sure you want to disconnect this platform integration?')) {
    try {
      await request(`/api/accounts/${accountId}/disconnect`, 'POST');
      showToast('Channel disconnected successfully.', 'success');
      await renderActiveTab();
    } catch (e) {}
  }
}

let tempOAuthAccount = null;
let isLiveSetup = false;

function openOAuthModal(account) {
  tempOAuthAccount = account;
  const overlay = document.getElementById('oauthModalOverlay');
  
  document.getElementById('oauthProviderName').textContent = `${account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} Connection`;
  document.getElementById('oauthUserInitials').textContent = account.avatar;
  
  // Clear live input fields
  document.getElementById('liveAccountName').value = '';
  document.getElementById('liveAccountHandle').value = '';
  document.getElementById('liveAccessToken').value = '';
  
  // Default to Simulate tab
  toggleOAuthTab('simulate');
  
  overlay.classList.add('active');
}

function toggleOAuthTab(tab) {
  const simBtn = document.getElementById('tabSimulateBtn');
  const liveBtn = document.getElementById('tabLiveBtn');
  const simSection = document.getElementById('simulateAuthSection');
  const liveSection = document.getElementById('liveAuthSection');
  
  if (tab === 'live') {
    isLiveSetup = true;
    liveBtn.style.borderBottomColor = 'var(--orange)';
    liveBtn.style.color = '#fff';
    liveBtn.style.fontWeight = '700';
    
    simBtn.style.borderBottomColor = 'transparent';
    simBtn.style.color = 'var(--text-muted)';
    simBtn.style.fontWeight = '400';
    
    liveSection.style.display = 'block';
    simSection.style.display = 'none';
  } else {
    isLiveSetup = false;
    simBtn.style.borderBottomColor = 'var(--orange)';
    simBtn.style.color = '#fff';
    simBtn.style.fontWeight = '700';
    
    liveBtn.style.borderBottomColor = 'transparent';
    liveBtn.style.color = 'var(--text-muted)';
    liveBtn.style.fontWeight = '400';
    
    simSection.style.display = 'block';
    liveSection.style.display = 'none';
  }
}

function closeOAuthModal() {
  document.getElementById('oauthModalOverlay').classList.remove('active');
  tempOAuthAccount = null;
}

async function approveOAuthConnection() {
  if (!tempOAuthAccount) return;
  
  let payload = { connected: true };
  
  if (isLiveSetup) {
    const nameVal = document.getElementById('liveAccountName').value.trim();
    const handleVal = document.getElementById('liveAccountHandle').value.trim();
    const tokenVal = document.getElementById('liveAccessToken').value.trim();
    
    if (!nameVal || !handleVal || !tokenVal) {
      showToast('All fields are required for live connection!', 'error');
      return;
    }
    
    payload.name = nameVal;
    payload.handle = handleVal;
    payload.accessToken = tokenVal;
    payload.live = true;
  } else {
    payload.live = false;
  }
  
  try {
    await request(`/api/accounts/${tempOAuthAccount.id}/connect`, 'POST', payload);
    showToast(`Connected ${payload.name || tempOAuthAccount.name} integration successfully!`, 'success');
    await renderActiveTab();
    closeOAuthModal();
  } catch (e) {}
}

// --- SECURE AUTHENTICATION WORKFLOWS ---

async function loginUser() {
  const userVal = document.getElementById('usernameInput').value.trim();
  const passVal = document.getElementById('passwordInput').value.trim();

  try {
    const user = await request('/api/auth/login', 'POST', { username: userVal, password: passVal });
    state.currentUser = user;
    
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginOverlay').classList.remove('active');
    
    // Set active workspace to allowed one
    state.activeDeptId = user.allowedDepts[0];
    
    // Load departments Allowed
    state.departments = await request('/api/departments');
    
    initUI();
    await selectDepartment(state.activeDeptId);
    
    showToast(`Logged in successfully as ${user.username}`, 'success');
  } catch (e) {}
}

async function logoutUser(notifyServer = true) {
  if (notifyServer) {
    try {
      await request('/api/auth/logout', 'POST');
    } catch (e) {}
  }
  
  state.currentUser = null;
  clearComposer();
  showLoginOverlay();
  
  if (notifyServer) {
    showToast('Logged out securely.', 'success');
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  const deptBtn = document.getElementById('activeDeptBtn');
  const deptList = document.getElementById('deptDropdownList');
  
  deptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deptList.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    deptList.classList.remove('active');
  });

  const navButtons = document.querySelectorAll('.nav-menu .nav-item');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  const text = document.getElementById('postText');
  text.addEventListener('input', () => {
    const count = text.value.length;
    document.getElementById('charCounter').textContent = `${count} / 2200 characters`;
    updateComposerPreviews();
  });

  const emojis = ['🌟', '✨', '💪', '🏋️‍♂️', '🍝', '🍹', '🏆', '💼', '📅', '📣', '🔥', '📈'];
  document.getElementById('emojiBtn').addEventListener('click', () => {
    const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const start = text.selectionStart;
    const end = text.selectionEnd;
    text.value = text.value.substring(0, start) + randEmoji + text.value.substring(end);
    text.focus();
    text.selectionStart = text.selectionEnd = start + randEmoji.length;
    text.dispatchEvent(new Event('input'));
  });

  const schedToggle = document.getElementById('scheduleToggle');
  const schedFields = document.getElementById('scheduleFieldsRow');
  schedToggle.addEventListener('change', () => {
    if (schedToggle.checked) {
      schedFields.style.display = 'grid';
      document.getElementById('publishSubmitBtn').textContent = state.editingPostId ? 'Update Schedule' : 'Schedule Post';
    } else {
      schedFields.style.display = 'none';
      document.getElementById('publishSubmitBtn').textContent = state.editingPostId ? 'Publish Changes' : 'Publish Now';
    }
  });

  document.getElementById('saveDraftBtn').addEventListener('click', () => submitPost('draft'));
  document.getElementById('publishSubmitBtn').addEventListener('click', () => submitPost('published'));

  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter');
      renderQueue();
    });
  });

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendarView();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendarView();
  });

  const prevTabs = document.querySelectorAll('.preview-tab-btn');
  prevTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      prevTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const platform = btn.getAttribute('data-preview-platform');
      const frames = document.querySelectorAll('.preview-frame');
      frames.forEach(frame => {
        if (frame.getAttribute('id') === `${platform}PreviewFrame`) {
          frame.classList.add('active');
        } else {
          frame.classList.remove('active');
        }
      });
      
      updatePreviewFrame(platform);
    });
  });

  document.getElementById('oauthCloseBtn').addEventListener('click', closeOAuthModal);
  document.getElementById('oauthCancelBtn').addEventListener('click', closeOAuthModal);
  document.getElementById('oauthApproveBtn').addEventListener('click', approveOAuthConnection);

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loginUser();
  });
  document.getElementById('logoutBtn').addEventListener('click', () => logoutUser());

  const createUserForm = document.getElementById('createUserForm');
  if (createUserForm) {
    createUserForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createNewUserProfile();
    });
  }

  // Tab toggles inside oauth modal
  document.getElementById('tabSimulateBtn').addEventListener('click', () => toggleOAuthTab('simulate'));
  document.getElementById('tabLiveBtn').addEventListener('click', () => toggleOAuthTab('live'));

  // Bulk Channel Sync bindings
  document.getElementById('btnSyncFB').addEventListener('click', () => triggerBulkSync('facebook'));
  document.getElementById('btnSyncGoogle').addEventListener('click', () => triggerBulkSync('google'));
  document.getElementById('btnSaveBulkSync').addEventListener('click', saveBulkSyncMappings);
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${type === 'success' ? '🔔' : '⚠️'}</span>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- CLIENT-SIDE SCHEDULER POLLING ---
// Since background publishing happens on the backend now, the client simply polls
// every 30 seconds to refresh the active lists so the calendar/queue updates dynamically.
function startWebSchedulerPolling() {
  setInterval(async () => {
    if (state.currentUser && state.activeTab !== 'settings') {
      try {
        if (state.activeTab === 'composer') {
          state.posts = await request(`/api/posts?departmentId=${state.activeDeptId}`);
          renderQueue();
        } else if (state.activeTab === 'calendar') {
          state.posts = await request(`/api/posts?departmentId=${state.activeDeptId}`);
          renderCalendarView();
        } else if (state.activeTab === 'analytics') {
          state.analytics = await request(`/api/analytics/${state.activeDeptId}`);
          renderAnalyticsView();
        }
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    }
  }, 30000);
}

// --- BULK CHANNELS AUTO-SYNC WORKFLOW ---
let bulkSyncType = '';
let bulkSyncItems = [];
let dbAccounts = [];

async function triggerBulkSync(type) {
  const tokenInput = document.getElementById('bulkSyncToken');
  const token = tokenInput.value.trim();
  
  if (!token) {
    showToast('Please paste your user access token first!', 'error');
    return;
  }
  
  showToast(`Scanning for active ${type === 'facebook' ? 'Meta Pages' : 'Google Locations'}...`, 'success');
  
  try {
    // 1. Fetch all accounts configured in our DB
    dbAccounts = await request('/api/accounts');
    
    // 2. Fetch discovered pages/locations from API
    let endpoint = type === 'facebook' ? '/api/sync/facebook' : '/api/sync/google';
    const res = await request(endpoint, 'POST', { userToken: token });
    
    bulkSyncType = type;
    bulkSyncItems = type === 'facebook' ? res.pages : res.locations;
    
    if (bulkSyncItems.length === 0) {
      showToast('No active assets discovered on this account.', 'error');
      return;
    }
    
    renderBulkSyncMapping(type);
  } catch (err) {
    showToast(`Sync failed: ${err.message || 'Check your token'}`, 'error');
  }
}

function renderBulkSyncMapping(type) {
  const wrapper = document.getElementById('bulkSyncResultsWrapper');
  const title = document.getElementById('bulkSyncTypeTitle');
  const list = document.getElementById('bulkSyncMappingList');
  
  title.textContent = type === 'facebook' ? 'Discovered Meta Pages Mapping' : 'Discovered Google Profiles Mapping';
  list.innerHTML = '';
  
  // Filter DB accounts to match the type platform
  const targetDbAccounts = dbAccounts.filter(a => {
    if (type === 'facebook') {
      return a.platform === 'facebook' || a.platform === 'instagram';
    }
    return a.platform === 'google';
  });
  
  if (bulkSyncItems.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">No assets discovered.</div>';
    return;
  }
  
  // Create mapping rows for each discovered item
  bulkSyncItems.forEach((item, index) => {
    // Attempt auto-matching by comparing names
    let matchedAccountId = '';
    const cleanName = item.name.toLowerCase();
    
    // Find closest match in our DB channels
    const bestMatch = targetDbAccounts.find(a => {
      const dept = state.departments.find(d => d.id === a.departmentId);
      if (!dept) return false;
      const deptName = dept.name.toLowerCase();
      return cleanName.includes(deptName) || deptName.includes(cleanName);
    });
    
    if (bestMatch) {
      matchedAccountId = bestMatch.id;
    }
    
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); padding:8px 12px; border-radius:8px;';
    
    let optionsHtml = '<option value="">-- Ignore / Do Not Link --</option>';
    targetDbAccounts.forEach(a => {
      const dept = state.departments.find(d => d.id === a.departmentId);
      const labelName = dept ? `${dept.name} (${a.platform.toUpperCase()})` : `${a.departmentId} (${a.platform.toUpperCase()})`;
      const selected = a.id === matchedAccountId ? 'selected' : '';
      optionsHtml += `<option value="${a.id}" ${selected}>${labelName}</option>`;
    });
    
    let instagramMatchHtml = '';
    if (type === 'facebook' && item.instagram) {
      instagramMatchHtml = `
        <div style="font-size:0.68rem; color:var(--orange); margin-top:2px;">
          📸 Linked Instagram: <strong>${item.instagram.username}</strong>
        </div>
      `;
    }
    
    row.innerHTML = `
      <div style="display:flex; flex-direction:column; max-width:55%;">
        <span style="font-size:0.8rem; font-weight:700; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>
        <span style="font-size:0.68rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis;">ID: ${item.id}</span>
        ${instagramMatchHtml}
      </div>
      
      <select class="bulk-sync-select" data-index="${index}" style="background:rgba(0,0,0,0.4); color:#fff; border:1px solid var(--glass-border); padding:6px; border-radius:6px; font-size:0.75rem; width:45%; outline:none;">
        ${optionsHtml}
      </select>
    `;
    
    list.appendChild(row);
  });
  
  wrapper.style.display = 'block';
}

async function saveBulkSyncMappings() {
  const selects = document.querySelectorAll('.bulk-sync-select');
  const mappings = [];
  
  selects.forEach(sel => {
    const dbAccountId = sel.value;
    const itemIndex = parseInt(sel.getAttribute('data-index'));
    if (!dbAccountId) return;
    
    const item = bulkSyncItems[itemIndex];
    const targetDbAcc = dbAccounts.find(a => a.id === dbAccountId);
    if (!targetDbAcc) return;
    
    if (bulkSyncType === 'facebook') {
      if (targetDbAcc.platform === 'facebook') {
        mappings.push({
          id: dbAccountId,
          name: item.name,
          handle: item.id,
          accessToken: item.accessToken
        });
      } else if (targetDbAcc.platform === 'instagram' && item.instagram) {
        mappings.push({
          id: dbAccountId,
          name: item.instagram.name || item.name,
          handle: item.instagram.id,
          accessToken: item.accessToken
        });
      }
    } else if (bulkSyncType === 'google') {
      mappings.push({
        id: dbAccountId,
        name: item.name,
        handle: item.handle,
        accessToken: document.getElementById('bulkSyncToken').value.trim()
      });
    }
  });
  
  if (mappings.length === 0) {
    showToast('No mappings were selected to save.', 'warning');
    return;
  }
  
  try {
    await request('/api/sync/save', 'POST', { mappings });
    showToast(`Successfully linked ${mappings.length} accounts automatically!`, 'success');
    
    document.getElementById('bulkSyncResultsWrapper').style.display = 'none';
    document.getElementById('bulkSyncToken').value = '';
    
    if (state.activeTab === 'settings') {
      await renderActiveTab();
    }
  } catch (err) {
    showToast(`Failed to apply mappings: ${err.message}`, 'error');
  }
}
