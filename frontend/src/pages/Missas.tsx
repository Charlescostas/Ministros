import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Equipe, Missa } from '../types';
import { dataPorExtenso, deslocarMes, horaCurta, mesAtual, opcoesDeData, rotuloMes } from '../lib/format';

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
  const [form, setForm] = useState<FormMissa | null>(null);
  const [salvando, setSalvando] = useState(false);

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
    carregar();
  }, [mes, equipeId]);

  useEffect(() => {
    api<Equipe[]>('/equipes').then(setEquipes).catch(() => undefined);
  }, []);

  function novo() {
    setForm({
      data: `${mes}-01`,
      hora: '19:00',
      titulo: '',
      celebrante: '',
      local: '',
      equipeId: '',
      observacoes: '',
      destaque: false,
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

  const datas = opcoesDeData();

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Missas</h1>
          <p className="subtitulo">{rotuloMes(mes)} · {missas.length} missa(s)</p>
        </div>
        <button type="button" className="botao botao-primario" onClick={novo}>
          + Nova missa
        </button>
      </header>

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
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
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
    </>
  );
}
