import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  shop_name: string | null;
  is_seller: boolean;
  is_admin: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isSeller: boolean;
  isAdmin: boolean;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Переводим частые ошибки Supabase на русский
function translateError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes('invalid login credentials')) {
    return 'Неверная почта или пароль.';
  }
  if (text.includes('already registered')) {
    return 'Пользователь с такой почтой уже зарегистрирован.';
  }
  if (text.includes('at least 6 characters')) {
    return 'Пароль должен быть не короче 6 символов.';
  }
  if (text.includes('valid email') || text.includes('invalid email')) {
    return 'Введите корректный адрес почты.';
  }
  if (text.includes('email not confirmed')) {
    return 'Почта не подтверждена. Проверьте письмо от Supabase.';
  }
  if (text.includes('rate limit')) {
    return 'Слишком много попыток. Подождите немного и повторите.';
  }
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, shop_name, is_seller, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Supabase:', error);
    return null;
  }
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  // Для какого пользователя мы уже попытались загрузить профиль
  const [profileTriedFor, setProfileTriedFor] = useState<string | null>(null);

  useEffect(() => {
    // Текущая сессия при загрузке страницы
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSessionLoading(false);
    });

    // Реагируем на вход и выход
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Профиль грузим отдельно, когда меняется пользователь
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileTriedFor(null);
      return;
    }

    let cancelled = false;
    const userId = user.id;

    fetchProfile(userId).then((result) => {
      if (cancelled) return;
      setProfile(result);
      setProfileTriedFor(userId);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const profileReady = !user || profileTriedFor === user.id;
  const loading = sessionLoading || !profileReady;

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(translateError(error.message));

    // Если подтверждение почты включено, сессии сразу не будет
    return { needsConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(translateError(error.message));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isSeller: profile?.is_seller ?? false,
        isAdmin: profile?.is_admin ?? false,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth нужно использовать внутри <AuthProvider>');
  }
  return context;
}