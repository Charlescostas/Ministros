import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Equipe, GeracaoEquipes, Missa } from '../types';
import {
  DIAS_SEMANA_EXTENSO,
  dataPorExtenso,
  deslocarMes,
  diaSemanaExtenso,
  horaCurta,
  mesAtual,
  opcoesDeData,
  rotuloMes,
} from '../lib/format';

/** Padrões já preenchidos no cadastro de missa (é só apagar se não servir). */
const LOCAL_PADRAO = 'Santuário';
const CELEBRANTE_PADRAO = 'Pe. Edison';

/** Missas fixas da semana, para cadastrar o mês de uma vez: dia (0 = domingo) e hora. */
const MISSAS_PADRAO = [
  { dia: 4, hora: '19:30' }, // quinta-feira
  { dia: 6, hora: '17:00' }, // sábado
  { dia: 0, hora: '08:00' }, // domingo
  { dia: 0, hora: '19:30' }, // domingo
];

/** Converte o mapa { "DOMINGO": 3, ... } em texto legivel. */
function rotulosDias(mapa: Record<string, number>): string {
  return Object.entries(mapa)
    .map(([dia, qtd]) => `${dia} ${qtd}`)
    .join(', ');
}

interface FormMissa {
  id?: number;
  data: string;
  hora: string;
  titulo: string;
  celebrante: string;
  local: string;
  equipeId: string;
  observacoes: string;
  destaque: boolean;
}

