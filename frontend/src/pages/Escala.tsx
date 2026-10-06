import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, mensagemErro } from '../api/client';
import type { Equipe, EscalaItem } from '../types';
import { dataPorExtenso, horaCurta, mesAtual, opcoesDeMes, rotuloMes } from '../lib/format';

interface Grupo {
  missaId: number;
  data: string;
  hora: string;
  titulo: string;
  local: string | null;
  itens: EscalaItem[];
}

interface GrupoEquipe {
  equipeId: number;
  equipeNome: string;
  grupos: Grupo[];
}

export default function Escala() {
  const [mes, setMes] = useState(mesAtual());
  const [equipeId, setEquipeId] = useState('');
  const [itens, setItens] = useState<EscalaItem[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    api<EscalaItem[]>('/escalas', { query: { mes, equipeId } })
      .then(setItens)
      .catch((ex) => setErro(mensagemErro(ex)))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, [mes, equipeId]);

  useEffect(() => {
    api<Equipe[]>('/equipes').then(setEquipes).catch(() => undefined);
  }, []);

  const equipeSelecionada = equipes.find((e) => String(e.id) === equipeId);

  const estrutura: GrupoEquipe[] = useMemo(() => {
    const porEquipe = new Map<number, GrupoEquipe>();
    const porMissa = new Map<number, Grupo>();

    [...itens]
      .sort((a, b) =>
        a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data),
      )
      .forEach((item) => {
        let equipe = porEquipe.get(item.equipeId);
        if (!equipe) {
          equipe = { equipeId: item.equipeId, equipeNome: item.equipeNome, grupos: [] };
          porEquipe.set(item.equipeId, equipe);
        }
        let missa = porMissa.get(item.missaId);
        if (!missa) {
          missa = {
            missaId: item.missaId,
            data: item.data,
            hora: item.hora,
            titulo: item.tituloMissa,
            local: item.local,
            itens: [],
          };
          equipe.grupos.push(missa);
          porMissa.set(item.missaId, missa);
        }
        missa.itens.push(item);
      });

    return [...porEquipe.values()];
  }, [itens]);

  const carga = useMemo(() => {
    const mapa = new Map<string, number>();
    itens.forEach((i) => mapa.set(i.ministroNome, (mapa.get(i.ministroNome) ?? 0) + 1));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [itens]);

  async function gerar() {
    if (!equipeId) {
      setErro('Selecione a equipe para gerar a escala.');
      return;
    }
    if (
      itens.length > 0 &&
      !window.confirm(
        `Já existe escala de ${equipeSelecionada?.nome} em ${rotuloMes(mes)}. Deseja substituí-la?`,
      )
    ) {
      return;
    }
    setGerando(true);
    setErro(null);
    setAviso(null);
    try {
      const gerados = await api<EscalaItem[]>('/escalas/gerar', {
        method: 'POST',
        body: { equipeId: Number(equipeId), mes, substituir: true },
      });
      setItens(gerados);
      setAviso(`Escala de ${rotuloMes(mes)} gerada: ${gerados.length} atribuição(ões).`);
    } catch (ex) {
      setErro(ex instanceof ApiError ? ex.message : 'Erro ao gerar escala');
    } finally {
      setGerando(false);
    }
  }

  async function limpar() {
    if (!equipeId) {
      setErro('Selecione a equipe para limpar a escala.');
      return;
    }
    if (!window.confirm(`Apagar toda a escala de ${equipeSelecionada?.nome} em ${rotuloMes(mes)}?`)) {
      return;
    }
    try {
      await api('/escalas/limpar', { method: 'POST', query: { mes, equipeId } });
      setItens([]);
      setAviso('Escala apagada.');
    } catch (ex) {
      setErro(mensagemErro(ex));
    }
  }

  async function trocar(item: EscalaItem, novoMinistroId: number) {
    if (!novoMinistroId || novoMinistroId === item.ministroId) return;
    try {
      await api(`/escalas/${item.id}`, {
        method: 'PUT',
        body: { ministroId: novoMinistroId },
      });
      carregar();
    } catch (ex) {
      setErro(mensagemErro(ex));
      carregar();
    }
  }

  async function removerItem(item: EscalaItem) {
    if (!window.confirm(`Remover ${item.ministroNome} da função ${item.funcaoNome}?`)) return;
    try {
      await api(`/escalas/${item.id}`, { method: 'DELETE' });
      carregar();
    } catch (ex) {
      setErro(mensagemErro(ex));
    }
  }

  const membros = equipeSelecionada?.ministros ?? [];

  return (
    <>
      <header className="pagina-topo area-impressao">
        <div>
          <h1>Escala mensal</h1>
          <p className="subtitulo">
            {itens.length} atribuição(ões) em {rotuloMes(mes)}
          </p>
        </div>
        <div className="acoes-topo">
          <button type="button" className="botao" onClick={() => window.print()}>
            Imprimir
          </button>
          <a className="botao botao-secundario" href="/impressao">
            Modelo da paróquia
          </a>
          <button
            type="button"
            className="botao botao-secundario"
            onClick={limpar}
            disabled={itens.length === 0}
          >
            Limpar
          </button>
          <button type="button" className="botao botao-primario" onClick={gerar} disabled={gerando}>
            {gerando ? 'Gerando…' : itens.length > 0 ? 'Gerar novamente' : 'Gerar escala'}
          </button>
        </div>
      </header>

      <div className="barra-filtros area-impressao">
        <select className="selecao" value={mes} onChange={(e) => setMes(e.target.value)}>
          {opcoesDeMes().map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </select>

        <select className="selecao" value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
          <option value="">Todas as equipes</option>
          {equipes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>

        {equipeSelecionada && (
          <small className="dica">
            {equipeSelecionada.ministros.filter((m) => m.ativo).length} ministro(s) ativo(s) · a geração
            distribui os serviços com o menor carregamento primeiro.
          </small>
        )}
      </div>

      {erro && <div className="aviso erro">{erro}</div>}
      {aviso && <div className="aviso sucesso">{aviso}</div>}

      <div className="area-escala">
        <div className="coluna-principal">
          {carregando && <div className="carregando">Carregando escala…</div>}

          {!carregando && estrutura.length === 0 && (
            <section className="painel">
              <p className="vazio">
                Nenhuma escala gerada para {rotuloMes(mes)}. Selecione a equipe e clique em
                “Gerar escala”.
              </p>
            </section>
          )}

          {estrutura.map((grupoEquipe) => (
            <section key={grupoEquipe.equipeId} className="bloco-equipe">
              <h2 className="titulo-equipe">
                {grupoEquipe.equipeNome} <small>{rotuloMes(mes)}</small>
              </h2>

              {grupoEquipe.grupos.map((grupo) => (
                <article key={grupo.missaId} className="painel cartao-missa">
                  <header className="missa-topo">
                    <div>
                      <strong>{dataPorExtenso(grupo.data)}</strong>
                      <span className="detalhe">
                        {horaCurta(grupo.hora)} · {grupo.titulo}
                        {grupo.local ? ` · ${grupo.local}` : ''}
                      </span>
                    </div>
                    <span className="selo selo-ok">{grupo.itens.length} serviço(s)</span>
                  </header>

                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Função</th>
                        <th>Ministro</th>
                        <th>Contato</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.itens.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.funcaoNome}</strong>
                            {item.sequencia > 1 && <small className="bloco">{item.sequencia}ª vaga</small>}
                          </td>
                          <td>
                            <select
                              className="selecao-troca"
                              value={item.ministroId}
                              onChange={(e) => trocar(item, Number(e.target.value))}
                            >
                              <option value={item.ministroId}>{item.ministroNome}</option>
                              {membros
                                .filter((m) => m.id !== item.ministroId && m.ativo)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.nome}
                                  </option>
                                ))}
                              {membros.length === 0 && (
                                <option disabled>selecione a equipe acima</option>
                              )}
                            </select>
                          </td>
                          <td>{item.telefoneMinistro ?? '—'}</td>
                          <td className="acoes">
                            <button
                              type="button"
                              className="botao-mini perigo"
                              onClick={() => removerItem(item)}
                            >
                              remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </section>
          ))}
        </div>

        {carga.length > 0 && (
          <aside className="painel painel-lateral area-impressao">
            <h3>Serviços no mês</h3>
            <ul className="lista-carga">
              {carga.map(([nome, total]) => (
                <li key={nome}>
                  <span>{nome}</span>
                  <strong>{total}</strong>
                </li>
              ))}
            </ul>
            <p className="dica">A geração prioriza quem tem menos serviços no mês.</p>
          </aside>
        )}
      </div>
    </>
  );
}
