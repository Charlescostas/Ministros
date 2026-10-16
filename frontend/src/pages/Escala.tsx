import { useEffect, useMemo, useState } from 'react';
import { api, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Equipe, EscalaItem, Missa } from '../types';
import {
  DIAS_SEMANA_ORDENADOS,
  dataPorExtenso,
  horaCurta,
  indiceDiaSemana,
  limitesDoMes,
  mesAtual,
  opcoesDeMes,
  rotuloMes,
} from '../lib/format';
import { abrirWhatsapp, textoEscalaDoMinistro } from '../lib/whatsapp';

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

/** Uma coluna do dashboard = um horário de missa (dia da semana + hora). */
interface ColunaDashboard {
  dow: number;
  dia: string;
  hora: string;
}

/** Quem tem serviço no mês: nome, telefone e quantidade (base dos botões de WhatsApp). */
interface Carga {
  ministroId: number;
  nome: string;
  telefone: string | null;
  total: number;
}

/** Uma linha do dashboard: quantidade de missas da equipe em cada horário. */
interface LinhaDashboard {
  chave: number | null;
  nome: string;
  numero: number | null;
  inativa: boolean;
  /** Quantidade de missas da equipe em cada coluna (horário). */
  colunas: number[];
  total: number;
}

export default function Escala() {
  const [mes, setMes] = useState(mesAtual());
  const [equipeId, setEquipeId] = useState('');
  const [itens, setItens] = useState<EscalaItem[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [missasMes, setMissasMes] = useState<Missa[]>([]);
  const [mostrarDashboard, setMostrarDashboard] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  /** Texto da mensagem do WhatsApp aberto em tela, para conferir antes de enviar. */
  const [preview, setPreview] = useState<{
    titulo: string;
    texto: string;
    telefone: string | null;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

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

  // Missas do mês (com e sem equipe) - base do dashboard por dia da semana.
  useEffect(() => {
    const { de, ate } = limitesDoMes(mes);
    setMissasMes([]);
    api<Missa[]>('/missas', { query: { de, ate } })
      .then(setMissasMes)
      .catch(() => setMissasMes([]));
  }, [mes]);

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
    const mapa = new Map<number, Carga>();
    itens.forEach((i) => {
      const atual = mapa.get(i.ministroId);
      if (atual) {
        atual.total += 1;
      } else {
        mapa.set(i.ministroId, {
          ministroId: i.ministroId,
          nome: i.ministroNome,
          telefone: i.telefoneMinistro,
          total: 1,
        });
      }
    });
    return [...mapa.values()].sort(
      (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }, [itens]);

  /** Matriz equipe x horário: quantas missas do mês cada equipe tem em cada dia+horário. */
  const dashboard = useMemo(() => {
    // 1) colunas: cada dia da semana + horário que existe no mês, em ordem de semana.
    const mapaColunas = new Map<string, ColunaDashboard>();
    missasMes.forEach((m) => {
      const dow = indiceDiaSemana(m.data);
      const hora = horaCurta(m.hora);
      const chave = `${dow}|${hora}`;
      if (!mapaColunas.has(chave)) {
        mapaColunas.set(chave, { dow, dia: DIAS_SEMANA_ORDENADOS[dow], hora });
      }
    });
    const colunas = [...mapaColunas.values()].sort((a, b) => a.dow - b.dow || a.hora.localeCompare(b.hora));
    const indice = new Map<string, number>(colunas.map((c, i) => [`${c.dow}|${c.hora}`, i]));

    // 2) linhas: uma por equipe (+ "Sem equipe"), preenchidas coluna a coluna.
    const linhas = new Map<number | null, LinhaDashboard>();
    const novaLinha = (chave: number | null, nome: string, numero: number | null, inativa: boolean): LinhaDashboard => ({
      chave, nome, numero, inativa,
      colunas: new Array(colunas.length).fill(0),
      total: 0,
    });

    equipes.forEach((e) => linhas.set(e.id, novaLinha(e.id, e.nome, e.numero, !e.ativa)));

    missasMes.forEach((m) => {
      const ci = indice.get(`${indiceDiaSemana(m.data)}|${horaCurta(m.hora)}`);
      const chave = m.equipeId;
      let linha = linhas.get(chave ?? null);
      if (!linha) {
        linha = novaLinha(null, m.equipeNome ?? 'Sem equipe', null, false);
        linhas.set(null, linha);
      }
      if (ci !== undefined) linha.colunas[ci] += 1;
      linha.total += 1;
    });

    const ordem = (l: LinhaDashboard) => (l.chave === null ? Number.MAX_SAFE_INTEGER : l.numero ?? Number.MAX_SAFE_INTEGER);
    const ordenadas = [...linhas.values()]
      .sort((a, b) => ordem(a) - ordem(b) || a.nome.localeCompare(b.nome, 'pt-BR'));

    // 3) totais por horário (coluna) e geral.
    const totaisColunas = colunas.map((_, ci) =>
      ordenadas.reduce((soma, l) => soma + l.colunas[ci], 0),
    );

    const semEquipe = ordenadas.find((l) => l.chave === null)?.total ?? 0;
    return {
      linhas: ordenadas,
      colunas,
      totaisColunas,
      totalMissas: missasMes.length,
      comEquipe: missasMes.length - semEquipe,
      semEquipe,
      equipesUsadas: ordenadas.filter((l) => l.chave !== null && l.total > 0).length,
    };
  }, [missasMes, equipes]);

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

  /** Mostra em tela a escala individual do ministro (só os serviços dele no mês). */
  function enviarEscalaDoMinistro(cargaMinistro: Carga) {
    const doMinistro = itens.filter((i) => i.ministroId === cargaMinistro.ministroId);
    setCopiado(false);
    setPreview({
      titulo: `Escala de ${cargaMinistro.nome} · ${rotuloMes(mes)}`,
      texto: textoEscalaDoMinistro(mes, cargaMinistro.nome, doMinistro),
      telefone: cargaMinistro.telefone,
    });
  }

  /** Copia o texto do preview para a área de transferência. */
  async function copiarPreview() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.texto);
      setCopiado(true);
    } catch {
      // Sem permissão ou sem API de área de transferência: deixa o texto selecionado
      // para copiar com Ctrl+C.
      const caixa = document.getElementById('texto-whatsapp');
      if (caixa) {
        const faixa = document.createRange();
        faixa.selectNodeContents(caixa);
        const selecao = window.getSelection();
        selecao?.removeAllRanges();
        selecao?.addRange(faixa);
      }
      setErro('Não foi possível copiar sozinho — o texto ficou selecionado, use Ctrl + C.');
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

  /**
   * Ministro que saiu da equipe depois de a escala ter sido gerada:
   * a linha continua na escala (histórico preservado) e é sinalizada aqui.
   */
  function membroSaiuDaEquipe(idEquipe: number, idMinistro: number) {
    const eq = equipes.find((e) => e.id === idEquipe);
    return !!eq && !eq.ministros.some((m) => m.id === idMinistro);
  }

  return (
    <>
      <header className="pagina-topo area-impressao">
        <div>
          <h1>Escala mensal</h1>
        </div>
        <div className="acoes-topo">
          <a className="botao botao-secundario" href="/impressao">
            Imprimir Escala
          </a>
          <button
            type="button"
            className="botao botao-secundario"
            onClick={limpar}
            disabled={itens.length === 0}
          >
            Limpar
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

      <div className="dashboard-topo area-tela">
        <button
          type="button"
          className="botao-mini"
          onClick={() => setMostrarDashboard((v) => !v)}
        >
          {mostrarDashboard ? 'Ocultar dashboard' : 'Mostrar dashboard'}
        </button>
      </div>

      {mostrarDashboard && (
        <section className="dashboard area-tela" aria-label="Dashboard da escala">
          <div className="grade-cartoes">
            <div className="cartao">
              <span className="cartao-valor">{dashboard.totalMissas}</span>
              <span className="cartao-rotulo">Missas em {rotuloMes(mes)}</span>
            </div>
            <div className="cartao">
              <span className="cartao-valor">{dashboard.comEquipe}</span>
              <span className="cartao-rotulo">Com equipe atribuída</span>
            </div>
            <div className={`cartao ${dashboard.semEquipe > 0 ? 'cartao-destaque' : ''}`}>
              <span className="cartao-valor">{dashboard.semEquipe}</span>
              <span className="cartao-rotulo">Sem equipe</span>
            </div>
            <div className="cartao">
              <span className="cartao-valor">{dashboard.equipesUsadas}</span>
              <span className="cartao-rotulo">Equipes em escala no mês</span>
            </div>
          </div>

          <div className="painel">
            <div className="painel-topo">
              <div>
                <h2>Missas</h2>
                <p className="dica">
                  {rotuloMes(mes)} · quantidade de missas de cada equipe em cada dia da semana e horário.
                </p>
              </div>
            </div>

            <div className="tabela-rolagem">
              <table className="tabela tabela-dashboard">
                <thead>
                  <tr>
                    <th>Equipe</th>
                    {dashboard.colunas.map((c) => (
                      <th key={`${c.dow}-${c.hora}`} className="centro">
                        <span className="dia-cabecalho">{c.dia}</span>
                        <small className="bloco">{c.hora}</small>
                      </th>
                    ))}
                    <th className="centro">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.totalMissas > 0 &&
                    dashboard.linhas.map((l) => (
                      <tr key={l.chave === null ? 'sem-equipe' : l.chave} className={l.total === 0 || l.inativa ? 'linha-inativa' : undefined}>
                        <td className="celula-equipe">
                          <strong>{l.numero ? `EQUIPE ${l.numero}` : l.nome}</strong>
                          {l.numero && <small className="bloco">{l.nome}</small>}
                          {l.inativa && <small className="bloco">equipe inativa</small>}
                        </td>
                        {l.colunas.map((v, i) => (
                          <td key={i} className={`centro ${v === 0 ? 'celula-zero' : ''}`}>
                            {v === 0 ? '·' : v}
                          </td>
                        ))}
                        <td className="centro">
                          <strong>{l.total}</strong>
                        </td>
                      </tr>
                    ))}
                  {dashboard.totalMissas === 0 && (
                    <tr>
                      <td colSpan={dashboard.colunas.length + 2} className="vazio">
                        Nenhuma missa cadastrada em {rotuloMes(mes)}.
                      </td>
                    </tr>
                  )}
                </tbody>
                {dashboard.totalMissas > 0 && (
                  <tfoot>
                    <tr>
                      <td>
                        <strong>Total de missas</strong>
                      </td>
                      {dashboard.totaisColunas.map((v, i) => (
                        <td key={i} className="centro">
                          <strong>{v}</strong>
                        </td>
                      ))}
                      <td className="centro">
                        <strong>{dashboard.totalMissas}</strong>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <p className="dica">
              Use “Gerar Escala do mês” na página <strong>Missas</strong> para distribuir as
              equipes respeitando a quantidade de vezes em cada dia da semana e horário.
            </p>
          </div>
        </section>
      )}

      <div className="area-escala">
        <div className="coluna-principal">
          {carregando && <div className="carregando">Carregando escala…</div>}
 
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
                            {membroSaiuDaEquipe(grupoEquipe.equipeId, item.ministroId) && (
                              <small className="bloco fora-equipe">
                                fora da equipe · escala mantida
                              </small>
                            )}
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
              {carga.map((c) => (
                <li key={c.ministroId}>
                  <span>{c.nome}</span>
                  <strong>{c.total}</strong>
                  <button
                    type="button"
                    className="botao-mini"
                    title={
                      c.telefone
                        ? `Enviar a escala de ${c.nome} para ${c.telefone}`
                        : `Enviar a escala de ${c.nome} — sem telefone cadastrado, você escolhe o contato`
                    }
                    onClick={() => enviarEscalaDoMinistro(c)}
                  >
                    enviar
                  </button>
                </li>
              ))}
            </ul>
            <p className="dica">A geração prioriza quem tem menos serviços no mês.</p>
          </aside>
        )}
      </div>

      {preview && (
        <Modal titulo={preview.titulo} aoFechar={() => setPreview(null)} largura="amplo">
          <p className="dica">
            {preview.telefone
              ? `Mensagem para ${preview.telefone} — já endereçada ao número cadastrado.`
              : 'Depois de abrir o WhatsApp, você escolhe o contato ou o grupo.'}
          </p>

          {itens.length === 0 && (
            <div className="aviso erro">
              Nenhuma escala gerada em {rotuloMes(mes)} — use “Gerar Escala do mês” na página
              <strong> Missas</strong>.
            </div>
          )}

          <pre id="texto-whatsapp" className="preview-whatsapp">{preview.texto}</pre>

          <div className="formulario-acoes">
            <button
              type="button"
              className="botao"
              onClick={copiarPreview}
              disabled={itens.length === 0}
            >
              {copiado ? 'Copiado ✓' : 'Copiar texto'}
            </button>
            <button
              type="button"
              className="botao botao-primario"
              onClick={() => abrirWhatsapp(preview.telefone, preview.texto)}
              disabled={itens.length === 0}
            >
              Abrir no WhatsApp
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
