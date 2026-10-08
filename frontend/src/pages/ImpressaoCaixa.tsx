import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import type { Configuracao, Despesa, Doacao, Mensalidade } from '../types';
import {
  dataCurta,
  limitesDoMes,
  mesAtual,
  moeda,
  opcoesDeMes,
  rotuloMes,
  rotuloMesCurto,
} from '../lib/format';

/**
 * Impressão do **caixa** do mês: entradas (mensalidades), saídas
 * (despesas realizadas), saldo e linha para assinatura — no mesmo modelo
 * (cabeçalho da paróquia, tabela e caixa) do documento impresso da escala.
 */
export default function ImpressaoCaixa() {
  const [params, setParams] = useSearchParams();
  const mes = params.get('mes') ?? mesAtual();
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { de, ate } = limitesDoMes(mes);

  function mudarMes(novo: string) {
    setParams({ mes: novo });
  }

  useEffect(() => {
    api<Mensalidade[]>('/mensalidades', { query: { de, ate } })
      .then(setMensalidades)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Despesa[]>('/despesas', { query: { de, ate } })
      .then(setDespesas)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Doacao[]>('/doacoes', { query: { de, ate } })
      .then(setDoacoes)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [de, ate]);

  useEffect(() => {
    api<Configuracao>('/configuracao').then(setConfig).catch(() => undefined);
  }, []);

  const totalEntradas = mensalidades.reduce((soma, m) => soma + Number(m.valor), 0);
  const totalDoacoes = doacoes.reduce((soma, d) => soma + Number(d.valor), 0);
  const totalSaidas = despesas.reduce((soma, d) => soma + Number(d.valor), 0);
  const saldo = totalEntradas + totalDoacoes - totalSaidas;
  const emissao = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="area-tela">
        <header className="pagina-topo">
          <div>
            <h1>Caixa impresso</h1>
            <p className="subtitulo">
              Mensalidades, doações e despesas de {rotuloMes(mes)} · saldo {moeda(saldo)}
            </p>
          </div>
          <div className="acoes-topo">
            <Link className="botao" to={`/financeiro?mes=${mes}`}>
              Voltar ao financeiro
            </Link>
            <Link className="botao" to="/configuracoes">
              Editar cabeçalho
            </Link>
            <button type="button" className="botao botao-primario" onClick={() => window.print()}>
              Imprimir / Salvar em PDF
            </button>
          </div>
        </header>

        <div className="barra-filtros">
          <button type="button" className="botao-mini" onClick={() => mudarMes(deslocarMesSafe(mes, -1))}>
            ← mês anterior
          </button>
          <select className="selecao" value={mes} onChange={(e) => mudarMes(e.target.value)}>
            {opcoesDeMes().map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </select>
          <button type="button" className="botao-mini" onClick={() => mudarMes(deslocarMesSafe(mes, 1))}>
            próximo mês →
          </button>
        </div>

        {erro && <div className="aviso erro">{erro}</div>}
      </div>

      <article className="documento">
        <div className="doc-identidade">
          <img className="doc-logo" src="/Santuario1.jpg" alt="Ministro da Eucaristia" />
          {config?.nomeParoquia && <h2 className="doc-paroquia">{config.nomeParoquia}</h2>}
          {config?.tituloGrupo && <h3 className="doc-grupo">{config.tituloGrupo}</h3>}
        </div>

        <h1 className="doc-titulo">Caixa {rotuloMesCurto(mes)}</h1>

        <p className="doc-rodape">
          <span>
            Referente ao período de {dataCurta(de)} a {dataCurta(ate)}
          </span>
          <span>Emitido em {dataCurta(emissao)}</span>
        </p>

        <h2 className="doc-secao">
          Entradas (Mensalidades) <small>({mensalidades.length})</small>
        </h2>
        <table className="doc-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Ministro</th>
              <th>Competência</th>
              <th>Forma</th>
              <th className="doc-num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {mensalidades.map((m) => (
              <tr key={m.id}>
                <td className="centro">{dataCurta(m.dataRecebimento)}</td>
                <td>
                  {m.ministroNome}
                  {m.observacao && <span className="bloco">{m.observacao}</span>}
                </td>
                <td className="centro">{rotuloMesCurto(m.competencia)}</td>
                <td className="centro">{m.formaPagamento ?? '—'}</td>
                <td className="doc-num">{moeda(m.valor)}</td>
              </tr>
            ))}
            {mensalidades.length === 0 && (
              <tr>
                <td colSpan={5} className="centro">
                  Nenhuma mensalidade recebida em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="doc-total">
              <td colSpan={4}>Total de entradas</td>
              <td className="doc-num">{moeda(totalEntradas)}</td>
            </tr>
          </tfoot>
        </table>

        <h2 className="doc-secao">
          Outras entradas <small>({doacoes.length})</small>
        </h2>
        <table className="doc-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição / doador</th>
              <th className="doc-num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {doacoes.map((d) => (
              <tr key={d.id}>
                <td className="centro">{dataCurta(d.data)}</td>
                <td className="centro">{d.categoria ?? '—'}</td>
                <td>
                  {d.descricao}
                  {d.observacao && <span className="bloco">{d.observacao}</span>}
                </td>
                <td className="doc-num">{moeda(d.valor)}</td>
              </tr>
            ))}
            {doacoes.length === 0 && (
              <tr>
                <td colSpan={4} className="centro">
                  Nenhuma entrada recebida em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="doc-total">
              <td colSpan={3}>Total de outras entradas</td>
              <td className="doc-num">{moeda(totalDoacoes)}</td>
            </tr>
          </tfoot>
        </table>

        <h2 className="doc-secao">
          Saídas (Despesas realizadas) <small>({despesas.length})</small>
        </h2>
        <table className="doc-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th className="doc-num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => (
              <tr key={d.id}>
                <td className="centro">{dataCurta(d.data)}</td>
                <td className="centro">{d.categoria ?? '—'}</td>
                <td>
                  {d.descricao}
                  {d.observacao && <span className="bloco">{d.observacao}</span>}
                </td>
                <td className="doc-num">{moeda(d.valor)}</td>
              </tr>
            ))}
            {despesas.length === 0 && (
              <tr>
                <td colSpan={4} className="centro">
                  Nenhuma despesa em {rotuloMes(mes)}.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="doc-total">
              <td colSpan={3}>Total de saídas</td>
              <td className="doc-num">{moeda(totalSaidas)}</td>
            </tr>
          </tfoot>
        </table>

        <table className="doc-resumo">
          <tbody>
            <tr>
              <td>Mensalidades</td>
              <td className="doc-num">{moeda(totalEntradas)}</td>
            </tr>
            <tr>
              <td>Outras entradas</td>
              <td className="doc-num">{moeda(totalDoacoes)}</td>
            </tr>
            <tr>
              <td>Despesas</td>
              <td className="doc-num">− {moeda(totalSaidas)}</td>
            </tr>
            <tr className="doc-total">
              <td>
                <strong>Saldo em caixa</strong>
              </td>
              <td className="doc-num">
                <strong>{moeda(saldo)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="doc-assinaturas">
          <div className="doc-assinatura">Responsável pelo caixa</div>
        </div>
      </article>
    </>
  );
}

/** Atalho local para manter a leitura do JSX simétrica com o resto do app. */
function deslocarMesSafe(yyyyMm: string, delta: number): string {
  const [ano, mes] = yyyyMm.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
