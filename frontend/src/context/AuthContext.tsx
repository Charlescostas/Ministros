import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, getUsuario, getToken, limparSessao, salvarSessao } from '../api/client';

interface AuthContextType {
  usuario: string | null;
  autenticado: boolean;
  entrar: (username: string, password: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(() =>
    getToken() ? getUsuario() : null,
  );

  const entrar = useCallback(async (username: string, password: string) => {
    const resposta = await api<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    salvarSessao(resposta.token, resposta.username);
    setUsuario(resposta.username);
  }, []);

  const sair = useCallback(async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch {
      // ignora: o token sera descartado de qualquer forma
    }
    limparSessao();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, autenticado: !!usuario && !!getToken(), entrar, sair }),
    [usuario, entrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return contexto;
}
