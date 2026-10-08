import { getSupabaseClient } from './supabaseClient';

const DEMO_USER_KEY = 'classpulse_demo_user';

export async function getCurrentUser() {
  // 1. Check local demo session
  try {
    const rawDemo = localStorage.getItem(DEMO_USER_KEY);
    if (rawDemo) {
      return JSON.parse(rawDemo);
    }
  } catch (e) {
    console.warn('Error reading demo user:', e);
  }

  // 2. Check Supabase auth session
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session.user;
  } catch (err) {
    console.warn('Error checking Supabase session:', err);
    return null;
  }
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not available. Please verify credentials.');
  }

  // Clear demo session if signing in with Google
  localStorage.removeItem(DEMO_USER_KEY);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    throw error;
  }
  return data;
}

export async function signInWithEmail(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  localStorage.removeItem(DEMO_USER_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(email, password, fullName) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  localStorage.removeItem(DEMO_USER_KEY);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;
  return data.user;
}

export function loginAsDemo(customName = 'Dr. Evelyn Reed', email = 'faculty@classpulse.ai') {
  const demoUser = {
    id: 'demo-faculty-' + Date.now(),
    email,
    user_metadata: {
      full_name: customName,
      role: 'Faculty Instructor',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    isDemo: true
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export async function signOutUser() {
  localStorage.removeItem(DEMO_USER_KEY);
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error during Supabase signout:', e);
    }
  }
  return true;
}

export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback(session.user);
    } else {
      // Check if demo user exists
      const demo = localStorage.getItem(DEMO_USER_KEY);
      callback(demo ? JSON.parse(demo) : null);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
}
