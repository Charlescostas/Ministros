import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensagemErro } from '../api/client';
import type { Configuracao, Equipe, Missa } from '../types';
import { deslocarMes, mesAtual, opcoesDeMes, rotuloMes, rotuloMesCurto } from '../lib/format';

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

export default function Impressao() {
  const [mes, setMes] = useState(mesAtual());
  const [missas, setMissas] = useState<Missa[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  const rotuloEquipeLista = (equipe: Equipe): string =>
    equipe.numero != null ? `EQUIPE ${equipe.numero}` : equipe.nome;

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
        </div>

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
              {missas.map((missa) => (
                <tr key={missa.id} className={missa.destaque ? 'doc-destaque' : undefined}>
                  <td className="centro">{diaDoMes(missa.data)}</td>
                  <td>{diaSemana(missa.data)}</td>
                  <td className="centro">{missa.hora.slice(0, 5)}</td>
                  <td className="centro">{rotuloEquipe(missa.equipeId, missa.equipeNome)}</td>
                  <td>{missa.observacoes ?? ''}</td>
                </tr>
              ))}
              {missas.length === 0 && (
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
            {equipesOrganizadas.map((equipe) => (
              <tr key={equipe.id}>
                <th>..::  Equipe {rotuloEquipeLista(equipe)}  ::..</th>
                <td>{equipe.ministros.map((m) => m.nome).join('-') || 'Sem membros cadastrados'}</td>
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
    </>
  );
}
