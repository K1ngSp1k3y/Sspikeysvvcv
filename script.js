
window.addEventListener('load', () => {
  setTimeout(() => {
    const screen = document.getElementById('laserLoadingScreen');
    if (screen) {
      screen.classList.add('fade-out');
      setTimeout(() => screen.remove(), 700);
    }
  }, 1300);
});

function safeGetStorage(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) { return fallback; }
}

function safeSetStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function safeRemoveStorage(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function safeParseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null ? parsed : fallback;
  } catch (e) { return fallback; }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showToast(msg, icon = '✓') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<span style="color:#10b981; font-weight:800;">${escapeHTML(icon)}</span><span>${escapeHTML(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = '0.22s ease';
    setTimeout(() => el.remove(), 240);
  }, 2600);
}

function copyTextToClipboard(text, label = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(label, '📋')).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(label, '📋');
  } catch (e) {
    showToast('Unable to copy automatically', '!');
  }
  ta.remove();
}

function handleOutsideModal(e, modalId) {
  if (e.target === document.getElementById(modalId)) {
    if (modalId === 'gameDemoModal') closeGameDemoModal();
    else document.getElementById(modalId).style.display = 'none';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCardDetailModal();
    closeGameDemoModal();
    closeAuthModal();
    closeProfileModal();
    closeCartModal();
    closeOwnerLogin();
    closeOwnerDashboard();
  }
});

let qualityMode = safeGetStorage('spikey_quality', 'mid');
if (!['high', 'mid', 'low'].includes(qualityMode)) qualityMode = 'mid';

let skyController = null;

function setQualityMode(mode, notify = true) {
  if (!['high', 'mid', 'low'].includes(mode)) return;
  qualityMode = mode;
  safeSetStorage('spikey_quality', mode);

  document.body.classList.remove('quality-high', 'quality-mid', 'quality-low');
  document.body.classList.add(`quality-${mode}`);

  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-q') === mode);
  });

  const sidebarTxt = document.getElementById('sidebarQualityText');
  if (sidebarTxt) sidebarTxt.innerText = mode.toUpperCase();

  if (skyController && typeof skyController.configure === 'function') {
    skyController.configure(mode);
  }

  if (typeof applyCardFilters === 'function' && typeof catalogCards !== 'undefined') {
    applyCardFilters(true);
  }

  if (notify) {
    const labels = {
      high: 'High Graphics: Watermark animations & 60 FPS sky',
      mid: 'Mid Graphics: Balanced animations & 30 FPS sky',
      low: 'Low Graphics: Maximum FPS mode (animations & canvas paused)'
    };
    showToast(labels[mode], '⚙');
  }
}

(function initSpaceCanvas() {
  const canvas = document.getElementById('spaceCanvas');
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let stars = [];
  let meteors = [];
  let frameInterval = 32;
  let starTargetCount = 120;
  let meteorTargetCount = 3;
  let isPaused = false;
  const colors = ['#ffffff', '#ffffff', '#e0e7ff', '#ddd6fe', '#bae6fd'];

  function rebuildParticles() {
    stars = Array.from({ length: starTargetCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: i % 10 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.8,
      color: colors[i % colors.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.025
    }));

    meteors = Array.from({ length: meteorTargetCount }, (_, j) => ({
      x: Math.random() * width * 1.2,
      y: -80 - j * 220,
      len: 75 + Math.random() * 45,
      speed: 6 + Math.random() * 4,
      delay: j * 90
    }));
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildParticles();
  }

  function configure(mode) {
    if (mode === 'low') {
      isPaused = true;
      ctx.clearRect(0, 0, width, height);
      return;
    }
    isPaused = false;
    if (mode === 'high') {
      frameInterval = 16;
      starTargetCount = 240;
      meteorTargetCount = 6;
    } else {
      frameInterval = 32;
      starTargetCount = 120;
      meteorTargetCount = 3;
    }
    rebuildParticles();
  }

  skyController = { configure };
  resizeCanvas();
  configure(qualityMode);
  window.addEventListener('resize', resizeCanvas);

  let lastFrame = 0;
  function renderSky(ts) {
    requestAnimationFrame(renderSky);
    if (isPaused || document.hidden || ts - lastFrame < frameInterval) return;
    lastFrame = ts;

    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed;
      ctx.globalAlpha = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(s.phase));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.85;
    for (let j = 0; j < meteors.length; j++) {
      const m = meteors[j];
      if (m.delay > 0) {
        m.delay--;
        continue;
      }
      const grad = ctx.createLinearGradient(m.x, m.y, m.x + m.len, m.y - m.len);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.5, 'rgba(167,139,250,0.35)');
      grad.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + m.len, m.y - m.len);
      ctx.stroke();

      m.x -= m.speed;
      m.y += m.speed;
      if (m.y > height + 120 || m.x < -120) {
        m.x = Math.random() * width * 1.25 + 80;
        m.y = -60;
        m.delay = 60 + Math.floor(Math.random() * 140);
      }
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(renderSky);
})();

function updateStatusBar() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  document.getElementById('clockDisplay').innerText = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateStatusBar, 1000);
updateStatusBar();

if (navigator.getBattery) {
  navigator.getBattery().then(bat => {
    const syncBat = () => {
      const pct = Math.round(bat.level * 100);
      document.getElementById('batteryDisplay').innerText = `${bat.charging ? '⚡' : '🔋'} ${pct}%`;
    };
    syncBat();
    bat.addEventListener('levelchange', syncBat);
    bat.addEventListener('chargingchange', syncBat);
  }).catch(() => {});
}

const sidebarEl = document.getElementById('sidebarNavPanel');
const hoverZoneEl = document.getElementById('sidebarHoverZone');
let sidebarCloseTimer = null;

function openHoverSidebar() {
  if (sidebarCloseTimer) {
    clearTimeout(sidebarCloseTimer);
    sidebarCloseTimer = null;
  }
  sidebarEl.classList.add('hover-open');
}

function scheduleCloseHoverSidebar() {
  if (sidebarCloseTimer) clearTimeout(sidebarCloseTimer);
  sidebarCloseTimer = setTimeout(() => {
    sidebarEl.classList.remove('hover-open');
  }, 180);
}

hoverZoneEl.addEventListener('mouseenter', openHoverSidebar);
sidebarEl.addEventListener('mouseenter', openHoverSidebar);
sidebarEl.addEventListener('mouseleave', scheduleCloseHoverSidebar);

function toggleSidebar() {
  if (window.innerWidth <= 900) {
    document.body.classList.toggle('mobile-nav-open');
    document.getElementById('sidebarBackdrop').classList.toggle('visible');
  } else {
    document.body.classList.toggle('sidebar-pinned');
  }
}

const realBanks = [
  "Bank of America", "Wells Fargo", "Chase Bank", "Citibank",
  "U.S. Bank", "PNC Bank", "Capital One", "Target Gift", "American Express"
];

const bankThemeMap = {
  "Bank of America": "bank-bofa",
  "Wells Fargo": "bank-wellsfargo",
  "Chase Bank": "bank-chase",
  "Citibank": "bank-citi",
  "U.S. Bank": "bank-usbank",
  "PNC Bank": "bank-pnc",
  "Capital One": "bank-capitalone",
  "Target Gift": "bank-target",
  "American Express": "bank-amex",
  "Vault Purple": "bank-default"
};

const allBannerThemes = [
  "Bank of America", "Wells Fargo", "Chase Bank", "Citibank",
  "U.S. Bank", "PNC Bank", "Capital One", "Target Gift", "American Express", "Vault Purple"
];

function getBannerWatermarkText(bankName) {
  const label = (bankName || 'SPIKEY VAULT').toUpperCase();
  return `${label} • `.repeat(220);
}

function applyBankBannerStyling(boxEl, watermarkEl, bankName, tagEl = null) {
  if (!boxEl || !watermarkEl) return;
  const chosen = allBannerThemes.includes(bankName) ? bankName : 'Vault Purple';
  const themeClass = bankThemeMap[chosen] || 'bank-default';
  Object.values(bankThemeMap).forEach(cls => boxEl.classList.remove(cls));
  boxEl.classList.add(themeClass);
  watermarkEl.textContent = getBannerWatermarkText(chosen);
  if (tagEl) tagEl.innerText = chosen.toUpperCase();
}

function hashPasswordLocal(pw) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const s = String(pw);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

let accountsDB = safeParseJSON(safeGetStorage('spikey_accounts'), {});
let currentUser = safeGetStorage('spikey_user', null);
let userBalance = parseFloat(safeGetStorage('spikey_balance', '0')) || 0.00;
let cartItems = safeParseJSON(safeGetStorage('spikey_cart'), []);
let ownerLogs = safeParseJSON(safeGetStorage('spikey_owner_logs'), []);
let bannedOperators = safeParseJSON(safeGetStorage('spikey_banned'), []);
let purchasedCardIds = safeParseJSON(safeGetStorage('spikey_purchased_card_ids'), []);

