import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import type { Resumo } from '../types';
import { dataPorExtenso, horaCurta, mesAtual, rotuloMes } from '../lib/format';

export default function Dashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Resumo>('/dashboard/resumo')
      .then(setResumo)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, []);

  if (erro) return <div className="aviso erro">{erro}</div>;
  if (!resumo) return <div className="carregando">Carregando painel…</div>;

  const cartoes = [
    { rotulo: 'Ministros ativos', valor: resumo.ministrosAtivos, destino: '/ministros' },
    { rotulo: 'Equipes ativas', valor: resumo.equipesAtivas, destino: '/equipes' },
    { rotulo: `Missas em ${rotuloMes(resumo.mesAtual)}`, valor: resumo.missasNoMes, destino: '/missas' },
    {
      rotulo: 'Itens de escala no mês',
      valor: resumo.escalasNoMes,
      destino: '/escala',
      destaque: resumo.escalaDoMesGerada,
    },
  ];

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Painel</h1>
          <p className="subtitulo">
            {rotuloMes(mesAtual())} · escala {resumo.escalaDoMesGerada ? 'gerada' : 'ainda não gerada'}
          </p>
        </div>
        <Link className="botao botao-primario" to="/escala">
          Gerar escala do mês
        </Link>
      </header>

      <section className="grade-cartoes">
        {cartoes.map((cartao) => (
          <Link key={cartao.rotulo} to={cartao.destino} className={`cartao ${cartao.destaque ? 'cartao-destaque' : ''}`}>
            <span className="cartao-valor">{cartao.valor}</span>
            <span className="cartao-rotulo">{cartao.rotulo}</span>
          </Link>
        ))}
      </section>

      <section className="painel">
        <div className="painel-topo">
          <h2>Próximas missas</h2>
          <Link to="/missas">ver todas</Link>
        </div>

        {resumo.proximasMissas.length === 0 ? (
          <p className="vazio">Nenhuma missa futura cadastrada.</p>
        ) : (
          <ul className="lista-simples">
            {resumo.proximasMissas.map((missa) => (
              <li key={missa.id}>
                <div className="lista-principal">
                  <strong>{missa.titulo}</strong>
                  <span className="detalhe">
                    {dataPorExtenso(missa.data)} às {horaCurta(missa.hora)}
                    {missa.equipeNome ? ` · ${missa.equipeNome}` : ''}
                  </span>
                </div>
                {missa.escalada ? (
                  <span className="selo selo-ok">escala pronta</span>
                ) : (
                  <span className="selo selo-alerta">sem escala</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
