// Main Application Logic for Dome Social Media Hub

import { DEPARTMENTS, SOCIAL_ACCOUNTS, INITIAL_POSTS, ANALYTICS_DATA } from './mockData.js';
import { 
  updatePlatformPreview, 
  renderCalendar, 
  renderAnalytics, 
  renderPostQueue 
} from './components.js';

// --- STATE MANAGEMENT ---
let state = {
  departments: DEPARTMENTS,
  accounts: [],
  posts: [],
  analytics: ANALYTICS_DATA,
  
  // Navigation & View Filters
  activeDeptId: 'namibia',
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

// Users data with role-based access configurations
const USERS = [
  { username: 'admin', password: 'adminpass', role: 'administrator', allowedDepts: ['namibia', 'gym', 'cycling', 'hotel', 'kinderzone', 'pitstop'] },
  { username: 'gymmanager', password: 'gympass', role: 'gym_manager', allowedDepts: ['gym', 'cycling'] },
  { username: 'loungemanager', password: 'loungepass', role: 'lounge_manager', allowedDepts: ['pitstop'] },
  { username: 'namibiamanager', password: 'nampass', role: 'namibia_manager', allowedDepts: ['namibia'] },
  { username: 'hotelmanager', password: 'hotelpass', role: 'hotel_manager', allowedDepts: ['hotel', 'kinderzone'] }
];

// Preset images for media gallery
const MEDIA_PRESETS = [
  { id: 'img-1', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', label: 'Event' },
  { id: 'img-2', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80', label: 'Dining' },
  { id: 'img-3', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', label: 'Fitness' },
  { id: 'img-4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80', label: 'Office' },
  { id: 'img-5', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', label: 'Bar' },
  { id: 'img-6', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', label: 'Concert' }
];

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  restoreSession();
  initUI();
  setupEventListeners();
  startSchedulerLoop();
  
  // Initial renders
  if (state.currentUser) {
    renderActiveTab();
    showToast('Welcome to Dome Social Hub', 'success');
  }
});

// Load state from local storage or set defaults
function loadFromLocalStorage() {
  let localAccounts = localStorage.getItem('dome_social_accounts');
  let localPosts = localStorage.getItem('dome_social_posts');
  let localUsers = localStorage.getItem('dome_social_users');
  
  // Migrate schema from default/older workspace configuration
  let parsedAccounts = [];
  try {
    if (localAccounts) parsedAccounts = JSON.parse(localAccounts);
  } catch (e) {}

  if (localAccounts && (localAccounts.includes('"departmentId":"marketing"') || parsedAccounts.length < 24)) {
    localStorage.removeItem('dome_social_accounts');
    localStorage.removeItem('dome_social_posts');
    localStorage.removeItem('dome_social_users');
    localAccounts = null;
    localPosts = null;
    localUsers = null;
  }
  
  if (localAccounts) {
    state.accounts = JSON.parse(localAccounts);
  } else {
    state.accounts = [...SOCIAL_ACCOUNTS];
    saveAccountsToLocalStorage();
  }

  if (localPosts) {
    state.posts = JSON.parse(localPosts);
  } else {
    state.posts = [...INITIAL_POSTS];
    savePostsToLocalStorage();
  }

  if (localUsers) {
    state.users = JSON.parse(localUsers);
  } else {
    state.users = [...USERS];
    saveUsersToLocalStorage();
  }
}

function saveAccountsToLocalStorage() {
  localStorage.setItem('dome_social_accounts', JSON.stringify(state.accounts));
}

function savePostsToLocalStorage() {
  localStorage.setItem('dome_social_posts', JSON.stringify(state.posts));
}

function saveUsersToLocalStorage() {
  localStorage.setItem('dome_social_users', JSON.stringify(state.users));
}

// --- UI CONSTRUCTORS ---
function initUI() {
  // Filter departments based on allowed list for logged-in user
  const allowedDepts = state.currentUser ? state.currentUser.allowedDepts : [];
  const filteredDepts = state.departments.filter(d => allowedDepts.includes(d.id));

  // Render departments dropdown items
  const deptList = document.getElementById('deptDropdownList');
  deptList.innerHTML = '';
  
  filteredDepts.forEach(dept => {
    const item = document.createElement('div');
    item.className = 'dept-dropdown-item';
    item.innerHTML = `${dept.icon} ${dept.name}`;
    item.addEventListener('click', () => {
      selectDepartment(dept.id);
      deptList.classList.remove('active');
    });
    deptList.appendChild(item);
  });

  // Verify active department is still within user permissions
  if (state.currentUser && !allowedDepts.includes(state.activeDeptId)) {
    state.activeDeptId = allowedDepts[0];
  }

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

  // Select default department text label in UI
  const initialDept = state.departments.find(d => d.id === state.activeDeptId);
  if (initialDept) {
    document.getElementById('activeDeptText').textContent = `${initialDept.icon} ${initialDept.name}`;
  }

  // Default dates in composer
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('postDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('postTime').value = "12:00";
}

// --- CONTROLLERS & ACTIONS ---
function selectDepartment(deptId) {
  state.activeDeptId = deptId;
  const dept = state.departments.find(d => d.id === deptId);
  
  // Update Dropdown Text
  document.getElementById('activeDeptText').textContent = `${dept.icon} ${dept.name}`;
  
  // Update UI components affected by department change
  updateSidebarAccountsList();
  
  // Clear composer platform selections since available accounts changed
  state.selectedPlatforms = [];
  renderComposerPlatforms();
  
  // Re-render active tab
  renderActiveTab();
  
  showToast(`Switched workspace to ${dept.name}`, 'success');
}

function selectMediaPreset(url, element) {
  const thumbs = document.querySelectorAll('.media-thumb');
  thumbs.forEach(t => t.classList.remove('selected'));

  if (state.selectedMediaUrl === url) {
    // Toggle off
    state.selectedMediaUrl = '';
    document.getElementById('mediaUploadBox').style.borderColor = '';
    document.getElementById('mediaUploadBox').innerHTML = `
      <span class="upload-icon">📸</span>
      <span class="upload-text">Click to select an image from the gallery below</span>
      <span class="upload-subtext">Images auto-adjust to platform sizes</span>
    `;
  } else {
    // Toggle on
    state.selectedMediaUrl = url;
    element.classList.add('selected');
    document.getElementById('mediaUploadBox').style.borderColor = 'var(--orange)';
    document.getElementById('mediaUploadBox').innerHTML = `
      <img src="${url}" style="height: 60px; border-radius: 6px; object-fit: cover; margin-bottom: 5px; display:block; margin: 0 auto 5px auto;">
      <span class="upload-text" style="color:var(--orange);">Media attached successfully</span>
    `;
  }

  // Update preview active tab
  const activePreviewPlat = document.querySelector('.preview-tab-btn.active').getAttribute('data-preview-platform');
  updatePreviewFrame(activePreviewPlat);
}

// Updates sidebar list of active/inactive platforms
function updateSidebarAccountsList() {
  const list = document.getElementById('sidebarAccountsList');
  list.innerHTML = '';

  const deptAccounts = state.accounts.filter(a => a.departmentId === state.activeDeptId);
  
  deptAccounts.forEach(acc => {
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

  const deptAccounts = state.accounts.filter(a => a.departmentId === state.activeDeptId);

  deptAccounts.forEach(acc => {
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
        // Redirect to settings
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
  
  // Also adjust previews
  updateComposerPreviews();
}

function updateComposerPreviews() {
  const text = document.getElementById('postText').value;
  const mediaUrl = state.selectedMediaUrl;
  const deptAccounts = state.accounts.filter(a => a.departmentId === state.activeDeptId);

  // Update tabs indicators in previews wrapper
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

  // Render the current active preview
  const activePreviewPlat = document.querySelector('.preview-tab-btn.active').getAttribute('data-preview-platform');
  updatePreviewFrame(activePreviewPlat);
}

function updatePreviewFrame(platform) {
  const text = document.getElementById('postText').value;
  const mediaUrl = state.selectedMediaUrl;
  const deptAccounts = state.accounts.filter(a => a.departmentId === state.activeDeptId);
  
  updatePlatformPreview(platform, text, mediaUrl, deptAccounts);
}

// Switch navigation tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Style sidebar
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show panel
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => {
    if (panel.getAttribute('id') === `tab-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Adjust headings
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
    desc.textContent = "Authorize API bindings and check local safety buffer configurations.";
  }

  renderActiveTab();
}

function renderActiveTab() {
  if (state.activeTab === 'composer') {
    renderComposerPlatforms();
    updateSidebarAccountsList();
    updateComposerPreviews();
    renderQueue();
  } else if (state.activeTab === 'calendar') {
    renderCalendarView();
  } else if (state.activeTab === 'analytics') {
    renderAnalyticsView();
  } else if (state.activeTab === 'settings') {
    renderSettingsView();
  }
}

// --- RENDER IMPLEMENTATIONS ---

// Render queue list in composer view
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

// Render Content Calendar view
function renderCalendarView() {
  renderCalendar(
    'calendarCellsContainer',
    state.currentCalendarDate,
    state.posts.filter(p => p.departmentId === state.activeDeptId),
    {
      onPostDropped: (postId, targetDateIso) => reschedulePost(postId, targetDateIso),
      onPostClicked: (post) => loadPostIntoComposer(post)
    }
  );
}

// Render Analytics graphs
function renderAnalyticsView() {
  const deptData = state.analytics[state.activeDeptId] || {
    overview: { impressions: 0, engagementRate: 0, clicks: 0, followersAdded: 0 },
    platforms: {},
    history: []
  };
  
  renderAnalytics(
    'analyticsOverviewGrid',
    'chartBarsRow',
    'platformBreakdownList',
    deptData
  );
}

// Render Settings screen
function renderSettingsView() {
  const container = document.getElementById('settingsAccountsGrid');
  container.innerHTML = '';

  const deptAccounts = state.accounts.filter(a => a.departmentId === state.activeDeptId);

  deptAccounts.forEach(acc => {
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

function renderUsersList() {
  const container = document.getElementById('usersListContainer');
  container.innerHTML = '';

  state.users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'connection-card';
    card.style.padding = '12px 16px';
    
    // Convert allowedDepts to names
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
      <span>${dept.icon} ${dept.name.split(' ')[0]}</span>
    `;
    container.appendChild(label);
  });
}

function deleteUser(username) {
  if (confirm(`Are you sure you want to delete the user profile for "${username}"?`)) {
    state.users = state.users.filter(u => u.username !== username);
    saveUsersToLocalStorage();
    renderUsersList();
    showToast(`User profile "${username}" deleted.`, 'success');
  }
}

function createNewUserProfile() {
  const usernameInput = document.getElementById('newUsername');
  const passwordInput = document.getElementById('newPassword');
  const roleInput = document.getElementById('newUserRole');

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  const role = roleInput.value;

  // Selected workspaces checkboxes
  const checkboxes = document.querySelectorAll('input[name="allowedWorkspace"]:checked');
  const allowedDepts = Array.from(checkboxes).map(cb => cb.value);

  // Validation
  if (!username || !password) {
    showToast('Please fill in username and password!', 'error');
    return;
  }
  if (state.users.some(u => u.username === username)) {
    showToast('Username already exists!', 'error');
    return;
  }
  if (allowedDepts.length === 0) {
    showToast('Select at least one allowed department workspace!', 'error');
    return;
  }

  const newUser = {
    username,
    password,
    role: role === 'administrator' ? 'administrator' : 'manager',
    allowedDepts
  };

  state.users.push(newUser);
  saveUsersToLocalStorage();
  
  // Reset form
  usernameInput.value = '';
  passwordInput.value = '';
  
  // Re-render
  renderUsersList();
  showToast(`Successfully created user "${username}"!`, 'success');
}

// --- SUBMIT WORKFLOWS ---

function submitPost(status) {
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

  if (state.editingPostId) {
    // Modify existing post
    const postIndex = state.posts.findIndex(p => p.id === state.editingPostId);
    if (postIndex > -1) {
      state.posts[postIndex] = {
        ...state.posts[postIndex],
        platforms: [...state.selectedPlatforms],
        content: textVal,
        mediaUrl: state.selectedMediaUrl,
        mediaType: state.selectedMediaUrl ? 'image' : 'none',
        status: finalStatus,
        scheduledDate: scheduledDate,
        publishedAt: finalStatus === 'published' ? new Date().toISOString() : null
      };
      
      showToast(`Post updated successfully as ${finalStatus}`, 'success');
      state.editingPostId = null;
      document.getElementById('publishSubmitBtn').textContent = 'Publish Now';
    }
  } else {
    // Create new post
    const newPost = {
      id: 'post-' + Date.now(),
      departmentId: state.activeDeptId,
      platforms: [...state.selectedPlatforms],
      content: textVal,
      mediaUrl: state.selectedMediaUrl,
      mediaType: state.selectedMediaUrl ? 'image' : 'none',
      status: finalStatus,
      scheduledDate: scheduledDate,
      createdAt: new Date().toISOString(),
      publishedAt: finalStatus === 'published' ? new Date().toISOString() : null,
      metrics: finalStatus === 'published' ? {
        impressions: Math.floor(Math.random() * 5000) + 500,
        engagements: Math.floor(Math.random() * 800) + 50,
        clicks: Math.floor(Math.random() * 200) + 10,
        shares: Math.floor(Math.random() * 40)
      } : null
    };
    
    state.posts.push(newPost);
    showToast(`Post successfully queued as ${finalStatus}`, 'success');
  }

  savePostsToLocalStorage();
  clearComposer();
  renderActiveTab();
}

function clearComposer() {
  document.getElementById('postText').value = '';
  document.getElementById('charCounter').textContent = '0 / 2200 characters';
  state.selectedPlatforms = [];
  state.selectedMediaUrl = '';
  state.editingPostId = null;

  // Reset image presets highlight
  const thumbs = document.querySelectorAll('.media-thumb');
  thumbs.forEach(t => t.classList.remove('selected'));
  document.getElementById('mediaUploadBox').style.borderColor = '';
  document.getElementById('mediaUploadBox').innerHTML = `
    <span class="upload-icon">📸</span>
    <span class="upload-text">Click to select an image from the gallery below</span>
    <span class="upload-subtext">Images auto-adjust to platform sizes</span>
  `;

  // Reset toggle
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

  // Set media box highlight
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
      <span class="upload-text" style="color:var(--orange);">Media attached</span>
    `;
  } else {
    document.getElementById('mediaUploadBox').style.borderColor = '';
    document.getElementById('mediaUploadBox').innerHTML = `
      <span class="upload-icon">📸</span>
      <span class="upload-text">Click to select an image from the gallery below</span>
      <span class="upload-subtext">Images auto-adjust to platform sizes</span>
    `;
  }

  // Set schedule toggle
  if (post.status === 'scheduled' && post.scheduledDate) {
    document.getElementById('scheduleToggle').checked = true;
    document.getElementById('scheduleFieldsRow').style.display = 'grid';
    
    const sDate = new Date(post.scheduledDate);
    // Format YYYY-MM-DD
    const dateStr = sDate.toISOString().split('T')[0];
    // Format HH:MM
    const timeStr = sDate.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('postDate').value = dateStr;
    document.getElementById('postTime').value = timeStr;
    document.getElementById('publishSubmitBtn').textContent = 'Update Schedule';
  } else {
    document.getElementById('scheduleToggle').checked = false;
    document.getElementById('scheduleFieldsRow').style.display = 'none';
    document.getElementById('publishSubmitBtn').textContent = 'Publish Changes';
  }

  // Switch to composer tab
  switchTab('composer');
  renderComposerPlatforms();
  updateComposerPreviews();
  
  showToast('Post loaded into Composer.', 'success');
}

// Publish scheduled/draft post instantly
function publishPostInstantly(id) {
  const index = state.posts.findIndex(p => p.id === id);
  if (index > -1) {
    state.posts[index].status = 'published';
    state.posts[index].publishedAt = new Date().toISOString();
    state.posts[index].metrics = {
      impressions: Math.floor(Math.random() * 6000) + 1000,
      engagements: Math.floor(Math.random() * 1200) + 100,
      clicks: Math.floor(Math.random() * 300) + 20,
      shares: Math.floor(Math.random() * 60)
    };

    savePostsToLocalStorage();
    showToast('Post published instantly!', 'success');
    renderActiveTab();
  }
}

// Delete post
function deletePost(id) {
  if (confirm('Are you sure you want to delete this post?')) {
    state.posts = state.posts.filter(p => p.id !== id);
    savePostsToLocalStorage();
    showToast('Post deleted successfully', 'success');
    renderActiveTab();
  }
}

// Reschedule post via Drag & Drop on Calendar
function reschedulePost(postId, targetDateIso) {
  const index = state.posts.findIndex(p => p.id === postId);
  if (index > -1) {
    const post = state.posts[index];
    const targetDate = new Date(targetDateIso);
    
    // Maintain old time if available
    if (post.scheduledDate) {
      const oldDate = new Date(post.scheduledDate);
      targetDate.setHours(oldDate.getHours());
      targetDate.setMinutes(oldDate.getMinutes());
      targetDate.setSeconds(0);
    } else {
      // Default to 12:00
      targetDate.setHours(12);
      targetDate.setMinutes(0);
      targetDate.setSeconds(0);
    }

    if (targetDate <= new Date()) {
      showToast('Cannot reschedule post to a past date!', 'error');
      return;
    }

    state.posts[index].scheduledDate = targetDate.toISOString();
    savePostsToLocalStorage();
    
    const formattedDate = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    showToast(`Post rescheduled to ${formattedDate}`, 'success');
    
    renderCalendarView();
  }
}

// --- ACCOUNT INTEGRATIONS WORKFLOW ---

function disconnectAccount(accountId) {
  if (confirm('Are you sure you want to disconnect this platform integration? You will not be able to schedule posts to it until reconnected.')) {
    const index = state.accounts.findIndex(a => a.id === accountId);
    if (index > -1) {
      state.accounts[index].connected = false;
      saveAccountsToLocalStorage();
      updateSidebarAccountsList();
      renderSettingsView();
      showToast('Channel disconnected successfully.', 'success');
    }
  }
}

let tempOAuthAccount = null;

function openOAuthModal(account) {
  tempOAuthAccount = account;
  const overlay = document.getElementById('oauthModalOverlay');
  
  // Set platform-specific values
  document.getElementById('oauthProviderName').textContent = `${account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} Connection`;
  
  // Set user profile details based on department
  const initialsText = account.avatar;
  document.getElementById('oauthUserInitials').textContent = initialsText;
  
  overlay.classList.add('active');
}

function closeOAuthModal() {
  document.getElementById('oauthModalOverlay').classList.remove('active');
  tempOAuthAccount = null;
}

function approveOAuthConnection() {
  if (tempOAuthAccount) {
    const index = state.accounts.findIndex(a => a.id === tempOAuthAccount.id);
    if (index > -1) {
      state.accounts[index].connected = true;
      saveAccountsToLocalStorage();
      updateSidebarAccountsList();
      renderSettingsView();
      showToast(`Connected ${tempOAuthAccount.name} integration successfully!`, 'success');
    }
  }
  closeOAuthModal();
}

// --- SECURE AUTHENTICATION WORKFLOWS ---

function restoreSession() {
  const session = sessionStorage.getItem('dome_session');
  if (session) {
    state.currentUser = JSON.parse(session);
    document.getElementById('loginOverlay').classList.remove('active');
  } else {
    state.currentUser = null;
    document.getElementById('loginOverlay').classList.add('active');
  }
}

function loginUser() {
  const userVal = document.getElementById('usernameInput').value.trim().toLowerCase();
  const passVal = document.getElementById('passwordInput').value.trim();

  const user = state.users.find(u => u.username === userVal && u.password === passVal);
  if (user) {
    state.currentUser = user;
    sessionStorage.setItem('dome_session', JSON.stringify(user));
    
    // Reset login form fields
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    
    // Hide overlay
    document.getElementById('loginOverlay').classList.remove('active');
    
    // Update default department based on roles permissions
    state.activeDeptId = user.allowedDepts[0];
    
    initUI();
    updateSidebarAccountsList();
    renderActiveTab();
    
    showToast(`Logged in successfully as ${user.username}`, 'success');
  } else {
    showToast('Invalid username or password!', 'error');
  }
}

function logoutUser() {
  sessionStorage.removeItem('dome_session');
  state.currentUser = null;
  clearComposer();
  
  // Show login screen
  document.getElementById('loginOverlay').classList.add('active');
  showToast('Logged out securely.', 'success');
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Department dropdown toggle
  const deptBtn = document.getElementById('activeDeptBtn');
  const deptList = document.getElementById('deptDropdownList');
  
  deptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deptList.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    deptList.classList.remove('active');
  });

  // Tab switcher buttons
  const navButtons = document.querySelectorAll('.nav-menu .nav-item');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Textarea content typing
  const text = document.getElementById('postText');
  text.addEventListener('input', () => {
    const count = text.value.length;
    document.getElementById('charCounter').textContent = `${count} / 2200 characters`;
    updateComposerPreviews();
  });

  // Emoji button appends emoji
  const emojis = ['🌟', '✨', '💪', '🏋️‍♂️', '🍝', '🍹', '🏆', '💼', '📅', '📣', '🔥', '📈'];
  document.getElementById('emojiBtn').addEventListener('click', () => {
    const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const start = text.selectionStart;
    const end = text.selectionEnd;
    text.value = text.value.substring(0, start) + randEmoji + text.value.substring(end);
    text.focus();
    text.selectionStart = text.selectionEnd = start + randEmoji.length;
    
    // Trigger input update
    text.dispatchEvent(new Event('input'));
  });

  // Schedule slider toggles visibility
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

  // Action buttons
  document.getElementById('saveDraftBtn').addEventListener('click', () => submitPost('draft'));
  document.getElementById('publishSubmitBtn').addEventListener('click', () => submitPost('published'));

  // Queue List Filter Buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter');
      renderQueue();
    });
  });

  // Calendar month navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendarView();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendarView();
  });

  // Preview tab selectors (top right of preview frame)
  const prevTabs = document.querySelectorAll('.preview-tab-btn');
  prevTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      prevTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Hide all preview frames, show active one
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

  // Connect/Disconnect modal listeners
  document.getElementById('oauthCloseBtn').addEventListener('click', closeOAuthModal);
  document.getElementById('oauthCancelBtn').addEventListener('click', closeOAuthModal);
  document.getElementById('oauthApproveBtn').addEventListener('click', approveOAuthConnection);

  // Authentication listeners
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loginUser();
  });
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);

  // User Management listeners
  const createUserForm = document.getElementById('createUserForm');
  if (createUserForm) {
    createUserForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createNewUserProfile();
    });
  }
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

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- BACKGROUND SCHEDULER LOOP (SIMULATES A GATEWAY SERVER CRON) ---
function startSchedulerLoop() {
  setInterval(() => {
    const now = new Date();
    let hasUpdates = false;

    state.posts.forEach((post, index) => {
      if (post.status === 'scheduled' && post.scheduledDate) {
        const schedDate = new Date(post.scheduledDate);
        
        // If scheduled date has passed
        if (schedDate <= now) {
          state.posts[index].status = 'published';
          state.posts[index].publishedAt = now.toISOString();
          
          // Generate simulated statistics
          state.posts[index].metrics = {
            impressions: Math.floor(Math.random() * 5500) + 1200,
            engagements: Math.floor(Math.random() * 950) + 100,
            clicks: Math.floor(Math.random() * 250) + 20,
            shares: Math.floor(Math.random() * 45)
          };
          
          hasUpdates = true;
          
          // Toast alerting which channels were published
          const channels = post.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
          showToast(`Published: Staggered write complete to [${channels}] for ${state.departments.find(d => d.id === post.departmentId).name}`, 'success');
        }
      }
    });

    if (hasUpdates) {
      savePostsToLocalStorage();
      
      // Update UI if in a view displaying posts
      if (state.activeTab === 'composer') {
        renderQueue();
      } else if (state.activeTab === 'calendar') {
        renderCalendarView();
      } else if (state.activeTab === 'analytics') {
        renderAnalyticsView();
      }
    }
  }, 10000); // Check every 10 seconds (corresponds to system timer stats in Settings)
}
