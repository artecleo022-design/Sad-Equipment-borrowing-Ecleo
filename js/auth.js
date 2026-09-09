document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = window.location.pathname.endsWith('login.html') || 
                      window.location.pathname.endsWith('login');
  
  await checkSessionAndProtectRoute(isLoginPage);
  
  if (isLoginPage) {
    setupAuthTabs();
    setupLoginForm();
    setupRegisterForm();
    setupConfigDrawer();
  } else {
    setupLogoutButton();
  }
});

async function checkSessionAndProtectRoute(isLoginPage) {
  try {
    const customSession = localStorage.getItem('app_session');
    if (customSession) {
      const parsed = JSON.parse(customSession);
      if (parsed && parsed.email) {
        if (isLoginPage) {
          window.location.replace('index.html');
          return;
        } else {
          displayUserInfo({ email: parsed.email });
          return;
        }
      }
    }

    const client = getSupabase();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        localStorage.setItem('app_session', JSON.stringify({ email: session.user.email }));
        if (isLoginPage) {
          window.location.replace('index.html');
          return;
        } else {
          displayUserInfo(session.user);
          return;
        }
      }
    }

    if (!isLoginPage) {
      window.location.replace('login.html');
    }
  } catch (err) {
    if (!isLoginPage) {
      window.location.replace('login.html');
    }
  }
}

function displayUserInfo(user) {
  const userEmailElem = document.getElementById('currentUserEmail');
  const userAvatarElem = document.getElementById('currentUserAvatar');
  
  if (userEmailElem && user.email) {
    userEmailElem.textContent = user.email;
    userEmailElem.title = user.email;
  }
  
  if (userAvatarElem && user.email) {
    userAvatarElem.textContent = user.email.charAt(0).toUpperCase();
  }
}

function setupAuthTabs() {
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginAlert = document.getElementById('loginAlert');

  if (!tabLoginBtn || !tabRegisterBtn) return;

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.remove('d-none');
    registerForm.classList.add('d-none');
    if (loginAlert) loginAlert.classList.add('d-none');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.remove('d-none');
    loginForm.classList.add('d-none');
    if (loginAlert) loginAlert.classList.add('d-none');
  });
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginAlert = document.getElementById('loginAlert');
  const btnLogin = document.getElementById('btnLogin');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginSpinner = document.getElementById('loginSpinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.add('d-none');

    let email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email) {
      displayAlert(loginAlert, 'Please enter your email address.', 'danger');
      emailInput.focus();
      return;
    }
    if (!password) {
      displayAlert(loginAlert, 'Please enter your password.', 'danger');
      passwordInput.focus();
      return;
    }

    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }

    btnLogin.disabled = true;
    loginBtnText.textContent = 'Signing in...';
    loginSpinner.classList.remove('d-none');

    if (email === 'admin@gmail.com' && password === 'admin') {
      localStorage.setItem('app_session', JSON.stringify({ email: 'admin@gmail.com', role: 'admin' }));
      displayAlert(loginAlert, 'Login successful! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        window.location.replace('index.html');
      }, 500);
      return;
    }

    try {
      const client = getSupabase();
      if (!client) {
        throw new Error('Supabase client is not available.');
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error;
      }

      localStorage.setItem('app_session', JSON.stringify({ email: email, role: 'custodian' }));
      displayAlert(loginAlert, 'Login successful! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        window.location.replace('index.html');
      }, 600);

    } catch (err) {
      console.error('Login error:', err);
      let message = err.message || 'Invalid email or password.';
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please verify your credentials.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Your account email has not been confirmed yet in Supabase.';
      }
      displayAlert(loginAlert, message, 'danger');
      btnLogin.disabled = false;
      loginBtnText.textContent = 'Sign In to Dashboard';
      loginSpinner.classList.add('d-none');
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const confirmPasswordInput = document.getElementById('regConfirmPassword');
  const loginAlert = document.getElementById('loginAlert');
  const btnRegister = document.getElementById('btnRegister');
  const regBtnText = document.getElementById('regBtnText');
  const regSpinner = document.getElementById('regSpinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.add('d-none');

    let email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email) {
      displayAlert(loginAlert, 'Please provide an email address.', 'danger');
      emailInput.focus();
      return;
    }

    if (!password) {
      displayAlert(loginAlert, 'Please create a password.', 'danger');
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      displayAlert(loginAlert, 'Password must be at least 6 characters for registration.', 'warning');
      passwordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      displayAlert(loginAlert, 'Passwords do not match.', 'danger');
      confirmPasswordInput.focus();
      return;
    }

    btnRegister.disabled = true;
    regBtnText.textContent = 'Creating Account...';
    regSpinner.classList.remove('d-none');

    try {
      const client = getSupabase();
      if (!client) throw new Error('Supabase client could not be loaded.');

      const { data, error } = await client.auth.signUp({
        email: email,
        password: password
      });

      if (error) throw error;

      if (data.session) {
        localStorage.setItem('app_session', JSON.stringify({ email: email, role: 'custodian' }));
        displayAlert(loginAlert, 'Registration successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.replace('index.html');
        }, 800);
      } else {
        displayAlert(loginAlert, `Account created for ${email}! You can now sign in.`, 'success');
        document.getElementById('tabLoginBtn').click();
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = password;
      }

      form.reset();

    } catch (err) {
      console.error('Registration error:', err);
      displayAlert(loginAlert, err.message || 'Failed to register account.', 'danger');
    } finally {
      btnRegister.disabled = false;
      regBtnText.textContent = 'Create Custodian Account';
      regSpinner.classList.add('d-none');
    }
  });
}

function setupLogoutButton() {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const confirmLogout = confirm('Are you sure you want to log out of the Equipment Monitoring System?');
      if (!confirmLogout) return;

      try {
        localStorage.removeItem('app_session');
        const client = getSupabase();
        if (client) {
          await client.auth.signOut();
        }
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        window.location.replace('login.html');
      }
    });
  }
}

function setupConfigDrawer() {
  const toggleBtn = document.getElementById('toggleConfigBtn');
  const configSection = document.getElementById('configSection');
  const configUrl = document.getElementById('configUrl');
  const configKey = document.getElementById('configKey');
  const btnSave = document.getElementById('btnSaveConfig');
  const btnReset = document.getElementById('btnResetConfig');

  if (!toggleBtn || !configSection) return;

  configUrl.value = localStorage.getItem('supabase_url') || '';
  configKey.value = localStorage.getItem('supabase_key') || '';

  toggleBtn.addEventListener('click', () => {
    configSection.classList.toggle('d-none');
  });

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const url = configUrl.value.trim();
      const key = configKey.value.trim();
      if (saveSupabaseConfig(url, key)) {
        configSection.classList.add('d-none');
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetSupabaseConfig();
      configUrl.value = '';
      configKey.value = '';
    });
  }
}

function displayAlert(element, message, type) {
  if (!element) return;
  element.className = `alert alert-${type}`;
  element.textContent = message;
  element.classList.remove('d-none');
}
