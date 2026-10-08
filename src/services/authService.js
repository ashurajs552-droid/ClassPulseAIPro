import { getSupabaseClient } from './supabaseClient';

export async function getCurrentUser() {
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
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

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim()
      }
    }
  });

  if (error) throw error;

  return {
    user: data.user,
    session: data.session,
    needsConfirmation: !data.session
  };
}

export async function resendConfirmationEmail(email) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
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
    callback(session?.user || null);
  });

  return () => {
    subscription?.unsubscribe();
  };
}
