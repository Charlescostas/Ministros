import { useCallback, useEffect, useState } from 'react';
import { api, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { HistoricoDetalhe, HistoricoResumo } from '../types';
import { opcoesDeMes, rotuloMes } from '../lib/format';

/** "05/10/2026 às 14:32" a partir do ISO gravado pelo backend. */
function dataHora(iso: string): string {
  const d = new Date(iso);
  const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${data} às ${hora}`;
}

export default function Historico() {
  const [mes, setMes] = useState('');
  const [registros, setRegistros] = useState<HistoricoResumo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [detalhe, setDetalhe] = useState<HistoricoDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api<HistoricoResumo[]>('/escalas/historico', { query: { mes } })
      .then(setRegistros)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [mes]);

  useEffect(() => {
    setErro(null);
    carregar();
  }, [carregar]);

  function ver(id: number) {
    setCarregandoDetalhe(true);
    setErroDetalhe(null);
    setDetalhe(null);
    api<HistoricoDetalhe>(`/escalas/historico/${id}`)
      .then(setDetalhe)
      .catch((ex) => setErroDetalhe(mensagemErro(ex)))
      .finally(() => setCarregandoDetalhe(false));
  }

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Histórico da escala</h1>
          <p className="subtitulo">
            Fotografia gravada a cada geração: membros das equipes e missas por dia da semana
          </p>
        </div>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}

      <div className="barra-filtros">
        <select className="selecao" value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="">Todos os meses</option>
          {opcoesDeMes(24).map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </select>
        <small className="dica">Filtro pelo mês da escala gerada (não pela data do registro).</small>
      </div>

      <section className="painel">
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês da escala</th>
              <th>Gerado em</th>
              <th className="num">Missas</th>
              <th className="num">Equipes</th>
              <th className="num">Membros</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {registros.map((h) => (
              <tr key={h.id}>
                <td>
                  <strong>{rotuloMes(h.mes)}</strong>
                </td>
                <td>{dataHora(h.criadoEm)}</td>
                <td className="num">{h.totalMissas}</td>
                <td className="num">{h.totalEquipes}</td>
                <td className="num">{h.totalMembros}</td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => ver(h.id)}>
                    ver
                  </button>
                </td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={6} className="vazio">
                  Nenhum registro de histórico{mes ? ` em ${rotuloMes(mes)}` : ''}.
                  <br />
                  Gere a escala em <strong>Missas → Gerar Escala do mês</strong> para criar o
                  primeiro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {(detalhe || carregandoDetalhe) && (
        <Modal
          titulo={detalhe ? `Escala de ${rotuloMes(detalhe.mes)}` : 'Carregando…'}
          aoFechar={() => setDetalhe(null)}
          largura="amplo"
        >
          {erroDetalhe && <div className="aviso erro">{erroDetalhe}</div>}

          {carregandoDetalhe && <p className="dica">Carregando o registro…</p>}

          {detalhe && (
            <div className="formulario">
              <p className="dica">
                Gerado em {dataHora(detalhe.criadoEm)} · {detalhe.totalMissas} missa(s) no mês.
                Este é o registro daquele momento — membros e missas podem ter mudado depois.
              </p>

              <h3>Missas por dia da semana</h3>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Dia da semana</th>
                    <th className="num">Missas</th>
                    <th>Horários</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.missasPorDiaSemana.map((d) => (
                    <tr key={d.diaSemana}>
                      <td>
                        <strong>{d.diaSemana}</strong>
                      </td>
                      <td className="num">{d.quantidade}</td>
                      <td>{d.horarios.join(', ')}</td>
                    </tr>
                  ))}
                  {detalhe.missasPorDiaSemana.length === 0 && (
                    <tr>
                      <td colSpan={3} className="vazio">
                        Nenhuma missa no mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h3>Equipes e membros naquele momento</h3>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Equipe</th>
                    <th>Membros</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.equipes.map((e) => (
                    <tr key={e.equipeId}>
                      <td>
                        <strong>{e.numero ? `EQUIPE ${e.numero}` : e.nome}</strong>
                        {e.numero && <small className="bloco">{e.nome}</small>}
                      </td>
                      <td>
                        {e.membros.map((m) => (
                          <span key={m.ministroId} className="bloco">
                            {m.coordenador && '★ '}
                            {m.nome}
                            {m.telefone && ` · ${m.telefone}`}
                          </span>
                        ))}
                        {e.membros.length === 0 && <span className="selo selo-off">sem membros</span>}
                      </td>
                      <td className="num">{e.membros.length}</td>
                    </tr>
                  ))}
                  {detalhe.equipes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="vazio">
                        Nenhuma equipe nesta escala.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="formulario-acoes">
                <button type="button" className="botao" onClick={() => setDetalhe(null)}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
