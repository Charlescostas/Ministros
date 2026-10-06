import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ITENS = [
  { para: '/', rotulo: 'Painel', icone: '⌂' },
  { para: '/ministros', rotulo: 'Ministros', icone: '✝️' },
  { para: '/equipes', rotulo: 'Equipes', icone: '👥' },
  { para: '/missas', rotulo: 'Missas', icone: '⛪' },
  { para: '/escala', rotulo: 'Painel Escala ', icone: '☰' },
  { para: '/impressao', rotulo: 'Impressão Escala', icone: '🖶' },
  { para: '/funcoes', rotulo: 'Funções', icone: '⚙' },
  { para: '/configuracoes', rotulo: 'Cabeçalho', icone: '✎' },
];

export default function Layout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  async function aoSair() {
    await sair();
    navigate('/login');
  }

  return (
    <div className="app">
      <aside className="barra-lateral">
        <div className="marca">
          <img className="marca-logo" src="/logo-calice.jpg" alt="Ministro da Eucaristia" />
          <div>
            <strong>Escala</strong>
            <small>Ministros da Comunhão</small>
          </div>
        </div>

        <nav>
          {ITENS.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/'}
              className={({ isActive }) => (isActive ? 'ativo' : undefined)}
            >
              <span className="nav-icone">{item.icone}</span>
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="rodape-menu">
          <div className="usuario">
            <span className="usuario-bolinha">{usuario?.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{usuario}</strong>
              <small>coordenador</small>
            </div>
          </div>
          <button type="button" className="botao-sair" onClick={aoSair}>
            Sair
          </button>
        </div>
      </aside>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
