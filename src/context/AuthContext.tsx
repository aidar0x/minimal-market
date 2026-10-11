import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Текущая сессия при загрузке страницы
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Реагируем на вход и выход
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
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