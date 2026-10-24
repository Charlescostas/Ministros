import { useEffect, useState, type FormEvent } from 'react';
import { api, mensagemErro } from '../api/client';
import type { Configuracao } from '../types';

const PADRAO: Configuracao = {
  nomeParoquia: '',
  tituloGrupo: '',
  textoObs: '',
  textoMissaMinistros: '',
  adendos: '',
  historicoDesde: null,
};

export default function Configuracoes() {
  const [form, setForm] = useState<Configuracao>(PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api<Configuracao>('/configuracao')
      .then((c) => setForm({ ...PADRAO, ...c }))
      .catch((ex) => setErro(mensagemErro(ex)))
      .finally(() => setCarregando(false));
  }, []);

  function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    api<Configuracao>('/configuracao', { method: 'PUT', body: form })
      .then((c) => {
        setForm({ ...PADRAO, ...c });
        setSalvo(true);
      })
      .catch((ex) => setErro(mensagemErro(ex)))
      .finally(() => setSalvando(false));
  }

  if (carregando) return <div className="carregando">Carregando configurações…</div>;

  return (
    <>
      <header className="pagina-topo">
        <div>
          <h1>Cabeçalho da escala</h1>
          <p className="subtitulo">Textos usados no documento impresso (modelo do PDF)</p>
        </div>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}
      {salvo && <div className="aviso sucesso">Configuração salva.</div>}

      <section className="painel">
        <form className="formulario" onSubmit={salvar}>
          <label>
            Nome da paróquia / comunidade
            <input
              value={form.nomeParoquia}
              onChange={(e) => setForm({ ...form, nomeParoquia: e.target.value })}
              placeholder="PARÓQUIA SANTA TERESINHA DO MENINO JESUS"
            />
          </label>

          <label>
            Título do grupo
            <input
              value={form.tituloGrupo}
              onChange={(e) => setForm({ ...form, tituloGrupo: e.target.value })}
              placeholder="MINISTROS EXTRAORDINÁRIOS DA SAGRADA COMUNHÃO EUCARÍSTICA"
            />
          </label>

          <label>
            Texto “Obs”
            <textarea
              rows={3}
              value={form.textoObs}
              onChange={(e) => setForm({ ...form, textoObs: e.target.value })}
              placeholder="Obs: No dia escalado, favor chegar com a máxima antecedência…"
            />
          </label>

          <label>
            Caixa “Missa dos Ministros”
            <textarea
              rows={4}
              value={form.textoMissaMinistros}
              onChange={(e) => setForm({ ...form, textoMissaMinistros: e.target.value })}
              placeholder={'Dia 01 de Outubro 1ª quinta-feira do mês, missa dos Ministros as 19:30 hrs.\nAs intenções, comentário e leitura serão a cargo da EQUIPE 4…'}
            />
          </label>

          <label>
            Adendos (bloco ao lado da tabela)
            <textarea
              rows={6}
              value={form.adendos}
              onChange={(e) => setForm({ ...form, adendos: e.target.value })}
              placeholder={'SEXTA-FEIRA - Missa da Saúde\n2   Evelina-Arlete\n9   Mari-Dorza\n16  Sonia-Evelina'}
            />
            <small className="dica">
              Use quebras de linha; o texto é exatamente como escrito (mesma fonte).
            </small>
          </label>

          <h3>Geração da escala</h3>

          <label>
            Considerar o histórico da escala a partir de
            <input
              type="month"
              value={form.historicoDesde ?? ''}
              onChange={(e) => setForm({ ...form, historicoDesde: e.target.value || null })}
            />
            <small className="dica">
              Ao gerar a escala, cada equipe é equilibrada pelos <strong>horários que já
              cumpriu</strong> (gravados no histórico a cada geração): quem já faz quinta 19:30 e
              domingo 8h não acumula esses horários em cima de quem os faz menos. Escolha o mês
              a partir do qual essa regra vale — os meses antes dele são gerados só com o
              equilíbrio do próprio mês. <strong>Em branco = usar desde já.</strong>
            </small>
          </label>

          <div className="formulario-acoes">
            <button type="submit" className="botao botao-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
