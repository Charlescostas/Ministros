import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, mensagemErro } from '../api/client';
import Modal from '../components/Modal';
import type { Funcao } from '../types';

interface FormFuncao {
  id?: number;
  nome: string;
  ordem: number;
  quantidade: number;
  ativa: boolean;
}

export default function Funcoes() {
  const [lista, setLista] = useState<Funcao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormFuncao | null>(null);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    api<Funcao[]>('/funcoes').then(setLista).catch((ex) => setErro(mensagemErro(ex)));
  }

  useEffect(carregar, []);

  function salvar() {
    if (!form) return;
    setSalvando(true);
    const corpo = {
      nome: form.nome,
      ordem: form.ordem,
      quantidade: form.quantidade,
      ativa: form.ativa,
    };
    const requisicao = form.id
      ? api<Funcao>(`/funcoes/${form.id}`, { method: 'PUT', body: corpo })
      : api<Funcao>('/funcoes', { method: 'POST', body: corpo });

    requisicao
      .then(() => {
        setForm(null);
        carregar();
      })
      .catch((ex) => setErro(ex instanceof ApiError ? ex.message : 'Erro ao salvar'))
      .finally(() => setSalvando(false));
  }

  function excluir(f: Funcao) {
    if (!window.confirm(`Excluir a função ${f.nome}?`)) return;
    api<void>(`/funcoes/${f.id}`, { method: 'DELETE' })
      .then(carregar)
      .catch((ex) => setErro(mensagemErro(ex)));
  }

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Funções da missa</h1>
          <p className="subtitulo">
            A quantidade define quantas pessoas são chamadas por missa
          </p>
        </div>
        <button
          type="button"
          className="botao botao-primario"
          onClick={() => setForm({ nome: '', ordem: lista.length + 1, quantidade: 1, ativa: true })}
        >
          + Nova função
        </button>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}

      <section className="painel">
        <table className="tabela">
          <thead>
            <tr>
              <th className="num">Ordem</th>
              <th>Função</th>
              <th className="num">Vagas por missa</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className={f.ativa ? '' : 'linha-inativa'}>
                <td className="num">{f.ordem}</td>
                <td>
                  <strong>{f.nome}</strong>
                </td>
                <td className="num">{f.quantidade}</td>
                <td>
                  <span className={`selo ${f.ativa ? 'selo-ok' : 'selo-off'}`}>
                    {f.ativa ? 'ativa' : 'inativa'}
                  </span>
                </td>
                <td className="acoes">
                  <button
                    type="button"
                    className="botao-mini"
                    onClick={() =>
                      setForm({
                        id: f.id,
                        nome: f.nome,
                        ordem: f.ordem,
                        quantidade: f.quantidade,
                        ativa: f.ativa,
                      })
                    }
                  >
                    editar
                  </button>
                  <button type="button" className="botao-mini perigo" onClick={() => excluir(f)}>
                    excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {form && (
        <Modal
          titulo={form.id ? 'Editar função' : 'Nova função'}
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
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Ministro da Comunhão"
                required
                autoFocus
              />
            </label>

            <div className="linha-dupla">
              <label>
                Ordem na escala
                <input
                  type="number"
                  min={1}
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                />
              </label>
              <label>
                Vagas por missa
                <input
                  type="number"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                />
              </label>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />
              Função ativa
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
