const TOKEN_KEY = 'escala.token';
const USER_KEY = 'escala.usuario';

export class ApiError extends Error {
  status: number;
  campos?: Record<string, string>;

  constructor(status: number, message: string, campos?: Record<string, string>) {
    super(message);
    this.status = status;
    this.campos = campos;
  }
}

/** Extrai uma mensagem amigavel de qualquer erro capturado. */
export function mensagemErro(ex: unknown, padrao = 'Erro inesperado no servidor'): string {
  if (ex instanceof ApiError) return ex.message;
  if (ex instanceof Error) return ex.message;
  return padrao;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuario(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function salvarSessao(token: string, usuario: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, usuario);
}

export function limparSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

type Opcoes = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
};

export async function api<T>(path: string, opcoes: Opcoes = {}): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  if (opcoes.query) {
    Object.entries(opcoes.query).forEach(([chave, valor]) => {
      if (valor !== null && valor !== undefined && valor !== '') {
        url.searchParams.set(chave, String(valor));
      }
    });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(url.toString(), {
    method: opcoes.method ?? 'GET',
    headers,
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
  });

  if (resposta.status === 401) {
    limparSessao();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  if (resposta.status === 204) return undefined as T;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ApiError(
      resposta.status,
      dados?.mensagem ?? 'Erro inesperado no servidor',
      dados?.campos,
    );
  }

  return dados as T;
}
