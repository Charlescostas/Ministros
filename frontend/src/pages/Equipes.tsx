import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Equipe, Ministro } from '../types';

interface FormEquipe {
  id?: number;
  nome: string;
  descricao: string;
  ativa: boolean;
  numero: string;
  ministroIds: number[];
}

export default function Equipes() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormEquipe | null>(null);
  const [filtroMembro, setFiltroMembro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    api<Equipe[]>('/equipes').then(setEquipes).catch((ex) => setErro(mensagemErro(ex)));
  }

  useEffect(() => {
    carregar();
    api<Ministro[]>('/ministros').then(setMinistros).catch(() => undefined);
  }, []);

  function salvar() {
    if (!form) return;
    setSalvando(true);
    const corpo = {
      nome: form.nome,
      descricao: form.descricao || null,
      ativa: form.ativa,
      numero: form.numero ? Number(form.numero) : null,
      ministroIds: form.ministroIds,
    };
    const requisicao = form.id
      ? api<Equipe>(`/equipes/${form.id}`, { method: 'PUT', body: corpo })
      : api<Equipe>('/equipes', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setForm(null);
        carregar();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  async function removerMembro(equipe: Equipe, ministro: Ministro) {
    try {
      await api(`/equipes/${equipe.id}/ministros/${ministro.id}`, { method: 'DELETE' });
      carregar();
    } catch (ex) {
      setErro(mensagemErro(ex));
    }
  }

  function excluir(equipe: Equipe) {
    if (!window.confirm(`Excluir a equipe ${equipe.nome}?`)) return;
    api<void>(`/equipes/${equipe.id}`, { method: 'DELETE' })
      .then(carregar)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  function alternarMembro(id: number) {
    if (!form) return;
    const selecionados = form.ministroIds.includes(id)
      ? form.ministroIds.filter((x) => x !== id)
      : [...form.ministroIds, id];
    setForm({ ...form, ministroIds: selecionados });
  }

  const ministrosFiltrados = ministros.filter((m) =>
    m.nome.toLowerCase().includes(filtroMembro.toLowerCase()),
  );

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Equipes</h1>
          <p className="subtitulo">{equipes.length} equipe(s) cadastrada(s)</p>
        </div>
        <button
          type="button"
          className="botao botao-primario"
          onClick={() => setForm({ nome: '', descricao: '', ativa: true, numero: '', ministroIds: [] })}
        >
          + Nova equipe
        </button>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}

      <div className="grade-equipes">
        {equipes.map((equipe) => (
          <article key={equipe.id} className={`cartao-equipe ${equipe.ativa ? '' : 'inativa'}`}>
            <div className="equipe-topo">
              <div>
                <h2>
                  {equipe.numero != null && <span className="numero-equipe">EQUIPE {equipe.numero} · </span>}
                  {equipe.nome}
                </h2>
                <p>{equipe.descricao || 'Sem descrição'}</p>
              </div>
              <span className={`selo ${equipe.ativa ? 'selo-ok' : 'selo-off'}`}>
                {equipe.ativa ? 'ativa' : 'inativa'}
              </span>
            </div>

            <div className="equipe-membros">
              {equipe.ministros.length === 0 && <span className="vazio">Nenhum membro</span>}
              {equipe.ministros.map((m) => (
                <span key={m.id} className={`chip ${m.ativo ? '' : 'chip-inativo'}`}>
                  {m.nome}
                  <button
                    type="button"
                    title="Remover da equipe"
                    onClick={() => removerMembro(equipe, m)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <footer className="equipe-rodape">
              <small>{equipe.quantidadeMinistros} membro(s)</small>
              <div className="acoes">
                <button
                  type="button"
                  className="botao-mini"
                  onClick={() =>
                    setForm({
                      id: equipe.id,
                      nome: equipe.nome,
                      descricao: equipe.descricao ?? '',
                      ativa: equipe.ativa,
                      numero: equipe.numero != null ? String(equipe.numero) : '',
                      ministroIds: equipe.ministros.map((m) => m.id),
                    })
                  }
                >
                  editar
                </button>
                <button type="button" className="botao-mini perigo" onClick={() => excluir(equipe)}>
                  excluir
                </button>
              </div>
            </footer>
          </article>
        ))}

        {equipes.length === 0 && <p className="vazio">Nenhuma equipe cadastrada.</p>}
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar equipe' : 'Nova equipe'} aoFechar={() => setForm(null)} largura="amplo">
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
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                autoFocus
              />
            </label>

            <div className="linha-dupla">
              <label>
                Descrição
                <input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex.: Celebração dos domingos pela manhã"
                />
              </label>
              <label>
                Número (escala impressa)
                <input
                  type="number"
                  min={1}
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  placeholder="Ex.: 4"
                />
              </label>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />
              Equipe ativa
            </label>

            <div className="seletor-membros">
              <div className="seletor-topo">
                <strong>Membros ({form.ministroIds.length})</strong>
                <input
                  className="busca"
                  placeholder="Filtrar ministros…"
                  value={filtroMembro}
                  onChange={(e) => setFiltroMembro(e.target.value)}
                />
              </div>
              <div className="lista-checks">
                {ministrosFiltrados.map((m) => (
                  <label key={m.id} className={`check ${m.ativo ? '' : 'check-destacado'}`}>
                    <input
                      type="checkbox"
                      checked={form.ministroIds.includes(m.id)}
                      onChange={() => alternarMembro(m.id)}
                    />
                    {m.nome}
                    {!m.ativo && <small>(inativo)</small>}
                  </label>
                ))}
                {ministrosFiltrados.length === 0 && <span className="vazio">Nenhum ministro.</span>}
              </div>
            </div>

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
