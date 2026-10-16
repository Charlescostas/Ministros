import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Ministro } from '../types';

const VAZIO: Partial<Ministro> = {
  nome: '',
  telefone: '',
  email: '',
  sexo: '',
  dataNascimento: '',
  estadoCivil: '',
  conjugeId: null,
  ativo: true,
  observacoes: '',
};

/** Estados civis oferecidos no cadastro (mesma lista do backend). */
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'];

export default function Ministros() {
  const [lista, setLista] = useState<Ministro[]>([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Ministro> | null>(null);
  const [salvando, setSalvando] = useState(false);
  /** Ministros inteiros (sem filtro de busca), usados para escolher o conjuge. */
  const [candidatos, setCandidatos] = useState<Ministro[]>([]);

  function carregar(termo: string) {
    api<Ministro[]>('/ministros', { query: { busca: termo } })
      .then(setLista)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  useEffect(() => {
    carregar(busca);
  }, [busca]);

  /**
   * Ministros inteiros (sem filtro de busca), usados para escolher o conjuge.
   * A chave muda ao abrir o formulário: "novo" para cadastro, o id na edição.
   */
  const chaveFormulario = form ? (form.id ?? 'novo') : null;

  useEffect(() => {
    if (chaveFormulario === null) return;
    api<Ministro[]>('/ministros')
      .then(setCandidatos)
      .catch(() => setCandidatos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFormulario]);

  /** Escolhas de conjuge: tira o próprio ministro e quem já é casado com outra pessoa. */
  const disponiveisParaCasar = candidatos.filter(
    (c) => c.id !== form?.id && (!c.conjugeId || c.conjugeId === form?.id),
  );

  function salvar() {
    if (!form) return;
    setSalvando(true);
    const corpo = {
      nome: form.nome,
      telefone: form.telefone || null,
      email: form.email || null,
      sexo: form.sexo || null,
      dataNascimento: form.dataNascimento || null,
      estadoCivil: form.estadoCivil || null,
      conjugeId: form.conjugeId ?? null,
      ativo: form.ativo !== false,
      observacoes: form.observacoes || null,
    };
    const requisicao = form.id
      ? api<Ministro>(`/ministros/${form.id}`, { method: 'PUT', body: corpo })
      : api<Ministro>('/ministros', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setForm(null);
        carregar(busca);
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function excluir(ministro: Ministro) {
    if (!window.confirm(`Excluir o ministro ${ministro.nome}?`)) return;
    api<void>(`/ministros/${ministro.id}`, { method: 'DELETE' })
      .then(() => carregar(busca))
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Ministros</h1>
          <p className="subtitulo">{lista.length} registro(s)</p>
        </div>
        <button type="button" className="botao botao-primario" onClick={() => setForm({ ...VAZIO })}>
          + Novo ministro
        </button>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}

      <div className="barra-filtros">
        <input
          className="busca"
          placeholder="Buscar por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <section className="painel">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Sexo</th>
              <th>Estado civil</th>
              <th className="num">Escalas</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id} className={m.ativo ? '' : 'linha-inativa'}>
                <td>
                  <strong>{m.nome}</strong>
                  {m.email && <small className="bloco">{m.email}</small>}
                </td>
                <td>{m.telefone ?? '—'}</td>
                <td>{m.sexo ?? '—'}</td>
                <td>
                  {m.estadoCivil ?? '—'}
                  {m.conjugeNome && <small className="bloco">com {m.conjugeNome}</small>}
                </td>
                <td className="num">{m.totalEscalas}</td>
                <td>
                  <span className={`selo ${m.ativo ? 'selo-ok' : 'selo-off'}`}>
                    {m.ativo ? 'ativo' : 'inativo'}
                  </span>
                </td>
                <td className="acoes">
                  <button type="button" className="botao-mini" onClick={() => setForm(m)}>
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluir(m)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="vazio">
                  Nenhum ministro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {form && (
        <Modal
          titulo={form.id ? 'Editar ministro' : 'Novo ministro'}
          aoFechar={() => setForm(null)}
        >
          <form
            className="formulario"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvar();
            }}
          >
            <label>
              Nome *
              <input
                value={form.nome ?? ''}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                autoFocus
              />
            </label>

            <div className="linha-dupla">
              <label>
                Telefone
                <input
                  value={form.telefone ?? ''}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <div className="linha-dupla">
              <label>
                Sexo
                <select
                  value={form.sexo ?? ''}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                </select>
              </label>
              <label>
                Data de nascimento
                <input
                  type="date"
                  value={form.dataNascimento ?? ''}
                  onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                />
              </label>
            </div>

            <div className="linha-dupla">
              <label>
                Estado civil
                <select
                  value={form.estadoCivil ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estadoCivil: e.target.value,
                      // só casado(a) mantém cônjuge
                      conjugeId: e.target.value === 'Casado(a)' ? (form.conjugeId ?? null) : null,
                    })
                  }
                >
                  <option value="">—</option>
                  {ESTADOS_CIVIS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </label>
              {form.estadoCivil === 'Casado(a)' && (
                <label>
                  Casado(a) com
                  <select
                    value={form.conjugeId != null ? String(form.conjugeId) : ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        conjugeId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {disponiveisParaCasar.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <label>
              Observações
              <textarea
                rows={3}
                value={form.observacoes ?? ''}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={form.ativo !== false}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ministro ativo (pode receber escala)
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
