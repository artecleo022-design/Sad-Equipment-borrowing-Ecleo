const DEFAULT_SUPABASE_URL =
    'https://nxajjznhwgmpifzmwnlb.supabase.co';

const DEFAULT_SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YWpqem5od2dtcGlmem13bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE3OTIsImV4cCI6MjEwNDQ3Nzc5Mn0.V8k9p51-Xaw4BUosRixPL39kGQ4eQ9s1rXTfcrs1--0';

const SUPABASE_URL =
    localStorage.getItem('supabase_url') ||
    DEFAULT_SUPABASE_URL;

const SUPABASE_ANON_KEY =
    localStorage.getItem('supabase_key') ||
    DEFAULT_SUPABASE_ANON_KEY;

let supabaseClient = null;

function initializeSupabase() {
    try {
        if (
            typeof window.supabase === 'undefined' ||
            !window.supabase.createClient
        ) {
            console.error('Supabase library was not loaded.');
            return null;
        }

        const url =
            localStorage.getItem('supabase_url') ||
            DEFAULT_SUPABASE_URL;

        const key =
            localStorage.getItem('supabase_key') ||
            DEFAULT_SUPABASE_ANON_KEY;

        supabaseClient = window.supabase.createClient(url, key);

        console.log('Supabase client initialized successfully.');

        return supabaseClient;

    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return null;
    }
}

initializeSupabase();

window.getSupabase = function () {
    if (!supabaseClient) {
        supabaseClient = initializeSupabase();
    }

    return supabaseClient;
};

window.isSupabaseConfigured = function () {
    const url =
        localStorage.getItem('supabase_url') ||
        DEFAULT_SUPABASE_URL;

    const key =
        localStorage.getItem('supabase_key') ||
        DEFAULT_SUPABASE_ANON_KEY;

    return (
        url &&
        key &&
        !url.includes('YOUR_SUPABASE') &&
        !key.includes('YOUR_SUPABASE')
    );
};

window.saveSupabaseConfig = function (url, key) {
    if (!url || !key) {
        if (typeof showToast === 'function') {
            showToast(
                'Please provide both Supabase URL and Publishable Key.',
                'error'
            );
        }

        return false;
    }

    localStorage.setItem('supabase_url', url.trim());
    localStorage.setItem('supabase_key', key.trim());

    supabaseClient = window.supabase.createClient(
        url.trim(),
        key.trim()
    );

    if (typeof showToast === 'function') {
        showToast(
            'Supabase settings saved successfully!',
            'success'
        );
    }

    return true;
};

window.resetSupabaseConfig = function () {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');

    supabaseClient = window.supabase.createClient(
        DEFAULT_SUPABASE_URL,
        DEFAULT_SUPABASE_ANON_KEY
    );

    if (typeof showToast === 'function') {
        showToast(
            'Supabase settings reset to default.',
            'info'
        );
    }
};

window.getTodayDateString = function () {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};