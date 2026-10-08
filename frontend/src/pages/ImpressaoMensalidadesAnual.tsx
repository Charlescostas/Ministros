import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import type { Configuracao, Mensalidade, Ministro } from '../types';
import { MESES_SIGLAS, dataCurta, moeda, moedaSemSimbolo, rotuloMes } from '../lib/format';

const ANO_ATUAL = new Date().getFullYear();

/**
 * Quadro anual de **mensalidades**: cada ministro em uma linha, os 12 meses em
 * colunas, com o total por ministro e por mês. Impresso em paisagem (A4
 * horizontal) para caber o quadro inteiro; o cabeçalho se repete em cada folha.
 *
 * As células usam a **competência** da mensalidade (o mês que ela representa);
 * ministros inativos aparecem marcados quando têm lançamento no ano.
 */
export default function ImpressaoMensalidadesAnual() {
  const [params, setParams] = useSearchParams();
  const ano = Number(params.get('ano')) || ANO_ATUAL;
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function mudarAno(novo: number) {
    setParams({ ano: String(novo) });
  }

  useEffect(() => {
    setErro(null);
    api<Ministro[]>('/ministros')
      .then(setMinistros)
      .catch((ex) => setErro(mensagemErro(ex)));
    api<Mensalidade[]>('/mensalidades', {
      query: { competenciaDe: `${ano}-01`, competenciaAte: `${ano}-12` },
    })
      .then(setMensalidades)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [ano]);

  useEffect(() => {
    api<Configuracao>('/configuracao').then(setConfig).catch(() => undefined);
  }, []);

  const linhas = useMemo(() => {
    const porChave = new Map<string, number>();
    mensalidades.forEach((m) => {
      const chave = `${m.ministroId}|${m.competencia}`;
      porChave.set(chave, (porChave.get(chave) ?? 0) + Number(m.valor));
    });
    const comLancamento = new Set(mensalidades.map((m) => m.ministroId));

    return ministros
      .filter((m) => m.ativo || comLancamento.has(m.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((m) => {
        const valores = MESES_SIGLAS.map(
          (_, i) => porChave.get(`${m.id}|${ano}-${String(i + 1).padStart(2, '0')}`) ?? 0,
        );
        return { ministro: m, valores, total: valores.reduce((soma, v) => soma + v, 0) };
      });
  }, [ano, ministros, mensalidades]);

  const totaisMes = MESES_SIGLAS.map((_, i) => linhas.reduce((soma, l) => soma + l.valores[i], 0));
  const totalGeral = linhas.reduce((soma, l) => soma + l.total, 0);

  const anos = Array.from({ length: 9 }, (_, i) => ANO_ATUAL - 7 + i);
  if (!anos.includes(ano)) anos.push(ano);
  anos.sort((a, b) => b - a);

  const emissao = new Date().toISOString().slice(0, 10);

  return (
    <>
      {/* Quadro largo: imprime em A4 paisagem (substitui o @page retrato padrão). */}
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>

      <div className="area-tela">
        <header className="pagina-topo">
          <div>
            <h1>Mensalidades impressas</h1>
            <p className="subtitulo">
              Quadro anual de {ano} · {linhas.length} ministro(s) · total {moeda(totalGeral)}
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

      <article className="documento doc-largura">
        <div className="doc-identidade">
          <img className="doc-logo" src="/Santuario1.jpg" alt="Ministro da Eucaristia" />
          {config?.nomeParoquia && <h2 className="doc-paroquia">{config.nomeParoquia}</h2>}
          {config?.tituloGrupo && <h3 className="doc-grupo">{config.tituloGrupo}</h3>}
        </div>

        <h1 className="doc-titulo">Mensalidades {ano}</h1>

        <p className="doc-rodape">
          <span>Competências de janeiro a dezembro de {ano}</span>
          <span>Emitido em {dataCurta(emissao)}</span>
        </p>

        <h2 className="doc-secao">
          Pagamentos por ministro e por mês{' '}
          <small>
            ({linhas.length} ministro(s) · {mensalidades.length} lançamento(s))
          </small>
        </h2>

        <table className="doc-matriz">
          <thead>
            <tr>
              <th>Ministro</th>
              {MESES_SIGLAS.map((mes) => (
                <th key={mes}>{mes}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.ministro.id}>
                <td className="rotulo">
                  {l.ministro.nome}
                  {!l.ministro.ativo && <span className="inativo"> (inativo)</span>}
                </td>
                {l.valores.map((valor, i) => (
                  <td key={i} className={valor ? '' : 'centro'}>
                    {valor ? moedaSemSimbolo(valor) : '—'}
                  </td>
                ))}
                <td className="doc-num total">{moedaSemSimbolo(l.total)}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={14} className="centro">
                  Nenhum ministro para exibir em {ano}.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="doc-total">
              <td className="rotulo">Total por mês</td>
              {totaisMes.map((total, i) => (
                <td key={i} className="doc-num">
                  {moedaSemSimbolo(total)}
                </td>
              ))}
              <td className="doc-num total">{moedaSemSimbolo(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="doc-nota">
          Valores em reais, pela competência — “—” sem lançamento no mês · {rotuloMes(`${ano}-01`)} a{' '}
          {rotuloMes(`${ano}-12`)}.
        </p>

        <div className="doc-assinaturas">
          <div className="doc-assinatura">Responsável pelo caixa</div>
        </div>
      </article>
    </>
  );
}