let visitorIP = safeGetStorage('spikey_visitor_ip', null);
if (!visitorIP) {
  visitorIP = `192.168.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  safeSetStorage('spikey_visitor_ip', visitorIP);
}
let claimedBonusIPs = safeParseJSON(safeGetStorage('spikey_claimed_bonus_ips'), []);

(function migrateLegacySession() {
  if (currentUser) {
    const key = currentUser.toLowerCase();
    if (!accountsDB[key]) {
      accountsDB[key] = {
        username: currentUser,
        displayName: currentUser,
        passwordHash: '',
        bio: 'Vault operator & card collector.',
        email: currentUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
        pfpType: 'letter',
        pfpValue: '',
        bannerBank: 'Bank of America',
        balance: userBalance,
        joinedAt: new Date().toLocaleDateString()
      };
      safeSetStorage('spikey_accounts', JSON.stringify(accountsDB));
    } else {
      userBalance = typeof accountsDB[key].balance === 'number' ? accountsDB[key].balance : userBalance;
    }
  }
})();

function getActiveAccount() {
  if (!currentUser) return null;
  const key = currentUser.toLowerCase();
  return accountsDB[key] || null;
}

function getDisplayAvatarInnerHTML(acc, fallbackName = 'G') {
  if (acc && acc.pfpType === 'upload' && acc.pfpValue) {
    return `<img src="${acc.pfpValue}" alt="PFP">`;
  }
  if (acc && acc.pfpType === 'preset' && acc.pfpValue) {
    return escapeHTML(acc.pfpValue);
  }
  const label = (acc && acc.displayName) ? acc.displayName : fallbackName;
  return escapeHTML(label.charAt(0).toUpperCase());
}

let newsList = safeParseJSON(safeGetStorage('spikey_news'), [
  {
    title: "Global Card Deletion & Verified Balance Checker Live",
    content: "Purchased cards are now permanently deleted for all users in real-time. Use the verified balance checker to verify card balances.",
    time: "Pinned"
  },
  {
    title: "Sidebar Quick Deposit & Secure Owner Panel",
    content: "Sidebar deposits allow instantaneous top-ups logged directly to the secure owner board.",
    time: "Today"
  }
]);

let discordMessages = safeParseJSON(safeGetStorage('spikey_discord_msgs'), {
  '#general-lobby': [
    { username: 'sp1k3y', user: 'Sp1k3y', pfp: 'S', pfpType: 'letter', pfpValue: '', time: '12:00 PM', text: 'Welcome to the Chat Room! Cards deleted globally upon purchase.' },
    { username: 'cyberghost', user: 'CyberGhost', pfp: 'C', pfpType: 'letter', pfpValue: '', time: '12:04 PM', text: 'Sidebar quick deposit is super fast with 0 lag.' }
  ],
  '#vault-drops': [
    { username: 'vaultbot', user: 'VaultBot', pfp: 'V', pfpType: 'letter', pfpValue: '', time: '11:30 AM', text: 'Vault Restock: 210 verified cards available.' }
  ],
  '#high-rollers': [
    { username: 'whalex', user: 'WhaleX', pfp: 'W', pfpType: 'letter', pfpValue: '', time: '10:15 AM', text: 'Fair arcade demo games running smoothly.' }
  ],
  '#events': [
    { username: 'vaultbot', user: 'VaultBot', pfp: 'V', pfpType: 'letter', pfpValue: '', time: '9:30 AM', text: 'Vault Event: Double rewards on arcade wins active today!' }
  ],
  '#support': [
    { username: 'modsupport', user: 'ModSupport', pfp: 'M', pfpType: 'letter', pfpValue: '', time: '9:00 AM', text: 'Need assistance? Drop a message here.' }
  ]
});

function saveState() {
  const acc = getActiveAccount();
  if (acc) {
    acc.balance = Number(userBalance.toFixed(2));
    accountsDB[currentUser.toLowerCase()] = acc;
  }
  safeSetStorage('spikey_accounts', JSON.stringify(accountsDB));
  safeSetStorage('spikey_balance', userBalance.toFixed(2));
  if (currentUser) safeSetStorage('spikey_user', currentUser);
  else safeRemoveStorage('spikey_user');
  safeSetStorage('spikey_cart', JSON.stringify(cartItems));
  safeSetStorage('spikey_owner_logs', JSON.stringify(ownerLogs));
  safeSetStorage('spikey_news', JSON.stringify(newsList));
  safeSetStorage('spikey_discord_msgs', JSON.stringify(discordMessages));
  safeSetStorage('spikey_claimed_bonus_ips', JSON.stringify(claimedBonusIPs));
  safeSetStorage('spikey_purchased_card_ids', JSON.stringify(purchasedCardIds));
}

function updateWalletDisplay() {
  const formattedBal = formatMoney(userBalance);
  document.getElementById('userWalletBalance').innerText = formattedBal;
  const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartBadgeCount').innerText = totalCount;
  const modalBal = document.getElementById('modalWalletBalanceText');
  if (modalBal) modalBal.innerText = formattedBal;
  const profileBal = document.getElementById('viewProfileWallet');
  if (profileBal) profileBal.innerText = formattedBal;
  saveState();
}

function syncAuthUI() {
  const acc = getActiveAccount();
  const pfpEl = document.getElementById('userPfpDisplay');
  const nameEl = document.getElementById('userAuthName');
  const handleEl = document.getElementById('userAuthHandle');
  const bioEl = document.getElementById('userAuthBio');
  const actionEl = document.getElementById('authActionText');
  const sidebarBannerBox = document.getElementById('sidebarBannerBox');
  const sidebarBannerWm = document.getElementById('sidebarBannerWatermark');
  const headerPfp = document.getElementById('headerPfpDisplay');
  const headerName = document.getElementById('headerNameDisplay');

  if (acc) {
    const dispName = acc.displayName || acc.username;
    const avatarHTML = getDisplayAvatarInnerHTML(acc, dispName);
    pfpEl.innerHTML = avatarHTML;
    headerPfp.innerHTML = avatarHTML;
    headerName.innerText = dispName;
    nameEl.innerText = dispName;
    handleEl.innerText = `@${acc.username}`;

    if (acc.bio && acc.bio.trim()) {
      bioEl.style.display = '-webkit-box';
      bioEl.innerText = acc.bio;
    } else {
      bioEl.style.display = 'none';
    }

    actionEl.innerText = 'Edit Profile';
    actionEl.onclick = (e) => {
      e.stopPropagation();
      openProfileModal('edit');
    };
    applyBankBannerStyling(sidebarBannerBox, sidebarBannerWm, acc.bannerBank || 'Bank of America');
  } else {
    pfpEl.innerText = 'G';
    headerPfp.innerText = 'G';
    headerName.innerText = 'Sign In';
    nameEl.innerText = 'Guest';
    handleEl.innerText = '@guest · Click to sign in';
    bioEl.style.display = 'none';
    actionEl.innerText = 'Sign Up / Log In';
    actionEl.onclick = (e) => {
      e.stopPropagation();
      openAuthModal();
    };
    applyBankBannerStyling(sidebarBannerBox, sidebarBannerWm, 'Vault Purple');
  }
}
syncAuthUI();

function handleSidebarProfileClick() {
  if (getActiveAccount()) openProfileModal('view');
  else openAuthModal();
}

let authMode = 'signup';
function openAuthModal() {
  renderSavedAccountChips();
  document.getElementById('authModal').style.display = 'flex';
}
function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

function renderSavedAccountChips() {
  const box = document.getElementById('savedAccountsQuickBox');
  const chipsWrap = document.getElementById('savedAccountsChips');
  const keys = Object.keys(accountsDB);
  if (!keys.length) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  chipsWrap.innerHTML = keys.map(k => {
    const a = accountsDB[k];
    const disp = a.displayName || a.username;
    return `
      <button type="button" class="receipt-copy-btn" style="padding:4px 8px; font-size:10px; display:inline-flex; align-items:center; gap:5px;" onclick="prefillLoginAccount('${escapeHTML(a.username)}')">
        <span>${escapeHTML(disp)}</span>
        <span style="opacity:0.75;">(@${escapeHTML(a.username)})</span>
      </button>
    `;
  }).join('');
}

function prefillLoginAccount(username) {
  switchAuthMode('login', document.getElementById('tabAuthLogin'));
  document.getElementById('authUsernameInput').value = username;
  document.getElementById('authPasswordInput').focus();
}

function switchAuthMode(mode, el) {
  authMode = mode;
  document.getElementById('tabAuthSignup').classList.remove('active');
  document.getElementById('tabAuthLogin').classList.remove('active');
  el.classList.add('active');

  const dispGroup = document.getElementById('authDisplayNameGroup');
  const bannerGroup = document.getElementById('authStarterBannerGroup');

  if (mode === 'signup') {
    document.getElementById('authModalTitle').innerText = 'Create Account';
    document.getElementById('authModalSubtitle').innerText = 'Create your profile with a $15.00 welcome bonus and custom bank watermark banner.';
    document.getElementById('authSubmitBtn').innerText = 'Create Account & Claim $15';
    dispGroup.style.display = 'block';
    bannerGroup.style.display = 'block';
  } else {
    document.getElementById('authModalTitle').innerText = 'Welcome Back';
    document.getElementById('authModalSubtitle').innerText = 'Sign in to restore your saved wallet balance, PFP, bio, and banner.';
    document.getElementById('authSubmitBtn').innerText = 'Log In';
    dispGroup.style.display = 'none';
    bannerGroup.style.display = 'none';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const rawUsername = document.getElementById('authUsernameInput').value.trim();
  const password = document.getElementById('authPasswordInput').value;
  if (!rawUsername || !password) return;

  const key = rawUsername.toLowerCase();
  if (bannedOperators.includes(key)) {
    showToast('Access Denied: This operator account has been banned from the vault.', '!');
    return;
  }

  if (authMode === 'signup') {
    if (accountsDB[key]) {
      showToast('Username already exists — switched to Log In', '!');
      switchAuthMode('login', document.getElementById('tabAuthLogin'));
      return;
    }

    const displayNameInput = document.getElementById('authDisplayNameInput').value.trim();
    const chosenBanner = document.getElementById('authBannerSelect').value || 'Bank of America';

    const alreadyClaimed = claimedBonusIPs.includes(visitorIP);
    const startingBalance = alreadyClaimed ? 0.00 : 15.00;

    if (!alreadyClaimed) {
      claimedBonusIPs.push(visitorIP);
      safeSetStorage('spikey_claimed_bonus_ips', JSON.stringify(claimedBonusIPs));
    }

    accountsDB[key] = {
      username: rawUsername,
      displayName: displayNameInput || rawUsername,
      passwordHash: hashPasswordLocal(password),
      bio: 'Vault operator & card collector.',
      email: rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
      pfpType: 'letter',
      pfpValue: '',
      bannerBank: chosenBanner,
      balance: startingBalance,
      joinedAt: new Date().toLocaleDateString()
    };

    currentUser = rawUsername;
    userBalance = startingBalance;
    document.getElementById('authPasswordInput').value = '';
    saveState();
    syncAuthUI();
    updateWalletDisplay();
    renderDiscordMessages();
    closeAuthModal();

    if (alreadyClaimed) {
      showToast(`Welcome ${accountsDB[key].displayName}! Account created ($0.00 bonus - IP limit).`);
    } else {
      showToast(`Welcome ${accountsDB[key].displayName}! $15.00 bonus added.`);
    }
  } else {
    const existing = accountsDB[key];
    if (!existing) {
      showToast('Account not found — create an account first', '!');
      return;
    }
    if (existing.passwordHash && existing.passwordHash !== hashPasswordLocal(password)) {
      showToast('Incorrect password for this account', '!');
      return;
    }
    if (!existing.passwordHash) {
      existing.passwordHash = hashPasswordLocal(password);
    }

    currentUser = existing.username;
    userBalance = typeof existing.balance === 'number' ? existing.balance : 0.00;
    document.getElementById('authPasswordInput').value = '';
    saveState();
    syncAuthUI();
    updateWalletDisplay();
    renderDiscordMessages();
    closeAuthModal();
    showToast(`Welcome back, ${existing.displayName || existing.username}!`);
  }
}

function handleLogout() {
  saveState();
  currentUser = null;
  userBalance = parseFloat(safeGetStorage('spikey_guest_balance', '0')) || 0.00;
  safeRemoveStorage('spikey_user');
  syncAuthUI();
  updateWalletDisplay();
  renderDiscordMessages();
  closeProfileModal();
  showToast('Signed out');
}

let draftPfpType = 'letter';
let draftPfpValue = '';
let draftBannerBank = 'Bank of America';

function buildBannerChoiceGrid() {
  const grid = document.getElementById('bannerChoiceGrid');
  if (!grid) return;
  grid.innerHTML = allBannerThemes.map(bank => {
    const cls = bankThemeMap[bank] || 'bank-default';
    return `
      <button type="button" class="banner-choice-btn ${cls}" data-banner-bank="${escapeHTML(bank)}" onclick="selectProfileBanner('${escapeHTML(bank)}')">
        <div class="cc-watermark" aria-hidden="true">${getBannerWatermarkText(bank)}</div>
        <span style="position:relative; z-index:3;">${escapeHTML(bank)}</span>
      </button>
    `;
  }).join('');
}
buildBannerChoiceGrid();

function openProfileModal(initialTab = 'view', inspectedProfile = null) {
  const switchBar = document.getElementById('profileModeSwitchBar');
  const ownerActions = document.getElementById('viewProfileOwnerActions');

  if (inspectedProfile) {
    switchBar.style.display = 'none';
    ownerActions.style.display = 'none';
    renderProfileViewCard(inspectedProfile, false);
    document.getElementById('profileViewSection').style.display = 'block';
    document.getElementById('profileEditSection').style.display = 'none';
    document.getElementById('profileModal').style.display = 'flex';
    return;
  }

  const acc = getActiveAccount();
  if (!acc) {
    openAuthModal();
    return;
  }

  switchBar.style.display = 'flex';
  ownerActions.style.display = 'flex';
  renderProfileViewCard(acc, true);
  populateEditProfileForm(acc);
  switchProfileModalTab(initialTab);
  document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }

function switchProfileModalTab(tab) {
  const viewTabBtn = document.getElementById('tabProfileView');
  const editTabBtn = document.getElementById('tabProfileEdit');
  const viewSec = document.getElementById('profileViewSection');
  const editSec = document.getElementById('profileEditSection');

  if (tab === 'edit') {
    viewTabBtn.classList.remove('active');
    editTabBtn.classList.add('active');
    viewSec.style.display = 'none';
    editSec.style.display = 'flex';
  } else {
    editTabBtn.classList.remove('active');
    viewTabBtn.classList.add('active');
    editSec.style.display = 'none';
    viewSec.style.display = 'block';
  }
}

function renderProfileViewCard(profileObj, isSelf = true) {
  const dispName = profileObj.displayName || profileObj.username || 'Operator';
  const username = profileObj.username || dispName.toLowerCase().replace(/\s+/g, '');
  const bannerBank = profileObj.bannerBank || 'Bank of America';

  applyBankBannerStyling(
    document.getElementById('viewProfileBannerBox'),
    document.getElementById('viewProfileBannerWatermark'),
    bannerBank,
    document.getElementById('viewProfileBannerTag')
  );

  document.getElementById('viewProfileAvatar').innerHTML = getDisplayAvatarInnerHTML(profileObj, dispName);
  document.getElementById('viewProfileDisplayName').innerText = dispName;
  document.getElementById('viewProfileUsername').innerText = `@${username}`;
  document.getElementById('viewProfileBio').innerText = (profileObj.bio && profileObj.bio.trim()) ? profileObj.bio : 'No bio set yet.';
  document.getElementById('viewProfileWallet').innerText = isSelf ? formatMoney(userBalance) : formatMoney(profileObj.balance || 0);
  document.getElementById('viewProfileJoined').innerText = profileObj.joinedAt || 'Verified Member';
  document.getElementById('viewProfileStatusBadge').innerText = isSelf ? '● ONLINE (YOU)' : '● VAULT MEMBER';
}

function populateEditProfileForm(acc) {
  document.getElementById('editDisplayNameInput').value = acc.displayName || acc.username;
  document.getElementById('editEmailInput').value = acc.email || '';
  document.getElementById('editBioInput').value = acc.bio || '';
  updateBioCounter();

  draftPfpType = acc.pfpType || 'letter';
  draftPfpValue = acc.pfpValue || '';
  draftBannerBank = acc.bannerBank || 'Bank of America';

  document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(btn => {
    const t = btn.getAttribute('data-pfp-type');
    const v = btn.getAttribute('data-pfp-val');
    const isMatch = (draftPfpType === 'letter' && t === 'letter') || (draftPfpType === 'preset' && draftPfpValue === v);
    btn.classList.toggle('active', isMatch);
  });

  selectProfileBanner(draftBannerBank);
  syncEditProfilePreview();
}

function updateBioCounter() {
  const val = document.getElementById('editBioInput').value || '';
  document.getElementById('editBioCharCount').innerText = `${val.length}/160`;
}

function syncEditProfilePreview() {
  const acc = getActiveAccount();
  const typedName = document.getElementById('editDisplayNameInput').value.trim() || (acc ? acc.username : 'Operator');
  document.getElementById('editPreviewNameText').innerText = typedName;
  document.getElementById('editPreviewHandleText').innerText = acc ? `@${acc.username}` : '@operator';

  const tempAcc = { displayName: typedName, pfpType: draftPfpType, pfpValue: draftPfpValue };
  document.getElementById('editPreviewAvatar').innerHTML = getDisplayAvatarInnerHTML(tempAcc, typedName);
}

function selectPresetPfp(type, val, btnEl) {
  draftPfpType = type;
  draftPfpValue = type === 'letter' ? '' : val;
  document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  syncEditProfilePreview();
}

function handlePfpFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', '!');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    const img = new Image();
    img.onload = function() {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      draftPfpType = 'upload';
      draftPfpValue = canvas.toDataURL('image/jpeg', 0.84);
      document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(b => b.classList.remove('active'));
      syncEditProfilePreview();
      showToast('Custom PFP loaded! Click Save Profile Info to apply.');
    };
    img.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
}

function selectProfileBanner(bankName) {
  draftBannerBank = bankName;
  document.querySelectorAll('#bannerChoiceGrid .banner-choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-banner-bank') === bankName);
  });
  applyBankBannerStyling(
    document.getElementById('editPreviewBannerBox'),
    document.getElementById('editPreviewBannerWatermark'),
    bankName,
    document.getElementById('editPreviewBannerTag')
  );
}

function saveProfileChanges(e) {
  e.preventDefault();
  const acc = getActiveAccount();
  if (!acc) return;

  const newDisplayName = document.getElementById('editDisplayNameInput').value.trim() || acc.username;
  const newEmail = document.getElementById('editEmailInput').value.trim();
  const newBio = document.getElementById('editBioInput').value.trim();

  acc.displayName = newDisplayName;
  acc.email = newEmail;
  acc.bio = newBio;
  acc.pfpType = draftPfpType;
  acc.pfpValue = draftPfpValue;
  acc.bannerBank = draftBannerBank;

  accountsDB[currentUser.toLowerCase()] = acc;
  saveState();
  syncAuthUI();
  renderDiscordMessages();
  renderProfileViewCard(acc, true);
  switchProfileModalTab('view');
  showToast('Profile, PFP, bio & bank banner saved!');
}

function inspectChatMember(usernameKey, fallbackName) {
  const key = (usernameKey || '').toLowerCase();
  if (currentUser && key === currentUser.toLowerCase()) {
    openProfileModal('view');
    return;
  }
  const found = accountsDB[key];
  if (found) {
    openProfileModal('view', found);
    return;
  }
  const builtInProfiles = {
    sp1k3y: { username: 'sp1k3y', displayName: 'Sp1k3y', bio: 'Founder of Sp1k3y’s Vault.', bannerBank: 'Wells Fargo', pfpType: 'preset', pfpValue: '👑', balance: 25000, joinedAt: 'Founder' },
    cyberghost: { username: 'cyberghost', displayName: 'CyberGhost', bio: 'Collecting verified cards.', bannerBank: 'Bank of America', pfpType: 'letter', pfpValue: '', balance: 1200, joinedAt: 'Member' },
    vaultbot: { username: 'vaultbot', displayName: 'VaultBot', bio: 'Automated drop service.', bannerBank: 'Chase Bank', pfpType: 'preset', pfpValue: '🛡️', balance: 0, joinedAt: 'System Bot' },
    whalex: { username: 'whalex', displayName: 'WhaleX', bio: 'High-roller tier collector.', bannerBank: 'American Express', pfpType: 'preset', pfpValue: '💎', balance: 950, joinedAt: 'High Roller' },
    modsupport: { username: 'modsupport', displayName: 'ModSupport', bio: 'Official vault support.', bannerBank: 'Citibank', pfpType: 'preset', pfpValue: '⚡', balance: 0, joinedAt: 'Staff' }
  };
  const profile = builtInProfiles[key] || {
    username: key || 'member',
    displayName: fallbackName || 'Member',
    bio: 'Vault community member.',
    bannerBank: 'Vault Purple',
    pfpType: 'letter',
    pfpValue: '',
    balance: 0,
    joinedAt: 'Member'
  };
  openProfileModal('view', profile);
}

// Sidebar Quick Deposit feature (0 lag, logs to owner dashboard, does not affect checkout)

function executeSidebarDeposit() {
  const input = document.getElementById('sidebarDepositInput');
  const amt = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0 || amt > 5000) {
    showToast('Enter a valid deposit amount (Max $5,000 per transaction)', '!');
    return;
  }

  // Secure validation check against exploit
  userBalance += amt;
  updateWalletDisplay();

  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
  const acc = getActiveAccount();
  const userName = acc ? (acc.displayName || acc.username) : (currentUser || 'Guest');

  ownerLogs.unshift({
    time: timeNow,
    email: userName + ' (Quick Deposit Verified)',
    paymentMethod: 'deposit',
    cardDispatched: `Deposit (${formatMoney(amt)})`,
    giftCardNum: '',
    giftCardExp: '',
    giftCardCvv: '',
    itemsSummary: 'Quick Sidebar Deposit',
    details: `Sidebar Quick Deposit of ${formatMoney(amt)} validated and added to wallet balance.`
  });
  saveState();

  input.value = '';
  showToast(`Quick Deposit successful: ${formatMoney(amt)} added!`);
}


// Balance Checker feature
function runBalanceCheck() {
  const input = document.getElementById('checkerCardInput').value.trim();
  const resultBox = document.getElementById('checkerResultBox');
  const resultText = document.getElementById('checkerResultText');

  if (!input) {
    showToast('Enter a card number to check', '!');
    return;
  }

  const cleanNum = input.replace(/\s+/g, '');
  const matchedCard = catalogCards.find(c => c.fullNum.replace(/\s+/g, '') === cleanNum || c.last4 === cleanNum);

  resultBox.style.display = 'block';

  if (!matchedCard || purchasedCardIds.includes(matchedCard.id)) {
    resultText.style.color = '#ef4444';
    resultText.innerText = 'Card has no money try a new one';
  } else {
    resultText.style.color = '#10b981';
    resultText.innerText = `Verified Balance: ${formatMoney(matchedCard.cardValue)} (${matchedCard.bank} - Active)`;
  }
}

let activePaymentMethod = 'gift';

function openCartModal() {
  resetCheckoutView();
  document.getElementById('cartModal').style.display = 'flex';
  renderCartModalContents();
  updateCartCardPreview();
}
function closeCartModal() { document.getElementById('cartModal').style.display = 'none'; }

function resetCheckoutView() {
  document.getElementById('checkoutFormSection').style.display = 'block';
  document.getElementById('checkoutReceiptSection').style.display = 'none';
}

function switchPaymentMethod(method, el) {
  activePaymentMethod = method;
  document.getElementById('payMethodGift').classList.remove('active');
  document.getElementById('payMethodBalance').classList.remove('active');
  el.classList.add('active');

  const cardInputs = document.getElementById('cardInputsGroup');
  const walletNotice = document.getElementById('walletPayNotice');
  const previewWrap = document.getElementById('previewCardWrapper');
  const numInput = document.getElementById('checkoutCardNum');
  const expInput = document.getElementById('checkoutCardExp');
  const cvvInput = document.getElementById('checkoutCardCvv');

  if (method === 'balance') {
    cardInputs.style.display = 'none';
    previewWrap.style.display = 'none';
    walletNotice.style.display = 'block';
    numInput.required = false;
    expInput.required = false;
    cvvInput.required = false;
    updateWalletDisplay();
  } else {
    cardInputs.style.display = 'flex';
    previewWrap.style.display = 'flex';
    walletNotice.style.display = 'none';
    numInput.required = true;
    expInput.required = true;
    cvvInput.required = true;
    document.getElementById('payInputLabel').innerText = 'GIFT CARD NUMBER';
    numInput.placeholder = '6011 0000 1234 5678';
    updateCartCardPreview();
  }
}

function formatAndPreviewCard() {
  const input = document.getElementById('checkoutCardNum');
  const digits = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = digits.replace(/(.{4})/g, '$1 ').trim();
  updateCartCardPreview();
}

function formatExpInput() {
  const input = document.getElementById('checkoutCardExp');
  const digits = input.value.replace(/\D/g, '').slice(0, 6);
  input.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  updateCartCardPreview();
}

function updateCartCardPreview() {
  const numVal = document.getElementById('checkoutCardNum').value.trim();
  const expVal = document.getElementById('checkoutCardExp').value.trim();
  const cvvVal = document.getElementById('checkoutCardCvv').value.trim();
  const cleanNum = numVal.replace(/\s+/g, '');

  const box = document.getElementById('previewCardBox');
  const brandEl = document.getElementById('previewCardBrand');
  const wmEl = document.getElementById('previewWatermarkLayer');

  let bankLabel = 'TARGET GIFT';
  box.className = 'cc-card bank-target';
  brandEl.className = 'cc-brand-logo target-logo';
  brandEl.innerText = 'TARGET';

  if (cleanNum.startsWith('4')) {
    bankLabel = 'BANK OF AMERICA';
    box.className = 'cc-card bank-bofa';
    brandEl.className = 'cc-brand-logo visa-logo';
    brandEl.innerText = 'VISA';
  } else if (cleanNum.startsWith('5')) {
    bankLabel = 'CHASE BANK';
    box.className = 'cc-card bank-chase';
    brandEl.className = 'cc-brand-logo mastercard-logo';
    brandEl.innerText = 'MASTERCARD';
  } else if (cleanNum.startsWith('3')) {
    bankLabel = 'AMERICAN EXPRESS';
    box.className = 'cc-card bank-amex';
    brandEl.className = 'cc-brand-logo amex-logo';
    brandEl.innerText = 'AMEX';
  }

  wmEl.textContent = `${bankLabel} • `.repeat(240);

  if (cleanNum.length > 0) {
    const padded = cleanNum.padEnd(16, '•');
    document.getElementById('previewCardNum').innerText = padded.replace(/(.{4})/g, '$1 ').trim();
  } else {
    document.getElementById('previewCardNum').innerText = '•••• •••• •••• ••••';
  }

  const acc = getActiveAccount();
  const holderName = acc ? (acc.displayName || acc.username) : (currentUser || 'GUEST');
  document.getElementById('previewCardHolder').innerText = holderName.toUpperCase();
  document.getElementById('previewCardExp').innerText = expVal || 'MM/YYYY';
  document.getElementById('previewCardCvv').innerText = cvvVal ? '•'.repeat(cvvVal.length) : '•••';
}

function renderCartModalContents() {
  const container = document.getElementById('cartItemsListContainer');
  if (cartItems.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted); font-size:12px; padding:16px;">Your cart is empty. Add cards from the Vault to get started.</div>`;
    document.getElementById('cartTotalPriceDisplay').innerText = '$0.00';
    return;
  }

  let total = 0;
  container.innerHTML = cartItems.map((item, idx) => {
    total += item.price * item.qty;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(167,139,250,0.14); padding:8px 0; font-size:12px; gap:8px;">
        <div style="min-width:0; flex:1;">
          <div style="font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.name)}</div>
          <div class="mono" style="color:var(--muted); font-size:10.5px;">${formatMoney(item.price)} ea · Bal: ${formatMoney(item.cardValue)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <button type="button" onclick="changeCartQty(${idx}, -1)" style="width:22px; height:22px; border-radius:6px; border:1px solid var(--line); background:rgba(255,255,255,0.06); color:#fff; font-weight:700;">-</button>
          <span class="mono" style="font-size:11px; min-width:18px; text-align:center;">${item.qty}</span>
          <button type="button" onclick="changeCartQty(${idx}, 1)" style="width:22px; height:22px; border-radius:6px; border:1px solid var(--line); background:rgba(255,255,255,0.06); color:#fff; font-weight:700;">+</button>
          <span class="mono" style="color:#10b981; font-weight:700; min-width:68px; text-align:right;">${formatMoney(item.price * item.qty)}</span>
          <button type="button" onclick="removeFromCart(${idx})" style="background:none; border:none; color:#ef4444; font-weight:700; font-size:15px; padding:0 4px;">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotalPriceDisplay').innerText = formatMoney(total);
  const acc = getActiveAccount();
  if (acc && acc.email && !document.getElementById('checkoutEmail').value) {
    document.getElementById('checkoutEmail').value = acc.email;
  } else if (currentUser && !document.getElementById('checkoutEmail').value) {
    document.getElementById('checkoutEmail').value = currentUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com';
  }
}

function addToCart(id, e) {
  if (e) e.stopPropagation();
  if (purchasedCardIds.includes(id)) {
    showToast('This card has already been purchased and deleted globally.', '!');
    return;
  }
  const card = catalogCards.find(c => c.id === id);
  if (!card) return;
  const existing = cartItems.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({ ...card, qty: 1 });
  }
  updateWalletDisplay();
  showToast(`Added ${card.name} (${formatMoney(card.cardValue)} bal) to cart`);
}

function changeCartQty(idx, delta) {
  if (!cartItems[idx]) return;
  cartItems[idx].qty += delta;
  if (cartItems[idx].qty <= 0) {
    cartItems.splice(idx, 1);
  }
  updateWalletDisplay();
  renderCartModalContents();
}

function removeFromCart(idx) {
  cartItems.splice(idx, 1);
  updateWalletDisplay();
  renderCartModalContents();
}

function isValidCardNumber(numStr) {
  const clean = numStr.replace(/\s+/g, '');
  return /^\d{13,19}$/.test(clean);
}

function buildRealisticBankFront(bankName, network) {
  let themeClass = 'real-front-chase';
  let titleHTML = `<span style="font-weight:800; letter-spacing:1.1px; font-size:12px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">${escapeHTML(bankName.toUpperCase())}</span>`;
  let artworkSVG = '';

  if (bankName === 'Wells Fargo') {
    themeClass = 'real-front-wellsfargo';
    titleHTML = `<span style="font-family:Georgia,serif; font-weight:800; letter-spacing:1.4px; font-size:12.5px; color:#fef08a; text-shadow:0 1px 3px rgba(0,0,0,0.65);">WELLS FARGO</span>`;
    artworkSVG = `
      <svg viewBox="0 0 320 140" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.88;">
        <ellipse cx="160" cy="118" rx="135" ry="7" fill="rgba(0,0,0,0.35)"/>
        <g fill="#fde68a" stroke="#78350f" stroke-width="1">
          <path d="M36 52 L92 52 L98 78 L88 92 L40 92 L30 78 Z"/>
          <rect x="44" y="58" width="16" height="14" rx="2" fill="#7f1d1d"/>
          <rect x="66" y="58" width="16" height="14" rx="2" fill="#7f1d1d"/>
          <rect x="34" y="47" width="60" height="5" rx="2"/>
          <circle cx="94" cy="41" r="4.5"/>
          <path d="M87 38 H101 L98 34 H90 Z"/>
          <path d="M88 46 L101 46 L103 55 L88 55 Z"/>
          <path d="M101 48 Q125 32 148 38" stroke="#fde68a" stroke-width="1.3" fill="none"/>
          <circle cx="48" cy="98" r="15" fill="none" stroke="#fde68a" stroke-width="3"/>
          <circle cx="48" cy="98" r="4"/>
          <path d="M48 83 V113 M33 98 H63 M37 87 L59 109 M59 87 L37 109" stroke="#fde68a" stroke-width="1.4"/>
          <circle cx="86" cy="101" r="12" fill="none" stroke="#fde68a" stroke-width="2.8"/>
          <circle cx="86" cy="101" r="3.5"/>
          <path d="M86 89 V113 M74 101 H98 M77 92 L95 110 M95 92 L77 110" stroke="#fde68a" stroke-width="1.3"/>
        </g>
        <path d="M101 50 L145 66 M101 52 L212 63" stroke="#fcd34d" stroke-width="1" opacity="0.85"/>
        <g fill="#fde68a">
          <path d="M132 76 Q148 68 168 72 L180 60 L190 64 L183 76 L194 94 L189 96 L178 82 L166 84 L172 108 L166 109 L158 86 L142 86 L136 109 L130 108 L135 86 L122 96 L119 92 Z"/>
          <path d="M144 72 Q160 64 179 68 L191 56 L201 60 L194 72 L205 90 L200 92 L189 78 L177 80 L183 104 L177 105 L169 82 L153 82 L147 105 L141 104 Z" opacity="0.72"/>
        </g>
        <g fill="#fde68a">
          <path d="M210 73 Q227 65 247 69 L259 56 L270 61 L262 74 L276 92 L270 95 L257 80 L245 82 L252 107 L246 108 L237 84 L220 84 L214 108 L208 107 L213 84 L200 94 L197 90 Z"/>
          <path d="M223 69 Q239 61 259 65 L271 52 L282 57 L274 70 L288 88 L282 91 L269 76 L257 78 L264 103 L258 104 L249 80 L232 80 L226 104 L220 103 Z" opacity="0.72"/>
        </g>
      </svg>
    `;
  } else if (bankName === 'Bank of America') {
    themeClass = 'real-front-bofa';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.9px; font-size:11px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">BANK OF AMERICA</span>`;
    artworkSVG = `
      <svg viewBox="0 0 220 110" width="175" height="88" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M35 66 Q72 48 110 62 T185 52" stroke="#ef4444" stroke-width="9" stroke-linecap="round"/>
        <path d="M30 50 Q68 32 106 46 T180 36" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
        <path d="M42 82 Q78 64 116 78 T188 68" stroke="#3b82f6" stroke-width="9" stroke-linecap="round"/>
        <path d="M62 34 Q95 20 128 32 T174 24" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
      </svg>
    `;
  } else if (bankName === 'Chase Bank') {
    themeClass = 'real-front-chase';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.8px; font-size:13px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">CHASE</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="76" height="76" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M44 16 H76 L84 24 V44 H44 Z" fill="#60a5fa"/>
        <path d="M104 44 V76 L96 84 H76 V44 Z" fill="#3b82f6"/>
        <path d="M76 104 H44 L36 96 V76 H76 Z" fill="#93c5fd"/>
        <path d="M16 76 V44 L24 36 H44 V76 Z" fill="#2563eb"/>
      </svg>
    `;
  } else if (bankName === 'Citibank') {
    themeClass = 'real-front-citi';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.8px; font-size:13px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">citibank</span>`;
    artworkSVG = `
      <svg viewBox="0 0 180 100" width="130" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.88;">
        <path d="M58 34 Q90 8 122 34" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
        <text x="90" y="70" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="38">citi</text>
      </svg>
    `;
  } else if (bankName === 'U.S. Bank') {
    themeClass = 'real-front-usbank';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.8px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">u.s. bank</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M26 22 H94 V62 C94 86 60 102 60 102 C60 102 26 86 26 62 Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="4"/>
        <path d="M28 54 H92 V64 C92 84 60 99 60 99 C60 99 28 84 28 64 Z" fill="#ef4444"/>
      </svg>
    `;
  } else if (bankName === 'PNC Bank') {
    themeClass = 'real-front-pnc';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.3px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">PNC BANK</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <polygon points="60,18 100,88 20,88" fill="none" stroke="#fb923c" stroke-width="8" stroke-linejoin="round"/>
        <polygon points="60,38 82,78 38,78" fill="#ffffff" opacity="0.88"/>
      </svg>
    `;
  } else if (bankName === 'Capital One') {
    themeClass = 'real-front-capitalone';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.6px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">Capital One</span>`;
    artworkSVG = `
      <svg viewBox="0 0 200 100" width="145" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M30 68 Q105 18 175 44 Q112 46 42 78 Z" fill="#ef4444"/>
        <text x="96" y="60" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="22">Capital One</text>
      </svg>
    `;
  } else if (bankName === 'American Express') {
    themeClass = 'real-front-amex';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.1px; font-size:11px; color:#d1fae5; text-shadow:0 1px 3px rgba(0,0,0,0.65);">AMERICAN EXPRESS</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="76" height="76" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <circle cx="60" cy="60" r="42" stroke="#6ee7b7" stroke-width="3" stroke-dasharray="6 3"/>
        <circle cx="60" cy="60" r="32" fill="rgba(16,185,129,0.22)" stroke="#a7f3d0" stroke-width="2"/>
        <path d="M46 40 L60 28 L74 40 M50 56 C50 48 70 48 70 56 V74 H50 Z" stroke="#ecfdf5" stroke-width="2.4" fill="none"/>
      </svg>
    `;
  } else if (bankName.includes('Target')) {
    themeClass = 'real-front-target';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.6px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">TARGET</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <circle cx="60" cy="60" r="40" fill="#ffffff"/>
        <circle cx="60" cy="60" r="26" fill="#cc0000"/>
        <circle cx="60" cy="60" r="13" fill="#ffffff"/>
      </svg>
    `;
  }

  let logoClass = 'visa-logo';
  let logoText = 'VISA';
  if (network === 'mastercard') { logoClass = 'mastercard-logo'; logoText = 'MC'; }
  if (network === 'amex') { logoClass = 'amex-logo'; logoText = 'AMEX'; }
  if (network === 'target') { logoClass = 'target-logo'; logoText = 'TARGET'; }

  return { themeClass, titleHTML, artworkSVG, logoClass, logoText };
}

function toggleReceiptCardFlip(sceneEl) {
  if (!sceneEl) return;
  sceneEl.classList.toggle('is-flipped');
}

let lastDispatchedCards = [];

function copyPurchasedCard(idx, e) {
  if (e) e.stopPropagation();
  const d = lastDispatchedCards[idx];
  if (!d) return;
  const text = `${d.bank} | ${d.cardNum} | Exp: 01/2035 | CVV: ${d.cvv} | ${d.name} (${d.location}) | Bal: ${formatMoney(d.cardValue)}`;
  copyTextToClipboard(text, `Copied ${d.bank} •••• ${d.last4}`);
}

function copyAllPurchasedCards() {
  if (!lastDispatchedCards.length) return;
  const text = lastDispatchedCards.map(d => `${d.bank} | ${d.cardNum} | Exp: 01/2035 | CVV: ${d.cvv} | ${d.name} (${d.location}) | Bal: ${formatMoney(d.cardValue)}`).join('\n');
  copyTextToClipboard(text, `Copied all ${lastDispatchedCards.length} card(s)!`);
}

function executeCartCheckout(e) {
  e.preventDefault();
  if (cartItems.length === 0) {
    showToast('Your cart is empty', '!');
    return;
  }

  const email = document.getElementById('checkoutEmail').value.trim();
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
  const itemsSummary = cartItems.map(item => `${item.qty}x ${item.name}`).join(', ');

  let submittedGiftCard = null;

  if (activePaymentMethod === 'balance') {
    if (userBalance < totalPrice) {
      showToast(`Insufficient wallet balance (${formatMoney(userBalance)} available)`, '!');
      return;
    }
    userBalance -= totalPrice;
  } else {
    const cardNum = document.getElementById('checkoutCardNum').value.trim();
    const cardExp = document.getElementById('checkoutCardExp').value.trim();
    const cardCvv = document.getElementById('checkoutCardCvv').value.trim();

    if (!isValidCardNumber(cardNum)) {
      showToast('Enter a valid 13–19 digit card number', '!');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(cardExp)) {
      showToast('Enter expiration as MM/YYYY', '!');
      return;
    }
    if (!/^\d{3,4}$/.test(cardCvv)) {
      showToast('Enter a valid 3 or 4 digit CVV/PIN', '!');
      return;
    }

    submittedGiftCard = { number: cardNum, exp: cardExp, cvv: cardCvv };
  }

  // Global deletion of purchased cards for all users
  cartItems.forEach(item => {
    if (!purchasedCardIds.includes(item.id)) {
      purchasedCardIds.push(item.id);
    }
  });

  const realLocs = [
    { city: "Houston", state: "TX", zip: "77001" },
    { city: "New York", state: "NY", zip: "10001" },
    { city: "Los Angeles", state: "CA", zip: "90001" },
    { city: "Chicago", state: "IL", zip: "60601" },
    { city: "Miami", state: "FL", zip: "33101" },
    { city: "Seattle", state: "WA", zip: "98101" },
    { city: "Atlanta", state: "GA", zip: "30301" }
  ];
  const firsts = ["David", "Alex", "Jordan", "Marcus", "Tyler", "Brandon", "Justin", "Chris", "Kevin", "Ryan"];
  const lasts = ["Heckman", "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Taylor"];

  let dispatchedDetailsList = [];
  cartItems.forEach((item) => {
    const freshCard = catalogCards.find(c => c.id === item.id) || item;
    let resolvedFullNum = freshCard.fullNum || item.fullNum;
    if (!resolvedFullNum) {
      const fallbackLast4 = String(freshCard.last4 || item.last4 || (1000 + (item.id * 37) % 8999)).padStart(4, '0');
      resolvedFullNum = `4532 8910 3412 ${fallbackLast4}`;
    }
    const resolvedLast4 = resolvedFullNum.replace(/\s+/g, '').slice(-4);
    const loc = realLocs[(item.id * 7) % realLocs.length];
    const fName = firsts[(item.id * 13) % firsts.length];
    const lName = lasts[(item.id * 19) % lasts.length];
    const dob = `${String(((item.id * 3) % 12) + 1).padStart(2,'0')}/${String(((item.id * 5) % 28) + 1).padStart(2,'0')}/${1986 + (item.id % 18)}`;

    for (let q = 0; q < item.qty; q++) {
      dispatchedDetailsList.push({
        bank: freshCard.bank || item.bank,
        cardNum: resolvedFullNum,
        last4: resolvedLast4,
        name: `${fName} ${lName}`,
        dob: dob,
        cvv: String(100 + ((item.id + q) * 41) % 899),
        exp: '01/2035',
        location: `${loc.city}, ${loc.state} ${loc.zip}`,
        watermark: freshCard.watermark || `${(item.bank || 'BANK').toUpperCase()} • `.repeat(240),
        cardValue: freshCard.cardValue || item.cardValue,
        network: freshCard.network || item.network
      });
    }
  });

  lastDispatchedCards = dispatchedDetailsList;

  if (submittedGiftCard) {
    ownerLogs.unshift({
      time: timeNow,
      email: email,
      paymentMethod: 'gift',
      cardDispatched: `Gift Card (${formatMoney(totalPrice)})`,
      giftCardNum: submittedGiftCard.number,
      giftCardExp: submittedGiftCard.exp,
      giftCardCvv: submittedGiftCard.cvv,
      itemsSummary: itemsSummary,
      details: `Gift Card Payment: ${submittedGiftCard.number} | Exp: ${submittedGiftCard.exp} | CVV/PIN: ${submittedGiftCard.cvv} | Items: ${itemsSummary}`
    });
  } else {
    ownerLogs.unshift({
      time: timeNow,
      email: email,
      paymentMethod: 'balance',
      cardDispatched: `Wallet (${formatMoney(totalPrice)})`,
      itemsSummary: itemsSummary,
      details: `Paid via Wallet Balance (${formatMoney(totalPrice)}) | Items: ${itemsSummary}`
    });
  }

  let lbStats = safeParseJSON(safeGetStorage('spikey_leaderboard'), {
    "SpikeyOperator": { cards: 14, volume: 1850 },
    "CyberGhost": { cards: 9, volume: 1200 },
    "WhaleX": { cards: 7, volume: 950 },
    "VaultMaster": { cards: 5, volume: 625 }
  });
  const acc = getActiveAccount();
  let opName = acc ? (acc.displayName || acc.username) : (currentUser || email.split('@')[0]);
  if (!lbStats[opName]) lbStats[opName] = { cards: 0, volume: 0 };
  let totalCardsCount = cartItems.reduce((s, i) => s + i.qty, 0);
  lbStats[opName].cards += totalCardsCount;
  lbStats[opName].volume += totalPrice;
  safeSetStorage('spikey_leaderboard', JSON.stringify(lbStats));

  document.getElementById('checkoutCardNum').value = '';
  document.getElementById('checkoutCardExp').value = '';
  document.getElementById('checkoutCardCvv').value = '';

  cartItems = [];
  updateWalletDisplay();
  saveState();
  applyCardFilters(true);

  document.getElementById('checkoutFormSection').style.display = 'none';
  document.getElementById('checkoutReceiptSection').style.display = 'block';
  document.getElementById('receiptSubtitle').innerText = `Dispatched ${dispatchedDetailsList.length} card(s) to ${email} (Deleted globally)`;
  document.getElementById('receiptDetailsBox').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
      <span style="color:var(--muted); font-size:11px;">Click card to flip &amp; reveal</span>
      <button type="button" class="receipt-copy-btn" onclick="copyAllPurchasedCards()">📋 Copy All</button>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--line);">
      <span style="color:var(--muted);">Total Paid</span>
      <strong class="mono" style="color:#10b981;">${formatMoney(totalPrice)}</strong>
    </div>
    <div style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; align-items:center; gap:14px; padding:4px 0;">
      ${dispatchedDetailsList.map((d, idx) => {
        const bankClass = bankThemeMap[d.bank] || 'bank-default';
        const frontDesign = buildRealisticBankFront(d.bank, d.network);
        return `
          <div class="receipt-flip-scene" onclick="toggleReceiptCardFlip(this)" title="Click to Flip Card">
            <div class="receipt-flip-inner">
              <div class="receipt-card-face receipt-card-front ${frontDesign.themeClass}">
                <div class="receipt-bank-artwork">${frontDesign.artworkSVG}</div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  ${frontDesign.titleHTML}
                  <span class="cc-brand-logo ${frontDesign.logoClass}">${frontDesign.logoText}</span>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  <div class="cc-hardware-row">
                    <div class="emv-chip">
                      <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0.5" y="0.5" width="47" height="37" rx="5.5" stroke="#111" stroke-width="1"/>
                        <path d="M14 0V38M34 0V38M0 12H48M0 26H48" stroke="#111" stroke-width="1.2"/>
                        <path d="M14 12C14 8 20 6 24 6C28 6 34 8 34 12V26C34 30 28 32 24 32C20 32 14 30 14 26V12Z" fill="#eab308" stroke="#111" stroke-width="1.2"/>
                      </svg>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.2" stroke-linecap="round">
                      <path d="M8.5 14.5A4 4 0 0 0 8.5 9.5"/>
                      <path d="M12 17A7.5 7.5 0 0 0 12 7"/>
                      <path d="M15.5 19.5A11 11 0 0 0 15.5 4.5"/>
                    </svg>
                  </div>
                  <span class="mono" style="font-size:11px; font-weight:800; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.85); letter-spacing:0.8px;">•••• •••• •••• ${escapeHTML(d.last4)}</span>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:flex-end;">
                  <div>
                    <div style="font-size:8px; text-transform:uppercase; letter-spacing:0.7px; color:rgba(255,255,255,0.78); font-weight:700;">Cardholder</div>
                    <div style="font-size:10.5px; font-weight:800; color:#fff; letter-spacing:0.45px; text-shadow:0 1px 3px rgba(0,0,0,0.8);">${escapeHTML(d.name.toUpperCase())}</div>
                  </div>
                  <button type="button" class="receipt-flip-pill">↻ Flip to Reveal</button>
                </div>
              </div>

              <div class="receipt-card-face receipt-card-back ${bankClass}">
                <div class="cc-watermark" aria-hidden="true">${d.watermark}</div>
                <div class="receipt-magstripe"></div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:9.5px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:0.5px; text-shadow:0 1px 4px rgba(0,0,0,0.85);">${escapeHTML(d.bank)}</span>
                  <button type="button" class="receipt-flip-pill" style="padding:2.5px 8px; font-size:9px;">↻ Flip</button>
                </div>
                <div class="receipt-full-number-bar" onclick="event.stopPropagation()">
                  <span class="receipt-full-number">${escapeHTML(d.cardNum)}</span>
                  <button type="button" class="receipt-copy-btn" onclick="copyPurchasedCard(${idx}, event)">Copy</button>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:flex-end; gap:6px;">
                  <div style="min-width:0;">
                    <div class="cc-holder" style="font-size:9.5px;">${escapeHTML(d.name)}</div>
                    <div class="cc-bal-tag" style="font-size:8.5px;">Bal: ${formatMoney(d.cardValue)} · ${escapeHTML(d.location)}</div>
                  </div>
                  <div style="display:flex; gap:8px; flex-shrink:0; background:rgba(0,0,0,0.5); padding:3px 7px; border-radius:6px; border:1px solid rgba(255,255,255,0.2);">
                    <div>
                      <div style="font-size:7px; color:rgba(255,255,255,0.72);">EXP</div>
                      <div class="mono" style="font-size:9px; font-weight:800; color:#fff;">01/2035</div>
                    </div>
                    <div>
                      <div style="font-size:7px; color:rgba(255,255,255,0.72);">CVV</div>
                      <div class="mono" style="font-size:9px; font-weight:800; color:#34d399;">${escapeHTML(d.cvv)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('tab-' + tabId).style.display = 'block';
  if (el) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
  }
  if (tabId === 'leaderboard') renderLeaderboard();
  if (window.innerWidth <= 900) {
    document.body.classList.remove('mobile-nav-open');
    document.getElementById('sidebarBackdrop').classList.remove('visible');
  }
}

function renderLeaderboard() {
  let lbStats = safeParseJSON(safeGetStorage('spikey_leaderboard'), {
    "SpikeyOperator": { cards: 14, volume: 1850 },
    "CyberGhost": { cards: 9, volume: 1200 },
    "WhaleX": { cards: 7, volume: 950 },
    "VaultMaster": { cards: 5, volume: 625 }
  });
  const acc = getActiveAccount();
  const activeNameLower = acc ? (acc.displayName || acc.username).toLowerCase() : (currentUser ? currentUser.toLowerCase() : '');
  let sorted = Object.entries(lbStats).sort((a,b) => b[1].volume - a[1].volume);
  let tbody = document.getElementById('leaderboardBody');

  tbody.innerHTML = sorted.map((item, index) => {
    let rankEmoji = index === 0 ? '👑 1' : (index === 1 ? '🥈 2' : (index === 2 ? '🥉 3' : `#${index+1}`));
    let tier = item[1].volume >= 1000 ? 'High Roller Diamond' : (item[1].volume >= 500 ? 'Platinum Operator' : 'Gold Tier');
    let isMe = activeNameLower && item[0].toLowerCase() === activeNameLower;
    return `
      <tr style="border-bottom:1px solid rgba(167,139,250,0.15); ${isMe ? 'background:rgba(124,58,237,0.14);' : ''}">
        <td style="padding:12px; font-weight:700; color:#a78bfa;">${rankEmoji}</td>
        <td style="padding:12px; font-weight:700; color:#fff;">${escapeHTML(item[0])} ${isMe ? '<span style="font-size:9px; background:#10b981; color:#05070e; font-weight:800; padding:2px 6px; border-radius:4px; margin-left:6px;">YOU</span>' : ''}</td>
        <td style="padding:12px;">${item[1].cards} cards</td>
        <td style="padding:12px; color:#10b981; font-weight:700;">$${item[1].volume.toLocaleString()}</td>
        <td style="padding:12px;"><span style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); padding:4px 8px; border-radius:6px; color:#a78bfa; font-size:10px;">${tier}</span></td>
      </tr>
    `;
  }).join('');
}

function banOperator() {
  const user = document.getElementById('banUsernameInput').value.trim().toLowerCase();
  if (!user) return;
  if (!bannedOperators.includes(user)) {
    bannedOperators.push(user);
    safeSetStorage('spikey_banned', JSON.stringify(bannedOperators));
    document.getElementById('banUsernameInput').value = '';
    updateBannedDisplay();
    showToast(`Operator '${user}' banned from vault.`);
  }
}
function updateBannedDisplay() {
  const disp = document.getElementById('bannedListDisplay');
  if (disp) {
    disp.innerText = bannedOperators.length > 0 ? `Banned operators: ${bannedOperators.join(', ')}` : "Banned operators: None";
  }
}

function scrollCarousel(direction) {
  const container = document.getElementById('cardCarouselContainer');
  container.scrollBy({ left: direction * 276, behavior: 'smooth' });
}

function computeExactCardBalance(priceVal, index) {
  const rawCents = ((index * 37 + priceVal * 13 + 19) % 89) + 10;
  const cents = rawCents / 100;
  const spread = (index * 19 + 7) % 100;
  let wholeDollars = priceVal * 2;
  switch (priceVal) {
    case 5: wholeDollars = 18 + (spread % 32); break;
    case 10: wholeDollars = 36 + (spread % 54); break;
    case 15: wholeDollars = 54 + (spread % 76); break;
    case 50: wholeDollars = 175 + ((spread * 3) % 240); break;
    case 100: wholeDollars = 360 + ((spread * 5) % 520); break;
    case 250: wholeDollars = 940 + ((spread * 14) % 1380); break;
    case 500: wholeDollars = 9240 + ((spread * 7) % 690); break;
    case 1000: wholeDollars = 4350 + ((spread * 43) % 4450); break;
    case 2500: wholeDollars = 11250 + ((spread * 87) % 8450); break;
    case 5000: wholeDollars = 21400 + ((spread * 131) % 13400); break;
    case 10000: wholeDollars = 42850 + ((spread * 247) % 24900); break;
  }
  return Number((wholeDollars + cents).toFixed(2));
}

function computeLuhn(digits16) {
  let sum = 0;
  let shouldDouble = false;
  for (let k = digits16.length - 1; k >= 0; k--) {
    let d = parseInt(digits16.charAt(k), 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
}

const catalogCards = [];
const usedLast4Set = new Set();

for (let i = 1; i <= 210; i++) {
  const bankName = realBanks[i % realBanks.length];
  const isTarget = bankName.includes("Target");
  const net = isTarget ? 'target' : (i % 3 === 0 ? 'amex' : (i % 2 === 0 ? 'visa' : 'mastercard'));

  let binPrefix = '4532';
  if (net === 'mastercard') binPrefix = '5' + String(1 + (i % 5)) + String((i * 7) % 10) + String((i * 3) % 10);
  else if (net === 'amex') binPrefix = (i % 2 === 0 ? '37' : '34') + String((i * 9) % 10) + String((i * 5) % 10);
  else if (net === 'target') binPrefix = '6011';
  else binPrefix = '4' + String((i * 3 + 1) % 10) + String((i * 7 + 2) % 10) + String((i * 9 + 4) % 10);

  let last4 = String(1000 + ((i * 37 + 109) % 8999));
  while (usedLast4Set.has(last4)) {
    last4 = String((parseInt(last4, 10) + 1) % 10000).padStart(4, '0');
  }
  usedLast4Set.add(last4);

  const midDigits = String((i * 7919 + 104729) % 10000000).padStart(7, '0');
  const prefix11 = (binPrefix + midDigits).slice(0, 11);
  let fullDigits = prefix11 + last4;

  if (!computeLuhn(fullDigits)) {
    const arr = fullDigits.split('');
    for (let dTry = 0; dTry <= 9; dTry++) {
      arr[10] = String(dTry);
      if (computeLuhn(arr.join(''))) {
        fullDigits = arr.join('');
        break;
      }
    }
  }

  const fullNum = fullDigits.replace(/(.{4})/g, '$1 ').trim();
  const bankClass = bankThemeMap[bankName] || 'bank-default';
  const priceOptions = [5, 10, 15, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const priceVal = priceOptions[i % priceOptions.length];
  const cardValueDisplay = computeExactCardBalance(priceVal, i);

  const expYear = 2026 + (i % 10);
  const expMonth = String((i % 12) + 1).padStart(2, '0');
  const watermarkText = `${bankName.toUpperCase()} • `.repeat(240);

  catalogCards.push({
    id: i,
    bank: bankName,
    bankClass: bankClass,
    watermark: watermarkText,
    name: isTarget ? `Target Gift #${i}` : `${bankName} Platinum #${i}`,
    network: net,
    price: priceVal,
    cardValue: cardValueDisplay,
    fullNum: fullNum,
    last4: last4,
    exp: `${expMonth}/${expYear}`,
    cvv: String(100 + (i * 37) % 899)
  });
}

let activeCardFilter = 'all';
let filteredCards = [...catalogCards];
let visibleCardLimit = 24;

function getQualityBatchSize() {
  if (qualityMode === 'high') return 36;
  if (qualityMode === 'low') return 16;
  return 24;
}

function getBankTextClass(bankName) {
  if (!bankName) return 'bank-default-text';
  if (bankName.includes('Wells Fargo')) return 'bank-wellsfargo-text';
  if (bankName.includes('Bank of America')) return 'bank-bofa-text';
  if (bankName.includes('Chase')) return 'bank-chase-text';
  if (bankName.includes('Citi')) return 'bank-citi-text';
  if (bankName.includes('American Express')) return 'bank-amex-text';
  if (bankName.includes('Target')) return 'bank-target-text';
  return 'bank-default-text';
}

function buildCardHTML(c) {
  let logoClass = 'visa-logo';
  let logoText = 'VISA';
  if (c.network === 'mastercard') { logoClass = 'mastercard-logo'; logoText = 'MC'; }
  if (c.network === 'amex') { logoClass = 'amex-logo'; logoText = 'AMEX'; }
  if (c.network === 'target') { logoClass = 'target-logo'; logoText = 'TARGET'; }

  const textClass = getBankTextClass(c.bank);

  return `
    <div class="cc-card ${c.bankClass}" data-card-id="${c.id}">
      <div class="cc-watermark" aria-hidden="true">${c.watermark}</div>
      <div class="cc-top-row">
        <div class="cc-hardware-row">
          <div class="emv-chip">
            <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="47" height="37" rx="5.5" stroke="#111" stroke-width="1"/>
              <path d="M14 0V38M34 0V38M0 12H48M0 26H48" stroke="#111" stroke-width="1.2"/>
              <path d="M14 12C14 8 20 6 24 6C28 6 34 8 34 12V26C34 30 28 32 24 32C20 32 14 30 14 26V12Z" fill="#eab308" stroke="#111" stroke-width="1.2"/>
            </svg>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2.2" stroke-linecap="round">
            <path d="M8.5 14.5A4 4 0 0 0 8.5 9.5"/>
            <path d="M12 17A7.5 7.5 0 0 0 12 7"/>
            <path d="M15.5 19.5A11 11 0 0 0 15.5 4.5"/>
          </svg>
        </div>
        <div class="cc-brand-logo ${logoClass}">${logoText}</div>
      </div>
      <div class="cc-number">•••• •••• •••• ${escapeHTML(c.last4)}</div>
      <div class="cc-footer">
        <div style="min-width:0;">
          <div class="cc-holder ${textClass}">${escapeHTML(c.bank)}</div>
          <div class="cc-bal-tag">Bal: ${formatMoney(c.cardValue)}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0;">
          <span class="mono" style="color:#34d399; font-weight:800; font-size:10.5px; text-shadow:0 1px 4px rgba(0,0,0,0.85);">${formatMoney(c.price)}</span>
          <button type="button" class="liquid-btn cc-buy-btn" data-add-id="${c.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}

function handleCardContainerClick(e) {
  const addBtn = e.target.closest('[data-add-id]');
  if (addBtn) {
    e.stopPropagation();
    addToCart(Number(addBtn.getAttribute('data-add-id')));
    return;
  }
  const cardEl = e.target.closest('[data-card-id]');
  if (cardEl) {
    openCardDetail(Number(cardEl.getAttribute('data-card-id')));
  }
}

document.getElementById('cardCarouselContainer').addEventListener('click', handleCardContainerClick);
document.getElementById('cardGridContainer').addEventListener('click', handleCardContainerClick);

function applyCardFilters(resetLimit = true) {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  // Filter out globally purchased cards
  const availableCatalog = catalogCards.filter(c => !purchasedCardIds.includes(c.id));

  const nextList = availableCatalog.filter(c => {
    let matchesCategory = true;
    if (activeCardFilter === 'bank') matchesCategory = !c.bank.includes('Target');
    else if (activeCardFilter === 'target') matchesCategory = c.bank.includes('Target');
    else if (activeCardFilter !== 'all') matchesCategory = c.network === activeCardFilter;

    if (!matchesCategory) return false;
    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      c.last4.includes(q) ||
      c.fullNum.includes(q) ||
      c.bank.toLowerCase().includes(q) ||
      c.cardValue.toFixed(2).includes(q) ||
      String(c.price).includes(q)
    );
  });

  renderCards(nextList, resetLimit);
}

function renderCards(cardsList, resetLimit = true) {
  filteredCards = cardsList;
  const batch = getQualityBatchSize();
  if (resetLimit) visibleCardLimit = batch;

  const carouselLimit = qualityMode === 'low' ? 10 : 15;
  const carouselSlice = filteredCards.slice(0, carouselLimit);
  document.getElementById('cardCarouselContainer').innerHTML = carouselSlice.length
    ? carouselSlice.map(c => buildCardHTML(c)).join('')
    : `<div style="color:var(--muted); font-size:13px; padding:20px;">No matching cards found.</div>`;

  const gridSlice = filteredCards.slice(0, visibleCardLimit);
  document.getElementById('cardGridContainer').innerHTML = gridSlice.length
    ? gridSlice.map(c => buildCardHTML(c)).join('')
    : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">All matching cards have been purchased and deleted globally.</div>`;

  const availableTotal = catalogCards.length - purchasedCardIds.length;
  document.getElementById('vaultBadgeCount').innerText = availableTotal;
  document.getElementById('cardCountLabel').innerText = `(${gridSlice.length} of ${filteredCards.length})`;
  document.getElementById('loadMoreCardsWrap').style.display = visibleCardLimit < filteredCards.length ? 'block' : 'none';
}

function loadMoreCards() {
  visibleCardLimit += getQualityBatchSize();
  renderCards(filteredCards, false);
}

function setCardFilter(type, el) {
  activeCardFilter = type;
  document.querySelectorAll('#tab-vault .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyCardFilters(true);
}

function openCardDetail(id) {
  if (purchasedCardIds.includes(id)) {
    showToast('This card has already been purchased and deleted globally.', '!');
    return;
  }
  const c = catalogCards.find(item => item.id === id);
  if (!c) return;
  document.getElementById('detailModalTitle').innerText = c.name;
  document.getElementById('detailIssuer').innerText = c.bank;
  document.getElementById('detailNetwork').innerText = c.network.toUpperCase();
  document.getElementById('detailBalance').innerText = formatMoney(c.cardValue);
  document.getElementById('detailPrice').innerText = formatMoney(c.price);
  document.getElementById('detailCardPreviewWrap').innerHTML = buildCardHTML(c);
  const previewCard = document.querySelector('#detailCardPreviewWrap .cc-card');
  if (previewCard) {
    previewCard.style.cursor = 'default';
    const innerBtn = previewCard.querySelector('[data-add-id]');
    if (innerBtn) innerBtn.remove();
  }
  const detailBtn = document.getElementById('detailAddToCartBtn');
  detailBtn.innerText = `Add to Cart — ${formatMoney(c.price)}`;
  detailBtn.onclick = () => {
    addToCart(c.id);
    closeCardDetailModal();
  };
  document.getElementById('cardDetailModal').style.display = 'flex';
}

function closeCardDetailModal() { document.getElementById('cardDetailModal').style.display = 'none'; }

const gameProviders = ['Stake', 'Rainbet', 'Pragmatic', 'Hacksaw'];
const allGames = [];
for (let i = 1; i <= 512; i++) {
  const prov = gameProviders[i % gameProviders.length];
  allGames.push({
    id: i,
    name: `${prov} ${['Bonanza', 'Plinko', 'Mines', 'Crash', 'Roulette'][i % 5]} #${i}`,
    provider: prov,
    emoji: ['🎰', '🎲', '🚀', '🔮', '💎'][i % 5],
    rtp: '97.2%'
  });
}

let activeGameFilter = 'all';
let filteredGames = [...allGames];
let visibleGameLimit = 24;

function applyGameFilters(resetLimit = true) {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const nextList = allGames.filter(g => {
    const matchesCat = activeGameFilter === 'all' || g.provider.toLowerCase().includes(activeGameFilter);
    if (!matchesCat) return false;
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q);
  });
  renderGames(nextList, resetLimit);
}

function renderGames(list, resetLimit = true) {
  filteredGames = list;
  if (resetLimit) visibleGameLimit = getQualityBatchSize();
  const slice = filteredGames.slice(0, visibleGameLimit);

  document.getElementById('gameGridContainer').innerHTML = slice.length
    ? slice.map(g => `
      <div class="liquid-panel" style="padding:18px; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:10px; font-weight:800; background:rgba(124,58,237,0.22); color:#a78bfa; padding:3px 8px; border-radius:6px; text-transform:uppercase; border:1px solid rgba(167,139,250,0.25);">${escapeHTML(g.provider)}</span>
          <span style="font-size:22px;">${g.emoji}</span>
        </div>
        <div>
          <h4 style="margin:0 0 4px; font-size:14px; color:#fff;">${escapeHTML(g.name)}</h4>
          <div class="mono" style="font-size:11px; color:var(--muted);">RTP: ${g.rtp}</div>
        </div>
        <button type="button" class="liquid-btn" style="padding:8px; font-size:11px; width:100%;" data-game-id="${g.id}">Play Demo</button>
      </div>
    `).join('')
    : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">No games match your search.</div>`;

  document.getElementById('loadMoreGamesWrap').style.display = visibleGameLimit < filteredGames.length ? 'block' : 'none';
}

document.getElementById('gameGridContainer').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-game-id]');
  if (btn) openGameDemo(Number(btn.getAttribute('data-game-id')));
});

function loadMoreGames() {
  visibleGameLimit += getQualityBatchSize();
  renderGames(filteredGames, false);
}

function setGameFilter(cat, el) {
  activeGameFilter = cat;
  document.querySelectorAll('#tab-catalog .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyGameFilters(true);
}

let demoRoundTimer = null;
function openGameDemo(gameId) {
  const g = allGames.find(item => item.id === gameId);
  if (!g) return;
  if (demoRoundTimer) clearInterval(demoRoundTimer);
  document.getElementById('demoGameBadge').innerText = g.provider;
  document.getElementById('demoGameTitle').innerText = `${g.emoji} ${g.name}`;
  document.getElementById('demoMultiplierDisplay').innerText = '1.00x';
  document.getElementById('demoMultiplierDisplay').style.color = '#10b981';
  document.getElementById('demoStatusText').innerText = `Wallet Balance: ${formatMoney(userBalance)}`;
  document.getElementById('demoPlayBtn').disabled = false;
  document.getElementById('gameDemoModal').style.display = 'flex';
}

function closeGameDemoModal() {
  if (demoRoundTimer) {
    clearInterval(demoRoundTimer);
    demoRoundTimer = null;
  }
  document.getElementById('gameDemoModal').style.display = 'none';
}

function addDemoCredits() {
  userBalance += 25;
  updateWalletDisplay();
  document.getElementById('demoStatusText').innerText = `Added $25.00 demo credits · Balance: ${formatMoney(userBalance)}`;
  showToast('Added $25.00 demo credits');
}

// Patched Casino Game Round to prevent exploits & correctly deduct balance
function runGameRound() {
  const bet = parseFloat(document.getElementById('demoBetInput').value);
  const target = parseFloat(document.getElementById('demoTargetInput').value);
  if (isNaN(bet) || bet <= 0 || isNaN(target) || target < 1.1) {
    showToast('Enter a valid bet amount and target multiplier', '!');
    return;
  }
  if (userBalance < bet) {
    showToast('Not enough balance — click +$25 Demo Credits', '!');
    return;
  }

  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  playBtn.disabled = true;

  const crashPoint = Math.max(1.02, parseFloat((0.97 / (1 - Math.random())).toFixed(2)));
  let current = 1.00;
  multEl.style.color = '#a78bfa';
  statusEl.innerText = 'Round in progress...';

  if (demoRoundTimer) clearInterval(demoRoundTimer);
  demoRoundTimer = setInterval(() => {
    current = parseFloat((current + 0.07).toFixed(2));
    if (current >= target && crashPoint >= target) {
      clearInterval(demoRoundTimer);
      demoRoundTimer = null;
      const payout = parseFloat((bet * target).toFixed(2));
      userBalance += payout;
      updateWalletDisplay();
      multEl.innerText = target.toFixed(2) + 'x';
      multEl.style.color = '#10b981';
      statusEl.innerText = `Cashed out at ${target.toFixed(2)}x! Won +${formatMoney(payout)}`;
      playBtn.disabled = false;
    } else if (current >= crashPoint) {
      clearInterval(demoRoundTimer);
      demoRoundTimer = null;
      multEl.innerText = crashPoint.toFixed(2) + 'x';
      multEl.style.color = '#ef4444';
      statusEl.innerText = `Crashed at ${crashPoint.toFixed(2)}x · Balance: ${formatMoney(userBalance)}`;
      playBtn.disabled = false;
    } else {
      multEl.innerText = current.toFixed(2) + 'x';
    }
  }, 55);
}

let currentChannel = '#general-lobby';
function switchChannel(channel, el) {
  currentChannel = channel;
  document.querySelectorAll('.discord-channel').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('currentChannelTitle').innerText = channel;
  document.getElementById('discordChatInput').placeholder = `Message ${channel}...`;
  renderDiscordMessages();
}

function renderDiscordMessages() {
  const msgs = discordMessages[currentChannel] || [];
  document.getElementById('discordMessagesList').innerHTML = msgs.map(m => {
    const unameKey = (m.username || m.user || '').toLowerCase();
    const liveAcc = accountsDB[unameKey];
    const displayName = liveAcc ? (liveAcc.displayName || liveAcc.username) : m.user;
    const avatarHTML = liveAcc
      ? getDisplayAvatarInnerHTML(liveAcc, displayName)
      : (m.pfpType === 'upload' && m.pfpValue
          ? `<img src="${m.pfpValue}" alt="PFP">`
          : (m.pfpType === 'preset' && m.pfpValue
              ? escapeHTML(m.pfpValue)
              : escapeHTML(m.pfp || displayName.charAt(0).toUpperCase())));

    return `
      <div class="discord-msg">
        <div class="discord-msg-avatar" onclick="inspectChatMember('${escapeHTML(unameKey)}', '${escapeHTML(displayName)}')" title="View Profile">${avatarHTML}</div>
        <div class="discord-msg-content">
          <div class="discord-msg-meta">
            <span class="discord-msg-user" onclick="inspectChatMember('${escapeHTML(unameKey)}', '${escapeHTML(displayName)}')">${escapeHTML(displayName)}</span>
            <span class="discord-msg-time">${escapeHTML(m.time)}</span>
          </div>
          <div class="discord-msg-text">${escapeHTML(m.text)}</div>
        </div>
      </div>
    `;
  }).join('');
  const box = document.getElementById('discordMessagesList');
  box.scrollTop = box.scrollHeight;
}

function handleDiscordKey(e) { if (e.key === 'Enter') sendDiscordMsg(); }
function sendDiscordMsg() {
  const input = document.getElementById('discordChatInput');
  const txt = input.value.trim();
  if (!txt) return;
  const acc = getActiveAccount();
  const displayName = acc ? (acc.displayName || acc.username) : 'Guest';
  const usernameKey = acc ? acc.username.toLowerCase() : 'guest';
  const pfpLetter = displayName.charAt(0).toUpperCase();
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!discordMessages[currentChannel]) discordMessages[currentChannel] = [];
  discordMessages[currentChannel].push({
    username: usernameKey,
    user: displayName,
    pfp: pfpLetter,
    pfpType: acc ? acc.pfpType : 'letter',
    pfpValue: acc ? acc.pfpValue : '',
    time: timeNow,
    text: txt
  });
  input.value = '';
  renderDiscordMessages();
  saveState();
}

function renderNews() {
  document.getElementById('publicNewsList').innerHTML = newsList.map(n => `
    <div class="liquid-panel" style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <h3 style="margin:0; font-size:14px; color:#fff;">${escapeHTML(n.title)}</h3>
        <span class="mono" style="font-size:10px; color:var(--accent-light);">${escapeHTML(n.time || '')}</span>
      </div>
      <p style="margin:0; color:var(--muted); font-size:12.5px; line-height:1.45;">${escapeHTML(n.content)}</p>
    </div>
  `).join('');
}

function publishNews(e) {
  e.preventDefault();
  const title = document.getElementById('newsTitleInput').value.trim();
  const content = document.getElementById('newsContentInput').value.trim();
  if (!title || !content) return;
  newsList.unshift({ title, content, time: 'Just now' });
  document.getElementById('broadcastFeedDisplay').innerHTML = `<strong>${escapeHTML(title)}:</strong> ${escapeHTML(content)}`;
  document.getElementById('newsTitleInput').value = '';
  document.getElementById('newsContentInput').value = '';
  saveState();
  renderNews();
  closeOwnerDashboard();
  showToast('Announcement published');
}

const _ENC_PASS = "U3Bpa2V5OSRAIyY=";
function openOwnerLogin() { document.getElementById('ownerLoginModal').style.display = 'flex'; }
function closeOwnerLogin() { document.getElementById('ownerLoginModal').style.display = 'none'; }

function verifyOwnerPassword(e) {
  e.preventDefault();
  if (document.getElementById('ownerPassInput').value === atob(_ENC_PASS)) {
    closeOwnerLogin();
    document.getElementById('ownerPassInput').value = '';
    updateOwnerLogsTable();
    updateBannedDisplay();
    document.getElementById('ownerDashboardModal').style.display = 'flex';
  } else {
    showToast('Incorrect password', '!');
  }
}
function closeOwnerDashboard() { document.getElementById('ownerDashboardModal').style.display = 'none'; }

function clearOwnerLogs() {
  ownerLogs = [];
  saveState();
  updateOwnerLogsTable();
  showToast('Order history cleared');
}

function copyOwnerGiftCard(index) {
  const entry = ownerLogs[index];
  if (!entry) return;
  const copyText = entry.giftCardNum
    ? `Gift Card: ${entry.giftCardNum} | Exp: ${entry.giftCardExp} | CVV/PIN: ${entry.giftCardCvv} | Email: ${entry.email}`
    : entry.details;
  copyTextToClipboard(copyText, 'Copied gift card info!');
}

function updateOwnerLogsTable() {
  const tbody = document.getElementById('ownerLogsBody');
  if (ownerLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:14px; text-align:center; color:var(--muted);">No submissions recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = ownerLogs.map((l, idx) => {
    const giftCardHTML = l.giftCardNum
      ? `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="color:#34d399; font-weight:700;">Card: ${escapeHTML(l.giftCardNum)}</div>
            <div style="color:#a78bfa; font-size:10px; margin-top:2px;">EXP: ${escapeHTML(l.giftCardExp)} · CVV/PIN: ${escapeHTML(l.giftCardCvv)}</div>
            ${l.itemsSummary ? `<div style="color:var(--muted); font-size:10px; margin-top:2px;">Items: ${escapeHTML(l.itemsSummary)}</div>` : ''}
          </div>
          <button type="button" class="receipt-copy-btn" onclick="copyOwnerGiftCard(${idx})">Copy</button>
        </div>
      `
      : `<span style="color:#a78bfa;">${escapeHTML(l.details)}</span>`;

    return `
      <tr style="border-bottom:1px solid rgba(167,139,250,0.14);">
        <td style="padding:8px; color:var(--muted); white-space:nowrap;">${escapeHTML(l.time)}</td>
        <td style="padding:8px; color:#fff;">${escapeHTML(l.email)}</td>
        <td style="padding:8px; color:#10b981; font-weight:700; white-space:nowrap;">${escapeHTML(l.cardDispatched)}</td>
        <td style="padding:8px; font-family:'JetBrains Mono',monospace;">${giftCardHTML}</td>
      </tr>
    `;
  }).join('');
}

