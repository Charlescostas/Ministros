const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export function rotuloMes(yyyyMm: string): string {
  const [ano, mes] = yyyyMm.split('-').map(Number);
  return `${MESES[(mes || 1) - 1]} de ${ano}`;
}

/** "Outubro 2026" - usado no titulo do documento impresso. */
export function rotuloMesCurto(yyyyMm: string): string {
  const [ano, mes] = yyyyMm.split('-').map(Number);
  return `${MESES[(mes || 1) - 1]} ${ano}`;
}

export function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return `${DIAS[d.getDay()]}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

export function horaCurta(isoHora: string): string {
  return isoHora.slice(0, 5);
}

/** "05/10/2026" - data curta a partir de AAAA-MM-DD. */
export function dataCurta(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

/** Valor em reais: "R$ 1.234,56". */
export function moeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Só o número em reais: "1.234,56" — usado nas colunas estreitas da matriz anual. */
export function moedaSemSimbolo(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '0,00';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Siglas de Jan a Dez, na ordem dos meses. */
export const MESES_SIGLAS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

/** Colunas do dashboard, começando na segunda-feira (mesma ordem do documento impresso). */
export const DIAS_SEMANA_ORDENADOS = [
  'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo',
];

/** 0 = segunda-feira ... 6 = domingo. */
export function indiceDiaSemana(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return (new Date(ano, mes - 1, dia).getDay() + 6) % 7;
}

/** Primeiro (de) e último (ate) dia de um mês no formato AAAA-MM. */
export function limitesDoMes(yyyyMm: string): { de: string; ate: string } {
  const [ano, mes] = yyyyMm.split('-').map(Number);
  const ultimo = new Date(ano, mes, 0).getDate();
  return { de: `${yyyyMm}-01`, ate: `${yyyyMm}-${String(ultimo).padStart(2, '0')}` };
}

export function deslocarMes(yyyyMm: string, delta: number): string {
  const [ano, mes] = yyyyMm.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function opcoesDeMes(quantidade = 18): string[] {
  const atual = mesAtual();
  const inicio = deslocarMes(atual, -Math.floor(quantidade / 2));
  const lista: string[] = [];
  let cursor = inicio;
  for (let i = 0; i < quantidade; i++) {
    lista.push(cursor);
    cursor = deslocarMes(cursor, 1);
  }
  return lista;
}

export function opcoesDeData(): string[] {
  const hoje = new Date();
  const lista: string[] = [];
  for (let i = -30; i <= 180; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return lista;
}
