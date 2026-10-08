import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import type { Configuracao, Despesa, Doacao, Mensalidade } from '../types';
import { dataCurta, moeda, rotuloMes } from '../lib/format';

const ANO_ATUAL = new Date().getFullYear();

/**
 * Impressão do **caixa anual**: movimentação mês a mês (mensalidades, outras entradas,
 * despesas e saldo de cada mês) com a linha de totais do ano, no mesmo modelo
 * da paróquia do caixa mensal.
 *
 * Critério de agrupamento: mensalidades pela **competência** (o mês que a
 * mensalidade representa); outras entradas e despesas pela **data** do lançamento.
 */
export default function ImpressaoCaixaAnual() {
  const [params, setParams] = useSearchParams();
  const ano = Number(params.get('ano')) || ANO_ATUAL;
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const de = `${ano}-01-01`;
  const ate = `${ano}-12-31`;

  function mudarAno(novo: number) {
    setParams({ ano: String(novo) });
  }

  useEffect(() => {
    setErro(null);
    api<Mensalidade[]>('/mensalidades', {
      query: { competenciaDe: `${ano}-01`, competenciaAte: `${ano}-12` },
    })
      .then(setMensalidades)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Despesa[]>('/despesas', { query: { de, ate } })
      .then(setDespesas)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Doacao[]>('/doacoes', { query: { de, ate } })
      .then(setDoacoes)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [ano, de, ate]);

  useEffect(() => {
    api<Configuracao>('/configuracao').then(setConfig).catch(() => undefined);
  }, []);

  const linhas = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const mes = `${ano}-${String(i + 1).padStart(2, '0')}`;
        const mens = mensalidades
          .filter((m) => m.competencia === mes)
          .reduce((soma, m) => soma + Number(m.valor), 0);
        const doa = doacoes
          .filter((d) => d.data.slice(0, 7) === mes)
          .reduce((soma, d) => soma + Number(d.valor), 0);
        const desp = despesas
          .filter((d) => d.data.slice(0, 7) === mes)
          .reduce((soma, d) => soma + Number(d.valor), 0);
        return { mes, mens, doa, desp, saldo: mens + doa - desp };
      }),
    [ano, mensalidades, doacoes, despesas],
  );

  const totalMensalidades = linhas.reduce((soma, l) => soma + l.mens, 0);
  const totalDoacoes = linhas.reduce((soma, l) => soma + l.doa, 0);
  const totalDespesas = linhas.reduce((soma, l) => soma + l.desp, 0);
  const saldo = totalMensalidades + totalDoacoes - totalDespesas;

  const anos = Array.from({ length: 9 }, (_, i) => ANO_ATUAL - 7 + i);
  if (!anos.includes(ano)) anos.push(ano);
  anos.sort((a, b) => b - a);

  const emissao = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="area-tela">
        <header className="pagina-topo">
          <div>
            <h1>Caixa anual impresso</h1>
            <p className="subtitulo">
              Movimentação de {ano} · saldo {moeda(saldo)}
            </p>
          </div>
          <div className="acoes-topo">
            <Link className="botao" to={`/financeiro?mes=${ano}-12`}>
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
          <button type="button" className="botao-mini" onClick={() => mudarAno(ano - 1)}>
            ← ano anterior
          </button>
          <select
            className="selecao"
            value={ano}
            onChange={(e) => mudarAno(Number(e.target.value))}
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="button" className="botao-mini" onClick={() => mudarAno(ano + 1)}>
            próximo ano →
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

        <h1 className="doc-titulo">Caixa {ano}</h1>

        <p className="doc-rodape">
          <span>
            Referente ao período de {dataCurta(de)} a {dataCurta(ate)}
          </span>
          <span>Emitido em {dataCurta(emissao)}</span>
        </p>

        <h2 className="doc-secao">
          Movimentação mês a mês <small>(12 meses)</small>
        </h2>
        <table className="doc-tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="doc-num">Mensalidades</th>
              <th className="doc-num">Outras entradas</th>
              <th className="doc-num">Despesas</th>
              <th className="doc-num">Saldo do mês</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.mes}>
                <td>{rotuloMes(l.mes)}</td>
                <td className="doc-num">{moeda(l.mens)}</td>
                <td className="doc-num">{moeda(l.doa)}</td>
                <td className="doc-num">{moeda(l.desp)}</td>
                <td className="doc-num">{moeda(l.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="doc-total">
              <td>Total do ano</td>
              <td className="doc-num">{moeda(totalMensalidades)}</td>
              <td className="doc-num">{moeda(totalDoacoes)}</td>
              <td className="doc-num">{moeda(totalDespesas)}</td>
              <td className="doc-num">{moeda(saldo)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="doc-nota">
          Mensalidades agrupadas por competência; outras entradas e despesas pela data do lançamento.
        </p>

        <table className="doc-resumo">
          <tbody>
            <tr>
              <td>Mensalidades</td>
              <td className="doc-num">{moeda(totalMensalidades)}</td>
            </tr>
            <tr>
              <td>Outras entradas</td>
              <td className="doc-num">{moeda(totalDoacoes)}</td>
            </tr>
            <tr>
              <td>Despesas</td>
              <td className="doc-num">− {moeda(totalDespesas)}</td>
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