export default function Missas() {
  const [mes, setMes] = useState(mesAtual());
  const [equipeId, setEquipeId] = useState('');
  const [missas, setMissas] = useState<Missa[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState<FormMissa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const [mostrarGerador, setMostrarGerador] = useState(false);
  const [substituir, setSubstituir] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [geracao, setGeracao] = useState<GeracaoEquipes | null>(null);
  const [erroGerador, setErroGerador] = useState<string | null>(null);

  const [ano, mesNum] = mes.split('-').map(Number);
  const de = `${ano}-${String(mesNum).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  const ate = `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  function carregar() {
    api<Missa[]>('/missas', { query: { de, ate, equipeId } })
      .then(setMissas)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  useEffect(() => {
    setAviso(null);
    carregar();
  }, [mes, equipeId]);

  useEffect(() => {
    api<Equipe[]>('/equipes').then(setEquipes).catch(() => undefined);
  }, []);

  function novo() {
    const data = `${mes}-01`;
    setForm({
      data,
      hora: '19:00',
      // título já nasce com o dia da semana da data escolhida
      titulo: diaSemanaExtenso(data),
      celebrante: CELEBRANTE_PADRAO,
      local: LOCAL_PADRAO,
      equipeId: '',
      observacoes: '',
      destaque: false,
    });
  }

  /**
   * Troca a data da missa. Enquanto o título for só o dia da semana (ou estiver
   * vazio) ele acompanha a data; assim que você digitar outra coisa, fica o que
   * você escreveu.
   */
  function mudarData(nova: string) {
    setForm((atual) => {
      if (!atual) return atual;
      const titulo = atual.titulo.trim();
      const automatico = !titulo || DIAS_SEMANA_EXTENSO.includes(titulo);
      return {
        ...atual,
        data: nova,
        titulo: automatico ? diaSemanaExtenso(nova) : atual.titulo,
      };
    });
  }

  function editar(missa: Missa) {
    setForm({
      id: missa.id,
      data: missa.data,
      hora: horaCurta(missa.hora),
      titulo: missa.titulo,
      celebrante: missa.celebrante ?? '',
      local: missa.local ?? '',
      equipeId: missa.equipeId ? String(missa.equipeId) : '',
      observacoes: missa.observacoes ?? '',
      destaque: missa.destaque,
    });
  }

  function salvar() {
    if (!form) return;
    setSalvando(true);
    const corpo = {
      data: form.data,
      hora: form.hora,
      titulo: form.titulo,
      celebrante: form.celebrante || null,
      local: form.local || null,
      equipeId: form.equipeId ? Number(form.equipeId) : null,
      observacoes: form.observacoes || null,
      destaque: form.destaque === true,
    };
    const requisicao = form.id
      ? api<Missa>(`/missas/${form.id}`, { method: 'PUT', body: corpo })
      : api<Missa>('/missas', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setForm(null);
        carregar();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function excluir(missa: Missa) {
    if (!window.confirm(`Excluir a missa "${missa.titulo}" de ${dataPorExtenso(missa.data)}?`)) return;
    api<void>(`/missas/${missa.id}`, { method: 'DELETE' })
      .then(carregar)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  function abrirGerador() {
    setGeracao(null);
    setErroGerador(null);
    setSubstituir(false);
    setMostrarGerador(true);
  }

  function gerarEquipes() {
    setGerando(true);
    setErroGerador(null);
    api<GeracaoEquipes>('/escalas/equipes/gerar', { method: 'POST', body: { mes, substituir } })
      .then((r) => {
        setGeracao(r);
        carregar();
      })
      .catch((ex) => setErroGerador(mensagemErro(ex)))
      .finally(() => setGerando(false));
  }

  /**
   * Cadastra de uma vez as missas fixas do mês selecionado — quinta 19:30,
   * sábado 17:00 e domingo 08:00 e 19:30 — com o dia da semana no título, o
   * local e o celebrante padrões. O que já existir (mesma data e hora) é pulado.
   */
  async function cadastrarPadroes() {
    setAviso(null);
    setErro(null);

    // confere o mês inteiro, mesmo com filtro de equipe lá em cima
    let atuais: Missa[] = [];
    try {
      atuais = await api<Missa[]>('/missas', { query: { de, ate } });
    } catch (ex) {
      setErro(mensagemErro(ex));
      return;
    }
    const existentes = new Set(atuais.map((m) => `${m.data}|${horaCurta(m.hora)}`));

    const [ano, mesNum] = mes.split('-').map(Number);
    const ultimoDia = new Date(ano, mesNum, 0).getDate();
    const aCriar: { data: string; hora: string; titulo: string }[] = [];
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const data = `${mes}-${String(dia).padStart(2, '0')}`;
      const diaSemana = new Date(ano, mesNum - 1, dia).getDay();
      MISSAS_PADRAO.filter((p) => p.dia === diaSemana)
        .filter((p) => !existentes.has(`${data}|${p.hora}`))
        .forEach((p) => aCriar.push({ data, hora: p.hora, titulo: diaSemanaExtenso(data) }));
    }

    if (aCriar.length === 0) {
      setAviso(`Todas as missas padrão de ${rotuloMes(mes)} já estão cadastradas.`);
      return;
    }

    if (
      !window.confirm(
        `Cadastrar ${aCriar.length} missa(s) padrão de ${rotuloMes(mes)}?\n\n` +
          'Quinta 19:30 · sábado 17:00 · domingo 08:00 e 19:30,\n' +
          `com o dia da semana no título, local “${LOCAL_PADRAO}” e celebrante “${CELEBRANTE_PADRAO}”.`,
      )
    ) {
      return;
    }

    setCadastrando(true);
    try {
      for (const m of aCriar) {
        await api('/missas', {
          method: 'POST',
          body: {
            data: m.data,
            hora: m.hora,
            titulo: m.titulo,
            celebrante: CELEBRANTE_PADRAO,
            local: LOCAL_PADRAO,
            equipeId: null,
            observacoes: null,
            destaque: false,
          },
        });
      }
      setAviso(`${aCriar.length} missa(s) cadastrada(s) em ${rotuloMes(mes)}.`);
      carregar();
    } catch (ex) {
      setErro(mensagemErro(ex));
    } finally {
      setCadastrando(false);
    }
  }

  const datas = opcoesDeData();

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Missas</h1>
          <p className="subtitulo">{rotuloMes(mes)} · {missas.length} missa(s)</p>
        </div>
        <div className="acoes-topo">
          <button
            type="button"
            className="botao"
            onClick={cadastrarPadroes}
            disabled={cadastrando}
          >
            {cadastrando ? 'Cadastrando…' : 'Cadastrar missas do mês'}
          </button>
          <button type="button" className="botao" onClick={abrirGerador}>
            Gerar Escala do mês
          </button>
          <button type="button" className="botao botao-primario" onClick={novo}>
            + Nova missa
          </button>
        </div>
      </header>

      {aviso && <div className="aviso">{aviso}</div>}
      {erro && <div className="aviso erro">{erro}</div>}

      <div className="barra-filtros">
        <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, -1))}>
          ← mês anterior
        </button>
        <strong className="rotulo-mes">{rotuloMes(mes)}</strong>
        <button type="button" className="botao-mini" onClick={() => setMes(deslocarMes(mes, 1))}>
          próximo mês →
        </button>

        <select className="selecao" value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
          <option value="">Todas as equipes</option>
          {equipes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <section className="painel">
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Hora</th>
              <th>Missão / Celebração</th>
              <th>Celebrante</th>
              <th>Equipe</th>
              <th>Escala</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {missas.map((m) => (
              <tr key={m.id}>
                <td>{dataPorExtenso(m.data)}</td>
                <td>{horaCurta(m.hora)}</td>
                <td>
                  <strong>{m.titulo}</strong>
                  {m.local && <small className="bloco">{m.local}</small>}
                </td>
                <td>{m.celebrante ?? '—'}</td>
                <td>{m.equipeNome ?? <span className="selo selo-alerta">sem equipe</span>}</td>
                <td>
                  <span className={`selo ${m.escalada ? 'selo-ok' : 'selo-alerta'}`}>
                    {m.escalada ? 'gerada' : 'pendente'}
                  </span>
                </td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => editar(m)}>
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluir(m)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {missas.length === 0 && (
              <tr>
                <td colSpan={7} className="vazio">
                  Nenhuma missa neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {form && (
        <Modal titulo={form.id ? 'Editar missa' : 'Nova missa'} aoFechar={() => setForm(null)}>
          <form
            className="formulario"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvar();
            }}
          >
            <div className="linha-dupla">
              <label>
                Data *
                <select
                  value={form.data}
                  onChange={(e) => mudarData(e.target.value)}
                  required
                >
                  {datas.map((d) => (
                    <option key={d} value={d}>
                      {dataPorExtenso(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hora *
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  required
                />
              </label>
            </div>

            <label>
              Título / Celebração *
              <input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: 28º Domingo do Tempo Comum"
                required
                autoFocus
              />
            </label>

            <div className="linha-dupla">
              <label>
                Celebrante
                <input
                  value={form.celebrante}
                  onChange={(e) => setForm({ ...form, celebrante: e.target.value })}
                />
              </label>
              <label>
                Local
                <input
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  placeholder="Igreja matriz"
                />
              </label>
            </div>

            <label>
              Equipe responsável
              <select
                value={form.equipeId}
                onChange={(e) => setForm({ ...form, equipeId: e.target.value })}
              >
                <option value="">— sem equipe —</option>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observação (aparece na escala impressa)
              <input
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Ex.: Batizado, Missa da Saúde, Casamento…"
              />
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
              />
              Destacar esta missa em vermelho na escala impressa
            </label>

            <div className="formulario-acoes">
              <button type="button" className="botao" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-primario" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {mostrarGerador && (
        <Modal
          titulo="Gerar escala de equipes"
          aoFechar={() => setMostrarGerador(false)}
          largura="amplo"
        >
          <div className="formulario">
            <p className="dica">
              Para cada missa de <strong>{rotuloMes(mes)}</strong> a equipe é escolhida nesta ordem:
              <br />
              <strong>1.</strong> quem tem <strong>menos missas no mês</strong> (as equipes ficam
              com quantidades parecidas);
              <br />
              <strong>2.</strong> quem tem <strong>menos missas nesse mesmo dia e horário</strong>{' '}
              (somando o histórico gravado dos meses anteriores, quando ativado nas
              configurações) — assim uma equipe que já faz quinta 19:30 e domingo 8h não
              acumula esses horários;
              <br />
              <strong>3.</strong> quem tem menos missas nesse dia da semana; <strong>4.</strong>{' '}
              menor total geral. Empate: menor número da equipe.
            </p>

            <label className="check">
              <input
                type="checkbox"
                checked={substituir}
                onChange={(e) => setSubstituir(e.target.checked)}
              />
              Substituir as equipes já cadastradas em {rotuloMes(mes)}
            </label>

            {erroGerador && <div className="aviso erro">{erroGerador}</div>}

            {geracao && (
              <>
                <div className="aviso sucesso">
                  {geracao.atribuidas} equipe(s) atribuída(s) e {geracao.mantidas} mantida(s) em{' '}
                  {geracao.totalMissas} missa(s) de {rotuloMes(geracao.mes)}.
                  {geracao.historicoConsiderado
                    ? ' Os horários de meses anteriores entraram no equilíbrio.'
                    : ' Neste mês o equilíbrio usou só as missas do próprio mês (histórico começa mais tarde).'}
                  {geracao.historicoId && (
                    <>
                      {' '}
                      <Link to="/escala/historico">Ver histórico deste registro</Link> — membros das
                      equipes e missas por dia da semana daquele momento.
                    </>
                  )}
                </div>

                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Equipe</th>
                      <th className="num">No mês</th>
                      <th>Meses anteriores (por dia da semana)</th>
                      <th>No mês (por dia da semana)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geracao.resumo.map((r) => (
                      <tr key={r.equipeId}>
                        <td>
                          <strong>{r.numero ? `EQUIPE ${r.numero}` : r.nome}</strong>
                          {r.numero && <small className="bloco">{r.nome}</small>}
                        </td>
                        <td className="num">{r.noMes}</td>
                        <td>{rotulosDias(r.historicoPorDiaSemana) || '—'}</td>
                        <td>{rotulosDias(r.noMesPorDiaSemana) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="formulario-acoes">
              <button type="button" className="botao" onClick={() => setMostrarGerador(false)}>
                Fechar
              </button>
              <button
                type="button"
                className="botao botao-primario"
                onClick={gerarEquipes}
                disabled={gerando}
              >
                {gerando ? 'Gerando…' : geracao ? 'Gerar novamente' : 'Gerar agora'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
