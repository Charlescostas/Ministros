import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Despesa, Doacao, Mensalidade, Ministro } from '../types';
import {
  dataCurta,
  deslocarMes,
  limitesDoMes,
  mesAtual,
  moeda,
  rotuloMes,
  rotuloMesCurto,
} from '../lib/format';

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Transferência', 'Cartão', 'Outro'];
const CATEGORIAS = ['Alimentação', 'Transporte', 'Material', 'Manutenção', 'Outro'];
const CATEGORIAS_DOACAO = ['Dízimo', 'Oferta', 'Campanha', 'Festa', 'Outras entradas', 'Outro'];

interface FormMensalidade {
  id?: number;
  ministroId: string;
  competencia: string;
  /** Só quando "lote" está marcado: última competência do período. */
  competenciaAte: string;
  lote: boolean;
  valor: string;
  dataRecebimento: string;
  formaPagamento: string;
  observacao: string;
}

/** Resposta do POST /mensalidades/lote. */
interface ResultadoLote {
  criadas: number;
  ignoradas: number;
  competenciasCriadas: string[];
  competenciasIgnoradas: string[];
}

/** Quantidade de competências de "de" até "ate" (inclusive); 0 quando o período é inválido. */
function contarCompetencias(de: string, ate: string): number {
  if (!/^\d{4}-\d{2}$/.test(de) || !/^\d{4}-\d{2}$/.test(ate)) return 0;
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  const total = (a2 - a1) * 12 + (m2 - m1) + 1;
  return total > 0 ? total : 0;
}

interface FormDespesa {
  id?: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: string;
  observacao: string;
}

/** Outras entradas usam o mesmo formulário das despesas (data, descrição, categoria, valor). */
type FormDoacao = FormDespesa;

