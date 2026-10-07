import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export default function Login() {
  const { autenticado, entrar } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await entrar(username.trim(), password);
      navigate('/');
    } catch (ex) {
      setErro(ex instanceof ApiError ? ex.message : 'Falha na conexão com o servidor');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-login">
      <form className="cartao-login" onSubmit={submeter}>
        <div className="marca-login">
          <img src="/Santurario.jpg" alt="Ministro da Eucaristia" />
          <h1>Ministros da Comunhão</h1>
          <p></p>
        </div>

        <label>
          Usuário
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="admin"
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        {erro && <div className="erro-caixa">{erro}</div>}

        <button type="submit" className="botao botao-primario botao-largo" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