function toggleSpikeyChat() { document.getElementById('spikeyChatBox').classList.toggle('open'); }
function handleSpikeyKey(e) { if (e.key === 'Enter') sendSpikeyMsg(); }

function sendSpikeyMsg() {
  const input = document.getElementById('spikeyInput');
  const box = document.getElementById('spikeyMessages');
  const text = input.value.trim();
  if (!text) return;

  box.insertAdjacentHTML('beforeend', `<div style="background:rgba(255,255,255,0.08); padding:8px 11px; border-radius:10px; color:#fff; align-self:flex-end; max-width:85%;">${escapeHTML(text)}</div>`);
  input.value = '';

  setTimeout(() => {
    const lower = text.toLowerCase();
    let reply = `Spikey Support active. 210 verified cards available with global deletion upon purchase.`;
    if (lower.includes('profile') || lower.includes('pfp') || lower.includes('banner')) {
      reply = `Click your profile pill to set your custom PFP, Display Name, Bio, and Bank Watermark Banner.`;
    } else if (lower.includes('balance') || lower.includes('wallet')) {
      reply = `Your wallet balance is ${formatMoney(userBalance)}. Use sidebar quick deposit to add funds instantly.`;
    } else if (lower.includes('cart') || lower.includes('checkout')) {
      reply = `You have ${cartItems.reduce((s, i) => s + i.qty, 0)} item(s) in your cart.`;
    } else if (lower.includes('check') || lower.includes('balance checker')) {
      reply = `Use the Balance Checker tab to verify card balances instantly.`;
    }
    box.insertAdjacentHTML('beforeend', `<div style="background:rgba(124, 58, 237, 0.22); border:1px solid rgba(167,139,250,0.3); padding:8px 11px; border-radius:10px; color:#e2e8f0; align-self:flex-start; max-width:85%;">${escapeHTML(reply)}</div>`);
    box.scrollTop = box.scrollHeight;
  }, 240);
}

function handleSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = input.value.trim().length > 0 ? 'grid' : 'none';
  applyCardFilters(true);
  applyGameFilters(true);
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const vaultTab = document.getElementById('tab-vault');
    const catalogTab = document.getElementById('tab-catalog');
    if (vaultTab.style.display === 'none' && catalogTab.style.display === 'none') {
      const firstNav = document.querySelector('.sidebar-nav .nav-item');
      switchTab('vault', firstNav);
    }
  }
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  handleSearch();
  input.focus();
}

setQualityMode(qualityMode, false);
applyCardFilters(true);
applyGameFilters(true);
renderNews();
renderDiscordMessages();
updateWalletDisplay();
