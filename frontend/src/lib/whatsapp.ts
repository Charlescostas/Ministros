import type { EscalaItem } from '../types';
import { DIAS_SIGLAS, dataCurta, horaCurta, indiceDiaSemana, rotuloMes } from './format';

/** Cabeçalho dos documentos impressos (paróquia + grupo), usado no topo da mensagem. */
export interface CabecalhoMensagem {
  nomeParoquia?: string | null;
  tituloGrupo?: string | null;
}

/**
 * Emojis por função da escala, casados pelo nome da função
 * (sem regra correspondente usa "•").
 */
const REGRAS_EMOJI: Array<[RegExp, string]> = [
  [/leitor|proclamador/, '📖'],
  [/eucaristi|comunh/, '🍞'],
  [/comentar/, '💬'],
  [/coordena|mestre|cerim/i, '🎤'],
  [/ac[oó]lit/, '🛐'],
  [/canto|salmo|m[uú]sic|louvor/, '🎶'],
  [/coleta|ofert[oó]rio/, '🙏'],
  [/altar|ence[ñn]eiro|c[âa]ndeo|cro[ôo]fero/, '🕯️'],
  [/cruz|processional|entrada|acolhida/, '⛪'],
];

/** Emoji da função ("Leitor" → 📖). */
export function emojiFuncao(nome: string | null | undefined): string {
  const texto = (nome ?? '').toLowerCase();
  return REGRAS_EMOJI.find(([regra]) => regra.test(texto))?.[1] ?? '•';
}

/** "DOM, 04/10 às 19h" - dia da semana, data curta e horário da missa. */
function quando(data: string, hora: string): string {
  const diaSemana = DIAS_SIGLAS[indiceDiaSemana(data)] ?? '';
  const diaDoMes = dataCurta(data).slice(0, 5);
  const horaCurtaTexto = horaCurta(hora);
  const horaFinal = horaCurtaTexto.endsWith(':00')
    ? `${horaCurtaTexto.slice(0, 2)}h`
    : horaCurtaTexto;
  return `${diaSemana}, ${diaDoMes} às ${horaFinal}`;
}

interface MissaAgrupada {
  data: string;
  hora: string;
  titulo: string;
  local: string | null;
  itens: EscalaItem[];
}

/** Agrupa os serviços por missa, em ordem cronológica. */
function agruparPorMissa(itens: EscalaItem[]): MissaAgrupada[] {
  const missas: MissaAgrupada[] = [];
  const posicao = new Map<number, number>();

  [...itens]
    .sort((a, b) => (a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data)))
    .forEach((item) => {
      const existente = posicao.get(item.missaId);
      if (existente !== undefined) {
        missas[existente].itens.push(item);
        return;
      }
      posicao.set(item.missaId, missas.length);
      missas.push({
        data: item.data,
        hora: item.hora,
        titulo: item.tituloMissa,
        local: item.local,
        itens: [item],
      });
    });

  return missas;
}

/** "*DOM, 04/10 às 19h* — Missa da Saúde (Salão)". */
function tituloDaMissa(missa: MissaAgrupada): string {
  const local = missa.local ? ` (${missa.local})` : '';
  return `*${quando(missa.data, missa.hora)}* — ${missa.titulo}${local}`;
}

/** "Leitor: João Silva (2ª vaga)". */
function rotuloServico(item: EscalaItem): string {
  const vaga = item.sequencia > 1 ? ` (${item.sequencia}ª vaga)` : '';
  return `${item.funcaoNome}: ${item.ministroNome}${vaga}`;
}

function cabecalho(config?: CabecalhoMensagem | null): string {
  const partes = [config?.nomeParoquia?.trim(), config?.tituloGrupo?.trim()].filter(Boolean);
  return partes.join(' — ');
}

/**
 * Resumo da escala do mês (todas as missas) — para enviar a um contato ou grupo.
 * Formato pensado no WhatsApp: negrito com *asteriscos* e uma missa por bloco.
 */
export function textoEscalaDoMes(
  mes: string,
  itens: EscalaItem[],
  config?: CabecalhoMensagem | null,
): string {
  const linhas = [`⛪ *Escala de ${rotuloMes(mes)}*`];
  const cabecalhoTexto = cabecalho(config);
  if (cabecalhoTexto) linhas.push(cabecalhoTexto);

  if (itens.length === 0) {
    linhas.push('', 'Nenhuma escala gerada para este mês.');
    return linhas.join('\n');
  }

  const missas = agruparPorMissa(itens);
  missas.forEach((missa) => {
    linhas.push('', tituloDaMissa(missa));
    missa.itens.forEach((item) => linhas.push(`${emojiFuncao(item.funcaoNome)} ${rotuloServico(item)}`));
  });

  linhas.push('', `Total: ${itens.length} serviço(s) em ${missas.length} missa(s).`);
  return linhas.join('\n');
}

/**
 * Escala individual de um ministro (só os serviços dele) — enviada ao telefone
 * cadastrado. `itens` deve conter apenas os serviços dessa pessoa.
 */
export function textoEscalaDoMinistro(mes: string, nome: string, itens: EscalaItem[]): string {
  const primeiroNome = (nome ?? '').trim().split(/\s+/)[0] ?? nome;
  const linhas = [`⛪ *Olá, ${primeiroNome}!*`, `Esta é a sua escala de *${rotuloMes(mes)}*:`];

  if (itens.length === 0) {
    linhas.push('', 'Você não está escalado(a) neste mês.');
    return linhas.join('\n');
  }

  const missas = agruparPorMissa(itens);
  missas.forEach((missa) => {
    linhas.push('', tituloDaMissa(missa));
    missa.itens.forEach((item) => {
      const vaga = item.sequencia > 1 ? ` (${item.sequencia}ª vaga)` : '';
      linhas.push(`${emojiFuncao(item.funcaoNome)} ${item.funcaoNome}${vaga}`);
    });
  });

  linhas.push('', `Total no mês: ${itens.length} serviço(s).`);
  return linhas.join('\n');
}

/**
 * Link do WhatsApp com a mensagem pronta. Com telefone (e DDD) vai direto para
 * o conversa da pessoa; sem telefone válido, abre o WhatsApp para escolher o contato.
 */
export function linkWhatsapp(telefone: string | null | undefined, texto: string): string {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  const numero =
    digitos.length >= 10
      ? digitos.startsWith('55') && digitos.length >= 12
        ? digitos
        : `55${digitos}`
      : '';
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Abre o WhatsApp em nova aba com a mensagem já escrita. */
export function abrirWhatsapp(telefone: string | null | undefined, texto: string): void {
  window.open(linkWhatsapp(telefone, texto), '_blank', 'noopener,noreferrer');
}