export default function Financeiro() {
  const [mes, setMes] = useState(mesAtual());
  const [ministroId, setMinistroId] = useState('');
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [mensalidadesAno, setMensalidadesAno] = useState<Mensalidade[]>([]);
  const [despesasAno, setDespesasAno] = useState<Despesa[]>([]);
  const [doacoesAno, setDoacoesAno] = useState<Doacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [formM, setFormM] = useState<FormMensalidade | null>(null);
  const [formD, setFormD] = useState<FormDespesa | null>(null);
  const [formDoacao, setFormDoacao] = useState<FormDoacao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ano = Number(mes.slice(0, 4));
  const { de, ate } = limitesDoMes(mes);

  function carregar() {
    api<Mensalidade[]>('/mensalidades', { query: { de, ate, ministroId } })
      .then(setMensalidades)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Despesa[]>('/despesas', { query: { de, ate } })
      .then(setDespesas)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Doacao[]>('/doacoes', { query: { de, ate } })
      .then(setDoacoes)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  function carregarAno() {
    const params = { de: `${ano}-01-01`, ate: `${ano}-12-31` };
    api<Mensalidade[]>('/mensalidades', { query: params })
      .then(setMensalidadesAno)
      .catch(() => undefined);
    api<Despesa[]>('/despesas', { query: params })
      .then(setDespesasAno)
      .catch(() => undefined);
    api<Doacao[]>('/doacoes', { query: params })
      .then(setDoacoesAno)
      .catch(() => undefined);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ministroId]);

  useEffect(() => {
    carregarAno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano]);

  useEffect(() => {
    api<Ministro[]>('/ministros').then(setMinistros).catch(() => undefined);
  }, []);

  const totalRecebido = mensalidades.reduce((soma, m) => soma + Number(m.valor), 0);
  const totalDoacoes = doacoes.reduce((soma, d) => soma + Number(d.valor), 0);
  const totalDespesas = despesas.reduce((soma, d) => soma + Number(d.valor), 0);
  const saldo = totalRecebido + totalDoacoes - totalDespesas;

  /** Fechamento mês a mês do ano: mensalidade pela competência, Outras entradas/despesa pela data. */
  const resumoAno = useMemo(() => {
    const linhas = Array.from({ length: 12 }, (_, i) => ({
      chave: `${ano}-${String(i + 1).padStart(2, '0')}`,
      recebido: 0,
      doacoes: 0,
      despesas: 0,
    }));
    const porChave = new Map(linhas.map((l) => [l.chave, l]));
    mensalidadesAno.forEach((m) => {
      const linha = porChave.get(m.competencia);
      if (linha) linha.recebido += Number(m.valor);
    });
    doacoesAno.forEach((d) => {
      const linha = porChave.get(d.data.slice(0, 7));
      if (linha) linha.doacoes += Number(d.valor);
    });
    despesasAno.forEach((d) => {
      const linha = porChave.get(d.data.slice(0, 7));
      if (linha) linha.despesas += Number(d.valor);
    });
    return linhas.map((l) => ({ ...l, saldo: l.recebido + l.doacoes - l.despesas }));
  }, [mensalidadesAno, doacoesAno, despesasAno, ano]);

  const totalAnoRecebido = resumoAno.reduce((s, l) => s + l.recebido, 0);
  const totalAnoDoacoes = resumoAno.reduce((s, l) => s + l.doacoes, 0);
  const totalAnoDespesas = resumoAno.reduce((s, l) => s + l.despesas, 0);

  /** Quantidade de competências do período quando o lançamento em lote está marcado. */
  const competenciasLote = formM ? contarCompetencias(formM.competencia, formM.competenciaAte) : 0;

  function novaMensalidade() {
    setSucesso(null);
    setFormM({
      ministroId,
      competencia: mes,
      competenciaAte: mes,
      lote: false,
      valor: '',
      dataRecebimento: new Date().toISOString().slice(0, 10),
      formaPagamento: '',
      observacao: '',
    });
  }

  function editarMensalidade(m: Mensalidade) {
    setSucesso(null);
    setFormM({
      id: m.id,
      ministroId: String(m.ministroId),
      competencia: m.competencia,
      competenciaAte: m.competencia,
      lote: false,
      valor: String(m.valor),
      dataRecebimento: m.dataRecebimento,
      formaPagamento: m.formaPagamento ?? '',
      observacao: m.observacao ?? '',
    });
  }

  function novaDespesa() {
    setFormD({ data: new Date().toISOString().slice(0, 10), descricao: '', categoria: '', valor: '', observacao: '' });
  }

  function editarDespesa(d: Despesa) {
    setFormD({
      id: d.id,
      data: d.data,
      descricao: d.descricao,
      categoria: d.categoria ?? '',
      valor: String(d.valor),
      observacao: d.observacao ?? '',
    });
  }

  function novaDoacao() {
    setFormDoacao({ data: new Date().toISOString().slice(0, 10), descricao: '', categoria: '', valor: '', observacao: '' });
  }

  function editarDoacao(d: Doacao) {
    setFormDoacao({
      id: d.id,
      data: d.data,
      descricao: d.descricao,
      categoria: d.categoria ?? '',
      valor: String(d.valor),
      observacao: d.observacao ?? '',
    });
  }

  function mensagemLote(r: ResultadoLote, nome: string): string {
    const periodo =
      r.competenciasCriadas.length > 1
        ? `${rotuloMes(r.competenciasCriadas[0])} a ${rotuloMes(r.competenciasCriadas[r.competenciasCriadas.length - 1])}`
        : r.competenciasCriadas.length === 1
          ? rotuloMes(r.competenciasCriadas[0])
          : '';
    const jaExistiam =
      r.ignoradas > 0 ? ` ${r.ignoradas} competência(s) já existiam e foram ignoradas.` : '';
    if (r.criadas === 0) {
      return `Nenhuma mensalidade nova para ${nome}: as competências do período já existem.`;
    }
    return `${r.criadas} mensalidade(s) lançada(s) para ${nome} — ${periodo}.${jaExistiam}`;
  }

  function salvarMensalidade() {
    if (!formM) return;
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    const emLote = !formM.id && formM.lote;
    const ministro = ministros.find((m) => String(m.id) === formM.ministroId);
    const corpo = {
      ministroId: formM.ministroId ? Number(formM.ministroId) : null,
      competencia: formM.competencia,
      valor: Number(formM.valor),
      dataRecebimento: formM.dataRecebimento,
      formaPagamento: formM.formaPagamento || null,
      observacao: formM.observacao || null,
    };

    const requisicao: Promise<Mensalidade | ResultadoLote> = formM.id
      ? api<Mensalidade>(`/mensalidades/${formM.id}`, { method: 'PUT', body: corpo })
      : emLote
        ? api<ResultadoLote>('/mensalidades/lote', {
            method: 'POST',
            body: {
              ...corpo,
              competenciaDe: formM.competencia,
              competenciaAte: formM.competenciaAte,
            },
          })
        : api<Mensalidade>('/mensalidades', { method: 'POST', body: corpo });

    requisicao
      .then((resultado) => {
        setFormM(null);
        // a lista é filtrada pela data de recebimento: abre no mês onde as linhas novas aparecem
        setMes(formM.dataRecebimento.slice(0, 7));
        if (emLote && 'criadas' in resultado) {
          setSucesso(mensagemLote(resultado, ministro?.nome ?? ''));
        }
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function salvarDespesa() {
    if (!formD) return;
    setSalvando(true);
    setErro(null);
    const corpo = {
      data: formD.data,
      descricao: formD.descricao,
      categoria: formD.categoria || null,
      valor: Number(formD.valor),
      observacao: formD.observacao || null,
    };
    const requisicao = formD.id
      ? api<Despesa>(`/despesas/${formD.id}`, { method: 'PUT', body: corpo })
      : api<Despesa>('/despesas', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setFormD(null);
        setMes(formD.data.slice(0, 7));
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function salvarDoacao() {
    if (!formDoacao) return;
    setSalvando(true);
    setErro(null);
    const corpo = {
      data: formDoacao.data,
      descricao: formDoacao.descricao,
      categoria: formDoacao.categoria || null,
      valor: Number(formDoacao.valor),
      observacao: formDoacao.observacao || null,
    };
    const requisicao = formDoacao.id
      ? api<Doacao>(`/doacoes/${formDoacao.id}`, { method: 'PUT', body: corpo })
      : api<Doacao>('/doacoes', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setFormDoacao(null);
        setMes(formDoacao.data.slice(0, 7));
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function excluirDoacao(d: Doacao) {
    if (!window.confirm(`Excluir a Outras entradas "${d.descricao}" de ${dataCurta(d.data)}?`)) return;
    api<void>(`/doacoes/${d.id}`, { method: 'DELETE' })
      .then(() => {
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  function excluirMensalidade(m: Mensalidade) {
    if (!window.confirm(`Excluir a mensalidade de ${m.ministroNome} (${rotuloMesCurto(m.competencia)})?`)) return;
    api<void>(`/mensalidades/${m.id}`, { method: 'DELETE' })
      .then(() => {
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  function excluirDespesa(d: Despesa) {
    if (!window.confirm(`Excluir a despesa "${d.descricao}" de ${dataCurta(d.data)}?`)) return;
    api<void>(`/despesas/${d.id}`, { method: 'DELETE' })
      .then(() => {
        carregar();
        carregarAno();
      })
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Financeiro</h1>
          <p className="subtitulo">
            Mensalidades e despesas · {rotuloMes(mes)}
          </p>
        </div>
        <div className="acoes-topo">
          <Link className="botao" to={`/caixa?mes=${mes}`}>
            Imprimir caixa
          </Link>
          <Link className="botao" to={`/caixa/anual?ano=${ano}`}>
            Caixa anual
          </Link>
          <Link className="botao" to={`/mensalidades/anual?ano=${ano}`}>
            Mensalidades anual
          </Link>
          <button type="button" className="botao" onClick={novaDoacao}>
            + Outras entradas
          </button>
          <button type="button" className="botao" onClick={novaDespesa}>
            + Despesa
          </button>
          <button type="button" className="botao botao-primario" onClick={novaMensalidade}>
            + Mensalidade
          </button>
        </div>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}
      {sucesso && <div className="aviso sucesso">{sucesso}</div>}

      <div className="barra-filtros">
        <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, -1))}>
          ← mês anterior
        </button>
        <strong className="rotulo-mes">{rotuloMes(mes)}</strong>
        <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, 1))}>
          próximo mês →
        </button>

        <select className="selecao" value={ministroId} onChange={(e) => setMinistroId(e.target.value)}>
          <option value="">Todos os ministros</option>
          {ministros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
              {m.ativo ? '' : ' (inativo)'}
            </option>
          ))}
        </select>
      </div>

      <div className="grade-cartoes">
        <div className="cartao">
          <div className="cartao-valor">{moeda(totalRecebido)}</div>
          <div className="cartao-rotulo">
            Mensalidades em {rotuloMes(mes)}
            {ministroId && ' (filtro de ministro)'}
          </div>
        </div>
        <div className="cartao">
          <div className="cartao-valor">{moeda(totalDoacoes)}</div>
          <div className="cartao-rotulo">Outras entradas em {rotuloMes(mes)}</div>
        </div>
        <div className="cartao">
          <div className="cartao-valor">{moeda(totalDespesas)}</div>
          <div className="cartao-rotulo">Despesas em {rotuloMes(mes)}</div>
        </div>
        <div className="cartao cartao-destaque">
          <div className="cartao-valor">{moeda(saldo)}</div>
          <div className="cartao-rotulo">Saldo do mês (mensalidades + Outras entradas − despesas)</div>
        </div>
      </div>

      <section className="painel">
        <div className="painel-topo">
          <strong>Mensalidades</strong>
          <span className="dica">{mensalidades.length} lançamento(s)</span>
        </div>
        <table className="tabela">
          <thead>
            <tr>
              <th>Recebido em</th>
              <th>Ministro</th>
              <th>Competência</th>
              <th>Forma</th>
              <th className="num">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mensalidades.map((m) => (
              <tr key={m.id}>
                <td>{dataCurta(m.dataRecebimento)}</td>
                <td>
                  <strong>{m.ministroNome}</strong>
                  {m.observacao && <small className="bloco">{m.observacao}</small>}
                </td>
                <td>{rotuloMesCurto(m.competencia)}</td>
                <td>{m.formaPagamento ?? '—'}</td>
                <td className="num">{moeda(m.valor)}</td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => editarMensalidade(m)}>
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluirMensalidade(m)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {mensalidades.length === 0 && (
              <tr>
                <td colSpan={6} className="vazio">
                  Nenhuma mensalidade recebida em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="painel">
        <div className="painel-topo">
          <strong>Outras entradas</strong>
          <span className="dica">{doacoes.length} lançamento(s)</span>
        </div>
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição / doador</th>
              <th className="num">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {doacoes.map((d) => (
              <tr key={d.id}>
                <td>{dataCurta(d.data)}</td>
                <td>{d.categoria ?? '—'}</td>
                <td>
                  <strong>{d.descricao}</strong>
                  {d.observacao && <small className="bloco">{d.observacao}</small>}
                </td>
                <td className="num">{moeda(d.valor)}</td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => editarDoacao(d)}>
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluirDoacao(d)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {doacoes.length === 0 && (
              <tr>
                <td colSpan={5} className="vazio">
                  Nenhuma Outras entradas recebida em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="painel">
        <div className="painel-topo">
          <strong>Despesas realizadas</strong>
          <span className="dica">{despesas.length} lançamento(s)</span>
        </div>
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th className="num">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => (
              <tr key={d.id}>
                <td>{dataCurta(d.data)}</td>
                <td>{d.categoria ?? '—'}</td>
                <td>
                  <strong>{d.descricao}</strong>
                  {d.observacao && <small className="bloco">{d.observacao}</small>}
                </td>
                <td className="num">{moeda(d.valor)}</td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => editarDespesa(d)}>
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluirDespesa(d)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {despesas.length === 0 && (
              <tr>
                <td colSpan={5} className="vazio">
                  Nenhuma despesa em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="painel">
        <div className="painel-topo">
          <strong>Fechamento de {ano}</strong>
          <span className="dica">mensalidades pela competência · despesas pela data</span>
        </div>
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Mensalidades</th>
              <th className="num">Outras entradas</th>
              <th className="num">Despesas</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {resumoAno.map((l) => (
              <tr key={l.chave}>
                <td>{rotuloMes(l.chave)}</td>
                <td className="num">{moeda(l.recebido)}</td>
                <td className="num">{moeda(l.doacoes)}</td>
                <td className="num">{moeda(l.despesas)}</td>
                <td className="num">{moeda(l.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <strong>Total de {ano}</strong>
              </td>
              <td className="num">
                <strong>{moeda(totalAnoRecebido)}</strong>
              </td>
              <td className="num">
                <strong>{moeda(totalAnoDoacoes)}</strong>
              </td>
              <td className="num">
                <strong>{moeda(totalAnoDespesas)}</strong>
              </td>
              <td className="num">
                <strong>{moeda(totalAnoRecebido + totalAnoDoacoes - totalAnoDespesas)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {formM && (
        <Modal titulo={formM.id ? 'Editar mensalidade' : 'Nova mensalidade'} aoFechar={() => setFormM(null)}>
          <form
            className="formulario"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvarMensalidade();
            }}
          >
            <label>
              Ministro *
              <select
                value={formM.ministroId}
                onChange={(e) => setFormM({ ...formM, ministroId: e.target.value })}
                required
                autoFocus={!formM.id}
              >
                <option value="">— escolha o ministro —</option>
                {ministros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                    {m.ativo ? '' : ' (inativo)'}
                  </option>
                ))}
              </select>
            </label>

            {!formM.id && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={formM.lote}
                  onChange={(e) =>
                    setFormM({
                      ...formM,
                      lote: e.target.checked,
                      competenciaAte: e.target.checked ? formM.competenciaAte : formM.competencia,
                    })
                  }
                />
                Baixar mais de uma mensalidade (vários meses seguidos)
              </label>
            )}

            <div className="linha-dupla">
              <label>
                {formM.lote ? 'De (competência) *' : 'Competência *'}
                <input
                  type="month"
                  value={formM.competencia}
                  onChange={(e) =>
                    setFormM({
                      ...formM,
                      competencia: e.target.value,
                      competenciaAte:
                        formM.lote && contarCompetencias(e.target.value, formM.competenciaAte) < 1
                          ? e.target.value
                          : formM.competenciaAte,
                    })
                  }
                  required
                />
              </label>
              <label>
                Data do recebimento *
                <input
                  type="date"
                  value={formM.dataRecebimento}
                  onChange={(e) => setFormM({ ...formM, dataRecebimento: e.target.value })}
                  required
                />
              </label>
            </div>

            {formM.lote && (
              <>
                <div className="linha-dupla">
                  <label>
                    Até (competência) *
                    <input
                      type="month"
                      value={formM.competenciaAte}
                      min={formM.competencia}
                      onChange={(e) => setFormM({ ...formM, competenciaAte: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <small className="dica">
                  {competenciasLote > 0
                    ? `Serão lançadas ${competenciasLote} mensalidade(s), de ${rotuloMes(formM.competencia)} a ${rotuloMes(formM.competenciaAte)} — competências já lançadas para este ministro são ignoradas.`
                    : 'Período inválido: a competência final deve ser igual ou posterior à inicial.'}
                </small>
              </>
            )}

            <div className="linha-dupla">
              <label>
                Valor (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formM.valor}
                  onChange={(e) => setFormM({ ...formM, valor: e.target.value })}
                  placeholder="Ex.: 50,00"
                  required
                />
              </label>
              <label>
                Forma de pagamento
                <select
                  value={formM.formaPagamento}
                  onChange={(e) => setFormM({ ...formM, formaPagamento: e.target.value })}
                >
                  <option value="">—</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Observação
              <input
                value={formM.observacao}
                onChange={(e) => setFormM({ ...formM, observacao: e.target.value })}
                placeholder="Ex.: referente a outubro, pago adiantado…"
              />
            </label>

            <div className="formulario-acoes">
              <button type="button" className="botao" onClick={() => setFormM(null)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="botao botao-primario"
                disabled={salvando || (formM.lote && !formM.id && competenciasLote < 1)}
              >
                {salvando
                  ? 'Salvando…'
                  : formM.lote && !formM.id && competenciasLote > 0
                    ? `Lançar ${competenciasLote} mensalidade(s)`
                    : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {formDoacao && (
        <Modal titulo={formDoacao.id ? 'Editar Outras entradas' : 'Nova Outras entradas'} aoFechar={() => setFormDoacao(null)}>
          <form
            className="formulario"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvarDoacao();
            }}
          >
            <div className="linha-dupla">
              <label>
                Data *
                <input
                  type="date"
                  value={formDoacao.data}
                  onChange={(e) => setFormDoacao({ ...formDoacao, data: e.target.value })}
                  required
                  autoFocus={!formDoacao.id}
                />
              </label>
              <label>
                Valor (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formDoacao.valor}
                  onChange={(e) => setFormDoacao({ ...formDoacao, valor: e.target.value })}
                  placeholder="Ex.: 200,00"
                  required
                />
              </label>
            </div>

            <label>
              Descrição / doador *
              <input
                value={formDoacao.descricao}
                onChange={(e) => setFormDoacao({ ...formDoacao, descricao: e.target.value })}
                placeholder="Ex.: Outras entradas saldos, contribuição anônima…"
                required
              />
            </label>

            <label>
              Categoria
              <select
                value={formDoacao.categoria}
                onChange={(e) => setFormDoacao({ ...formDoacao, categoria: e.target.value })}
              >
                <option value="">—</option>
                {CATEGORIAS_DOACAO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observação
              <input
                value={formDoacao.observacao}
                onChange={(e) => setFormDoacao({ ...formDoacao, observacao: e.target.value })}
                placeholder="Ex.: destinada ao vinheteiro da comunidade…"
              />
            </label>

            <div className="formulario-acoes">
              <button type="button" className="botao" onClick={() => setFormDoacao(null)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-primario" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {formD && (
        <Modal titulo={formD.id ? 'Editar despesa' : 'Nova despesa'} aoFechar={() => setFormD(null)}>
          <form
            className="formulario"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvarDespesa();
            }}
          >
            <div className="linha-dupla">
              <label>
                Data *
                <input
                  type="date"
                  value={formD.data}
                  onChange={(e) => setFormD({ ...formD, data: e.target.value })}
                  required
                  autoFocus={!formD.id}
                />
              </label>
              <label>
                Valor (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formD.valor}
                  onChange={(e) => setFormD({ ...formD, valor: e.target.value })}
                  placeholder="Ex.: 120,00"
                  required
                />
              </label>
            </div>

            <label>
              Descrição *
              <input
                value={formD.descricao}
                onChange={(e) => setFormD({ ...formD, descricao: e.target.value })}
                placeholder="Ex.: Almoço da assembleia, material de limpeza…"
                required
              />
            </label>

            <label>
              Categoria
              <select
                value={formD.categoria}
                onChange={(e) => setFormD({ ...formD, categoria: e.target.value })}
              >
                <option value="">—</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observação
              <input
                value={formD.observacao}
                onChange={(e) => setFormD({ ...formD, observacao: e.target.value })}
                placeholder="Ex.: pago com o dinheiro da cofre…"
              />
            </label>

            <div className="formulario-acoes">
              <button type="button" className="botao" onClick={() => setFormD(null)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-primario" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
