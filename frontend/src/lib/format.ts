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
