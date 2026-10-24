import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Configuracao, Equipe, EscalaItem, HistoricoDetalhe, HistoricoEquipe, HistoricoMissa, Ministro, Missa } from '../types';
import { deslocarMes, mesAtual, opcoesDeMes, rotuloMes, rotuloMesCurto } from '../lib/format';
import { abrirWhatsapp, textoEscalaDoMes } from '../lib/whatsapp';

const DIAS = [
  'DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA',
  'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO',
];

function diaSemana(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return DIAS[new Date(ano, mes - 1, dia).getDay()];
}

function diaDoMes(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/** "05/10/2026 às 14:32" a partir do ISO gravado pelo backend. */
function dataHora(iso: string): string {
  const d = new Date(iso);
  const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${data} às ${hora}`;
}

export default function Impressao() {
  const [mes, setMes] = useState(mesAtual());
  const [missas, setMissas] = useState<Missa[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [itens, setItens] = useState<EscalaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  /** Última fotografia da geração deste mês (se houver), usada no documento. */
  const [historico, setHistorico] = useState<HistoricoDetalhe | null>(null);
  /** Mostrar o documento como estava na geração (padrão) ou com os dados atuais. */
  const [usarHistorico, setUsarHistorico] = useState(true);
  /** Prévia do resumo do mês, mostrada em tela antes de abrir o WhatsApp. */
  const [preview, setPreview] = useState<{ titulo: string; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [ano, mesNum] = mes.split('-').map(Number);
  const de = `${ano}-${String(mesNum).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  const ate = `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  useEffect(() => {
    api<Missa[]>('/missas', { query: { de, ate } })
      .then(setMissas)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [de, ate]);

  useEffect(() => {
    api<Equipe[]>('/equipes').then(setEquipes).catch((ex) => setErro(mensagemErro(ex)));
    api<Configuracao>('/configuracao').then(setConfig).catch((ex) => setErro(mensagemErro(ex)));
  }, []);

  /** Escala gerada do mês (todas as equipes), usada no resumo enviado por WhatsApp. */
  useEffect(() => {
    api<EscalaItem[]>('/escalas', { query: { mes } })
      .then(setItens)
      .catch((ex) => setErro(mensagemErro(ex)));
  }, [mes]);

  /** Fotografia da geração do mês: documento igualzinho a quando a escala foi criada. */
  useEffect(() => {
    setHistorico(null);
    api<HistoricoDetalhe[]>('/escalas/historico', { query: { mes } })
      .then((registros) => {
        const ultimo = registros[0];
        if (!ultimo) {
          setUsarHistorico(true);
          return;
        }
        return api<HistoricoDetalhe>(`/escalas/historico/${ultimo.id}`).then((detalhe) => {
          setHistorico(detalhe);
          setUsarHistorico(true);
        });
      })
      .catch(() => undefined); // sem historico: documento com os dados atuais
  }, [mes]);

  const comHistorico = usarHistorico && historico !== null && historico.missas.length > 0;

  const equipesOrganizadas = [...equipes].sort((a, b) => {
    if (a.numero != null && b.numero != null) return a.numero - b.numero;
    if (a.numero != null) return -1;
    if (b.numero != null) return 1;
    return a.nome.localeCompare(b.nome);
  });

  const rotuloEquipe = (equipeId: number | null, nome: string | null): string => {
    const equipe = equipes.find((e) => e.id === equipeId);
    if (equipe?.numero != null) return `EQUIPE ${equipe.numero}`;
    return equipe?.nome ?? nome ?? '—';
  };

  const rotuloCoordenador = (sexo: string | null | undefined): string =>
    sexo?.trim().toLowerCase() === 'masculino' ? '(Coordenador)' : '(Coordenadora)';

  const rotuloEquipeLista = (numero: number | null, nome: string): string =>
    numero != null ? `EQUIPE ${numero}` : nome;

  /**
   * Integrantes do quadro impresso: o coordenador vem **primeiro da linha**
   * e os demais mantêm a ordem original (alfabética).
   */
  const membrosDaEquipe = (equipe: Equipe): Ministro[] =>
    [...equipe.ministros].sort(
      (a, b) =>
        (a.id === equipe.coordenadorId ? 0 : 1) - (b.id === equipe.coordenadorId ? 0 : 1),
    );

  /** Missas do documento: a fotografia da geração, ou as missas atuais. */
  const missasDoDocumento: Array<{
    chave: number | string;
    data: string;
    hora: string;
    rotuloEquipe: string;
    observacoes: string | null;
    destaque: boolean;
  }> = comHistorico
    ? historico.missas.map((m: HistoricoMissa) => ({
        chave: m.missaId,
        data: m.data,
        hora: m.hora,
        rotuloEquipe:
          m.equipeNumero != null ? `EQUIPE ${m.equipeNumero}` : m.equipeNome ?? '—',
        observacoes: m.observacoes,
        destaque: m.destaque,
      }))
    : missas.map((m) => ({
        chave: m.id,
        data: m.data,
        hora: m.hora,
        rotuloEquipe: rotuloEquipe(m.equipeId, m.equipeNome),
        observacoes: m.observacoes,
        destaque: m.destaque,
      }));

  /** Quadro de equipes do documento: a fotografia da geração, ou as equipes atuais. */
  const equipesDoDocumento: Array<{
    chave: number | string;
    rotulo: string;
    membros: Array<{ chave: number | string; nome: string; coordenador: boolean; sexo: string | null }>;
  }> = comHistorico
    ? [...historico.equipes]
        .sort((a, b) => {
          if (a.numero != null && b.numero != null) return a.numero - b.numero;
          if (a.numero != null) return -1;
          if (b.numero != null) return 1;
          return a.nome.localeCompare(b.nome);
        })
        .map((e: HistoricoEquipe) => ({
          chave: e.equipeId,
          rotulo: rotuloEquipeLista(e.numero, e.nome),
          membros: e.membros
            .map((m) => ({
              chave: m.ministroId,
              nome: m.nome,
              coordenador: m.coordenador,
              sexo: m.sexo,
            }))
            .sort((a, b) => (a.coordenador ? 0 : 1) - (b.coordenador ? 0 : 1)),
        }))
    : equipesOrganizadas.map((e) => ({
        chave: e.id,
        rotulo: rotuloEquipeLista(e.numero, e.nome),
        membros: membrosDaEquipe(e).map((m) => ({
          chave: m.id,
          nome: m.nome,
          coordenador: e.coordenadorId === m.id,
          sexo: m.sexo,
        })),
      }));

  /** Mostra em tela o resumo da escala do mês (daí copia ou abre o WhatsApp). */
  function enviarResumo() {
    setCopiado(false);
    setPreview({
      titulo: `Resumo da escala de ${rotuloMes(mes)}`,
      texto: textoEscalaDoMes(mes, itens, config),
    });
  }

  /** Copia o texto da prévia; sem permissão, deixa o texto selecionado para Ctrl+C. */
  async function copiarPreview() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.texto);
      setCopiado(true);
    } catch {
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

  return (
    <>
      <div className="area-tela">
        <header className="pagina-topo">
          <div>
            <h1>Escala impressa</h1>
            <p className="subtitulo">
              Documento de {rotuloMes(mes)} no modelo da paróquia · {missas.length} missa(s)
            </p>
          </div>
          <div className="acoes-topo">
            <Link className="botao" to="/configuracoes">
              Editar cabeçalho e textos
            </Link>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={enviarResumo}
              title="Confira o resumo da escala do mês e envie pelo WhatsApp"
            >
              Resumo no WhatsApp
            </button>
            <button type="button" className="botao botao-primario" onClick={() => window.print()}>
              Imprimir / Salvar em PDF
            </button>
          </div>
        </header>

        <div className="barra-filtros">
          <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, -1))}>
            ← mês anterior
          </button>
          <select className="selecao" value={mes} onChange={(e) => setMes(e.target.value)}>
            {opcoesDeMes().map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </select>
          <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, 1))}>
            próximo mês →
          </button>

          {historico && (
            <select
              className="selecao"
              value={usarHistorico ? 'historico' : 'atuais'}
              onChange={(e) => setUsarHistorico(e.target.value === 'historico')}
            >
              <option value="historico">
                Equipes da geração ({dataHora(historico.criadoEm)})
              </option>
              <option value="atuais">Equipes atuais</option>
            </select>
          )}
        </div>

        {historico && (
          <p className="dica">
            {comHistorico
              ? 'Mostrando a escala como ficou no momento da geração — membros das equipes e missas daquele instante.'
              : 'Mostrando os dados atuais — as equipes podem ter mudado desde a geração.'}{' '}
            <Link to="/escala/historico">Ver histórico completo</Link>
          </p>
        )}

        {erro && <div className="aviso erro">{erro}</div>}
      </div>

      <article className="documento">

        <div className="doc-identidade">
          <img className="doc-logo" src="/Santuario1.jpg" alt="Ministro da Eucaristia" />
          {config?.nomeParoquia && <h2 className="doc-paroquia">{config.nomeParoquia}</h2>}
          {config?.tituloGrupo && <h3 className="doc-grupo">{config.tituloGrupo}</h3>}
        </div>

       <h1 className="doc-titulo">Escala {rotuloMesCurto(mes)}</h1>

        <div className="doc-corpo">
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Dia da Semana</th>
                <th>Horário</th>
                <th>Equipe</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {missasDoDocumento.map((missa) => (
                <tr key={missa.chave} className={missa.destaque ? 'doc-destaque' : undefined}>
                  <td className="centro">{diaDoMes(missa.data)}</td>
                  <td>{diaSemana(missa.data)}</td>
                  <td className="centro">{missa.hora.slice(0, 5)}</td>
                  <td className="centro">{missa.rotuloEquipe}</td>
                  <td>{missa.observacoes ?? ''}</td>
                </tr>
              ))}
              {missasDoDocumento.length === 0 && (
                <tr>
                  <td colSpan={5} className="centro">
                    Nenhuma missa cadastrada em {rotuloMes(mes)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {config?.adendos && <pre className="doc-adendos">{config.adendos}</pre>}
        </div>

        <table className="doc-equipes">
          <tbody>
            {equipesDoDocumento.map((equipe) => (
              <tr key={equipe.chave}>
                <th>..::  Equipe {equipe.rotulo}  ::..</th>
                <td>
                  {equipe.membros.length === 0
                    ? 'Sem membros cadastrados'
                    : equipe.membros.map((m, i) => (
                        <Fragment key={m.chave}>
                          {i > 0 && '-'}
                          <span className={m.coordenador ? 'doc-coordenador' : undefined}>
                            {m.nome}
                            {m.coordenador && ` ${rotuloCoordenador(m.sexo)}`}
                          </span>
                        </Fragment>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {config?.textoObs && <p className="doc-obs">{config.textoObs}</p>}

        {config?.textoMissaMinistros && (
          <div className="doc-caixa">
            <h4>Missa dos Ministros</h4>
            <p>{config.textoMissaMinistros}</p>
          </div>
        )}
      </article>

      {preview && (
        <Modal titulo={preview.titulo} aoFechar={() => setPreview(null)} largura="amplo">
          <p className="dica">Depois de abrir o WhatsApp, você escolhe o contato ou o grupo.</p>

          {itens.length === 0 && (
            <div className="aviso erro">
              Nenhuma escala gerada em {rotuloMes(mes)} — gere na página <strong>Missas</strong>
              (botão “Gerar Escala do mês”).
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
              onClick={() => abrirWhatsapp(null, preview.texto)}
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
