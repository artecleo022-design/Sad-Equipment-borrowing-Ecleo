const DEFAULT_SUPABASE_URL = 'https://nxajjznhwgmpifzmwnlb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YWpqem5od2dtcGlmem13bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE3OTIsImV4cCI6MjEwNDQ3Nzc5Mn0.V8k9p51-Xaw4BUosRixPL39kGQ4eQ9s1rXTfcrs1--0';

const SUPABASE_URL = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_ANON_KEY;

let supabaseClient = null;

function initializeSupabase() {
  try {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      return null;
    }

    const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_ANON_KEY;

    supabaseClient = window.supabase.createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
}

initializeSupabase();

window.getSupabase = function() {
  if (!supabaseClient) {
    supabaseClient = initializeSupabase();
  }
  return supabaseClient;
};

window.isSupabaseConfigured = function() {
  const url = localStorage.getItem('supabase_url') || SUPABASE_URL;
  const key = localStorage.getItem('supabase_key') || SUPABASE_ANON_KEY;
  return url && key && !url.includes('YOUR_SUPABASE') && !key.includes('YOUR_SUPABASE');
};

window.saveSupabaseConfig = function(url, key) {
  if (!url || !key) {
    showToast('Please provide both Supabase URL and Anon Key.', 'error');
    return false;
  }
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_key', key.trim());
  
  supabaseClient = window.supabase.createClient(url.trim(), key.trim());
  showToast('Supabase settings saved successfully!', 'success');
  return true;
};

window.resetSupabaseConfig = function() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
  supabaseClient = window.supabase.createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  showToast('Supabase settings reset to default.', 'info');
};

window.showToast = function(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:0.5rem;">
      <span>${iconMap[type] || 'ℹ️'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="background:none; border:none; cursor:pointer; color:#9d506d; font-size:1.1rem; line-height:1;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

window.escapeHtml = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
};

window.formatDate = function(dateString) {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
};

window.getTodayDateString = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};