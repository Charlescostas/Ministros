export interface Ministro {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  /** Campo legado: não é mais editado na tela (mantido no banco/critério de desempate). */
  funcaoPreferida: string | null;
  sexo: string | null;
  /** Data de nascimento em ISO (AAAA-MM-DD). */
  dataNascimento: string | null;
  /** Estado civil: "Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável". */
  estadoCivil: string | null;
  /** Ministro(a) com quem é casado(a) (auto-relacionamento). */
  conjugeId: number | null;
  conjugeNome: string | null;
  ativo: boolean;
  observacoes: string | null;
  totalEscalas: number;
}

/** Mensalidade recebida de um ministro. */
export interface Mensalidade {
  id: number;
  ministroId: number;
  ministroNome: string;
  competencia: string;
  valor: number;
  dataRecebimento: string;
  formaPagamento: string | null;
  observacao: string | null;
}

/** Despesa realizada pela comunhão. */
export interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  observacao: string | null;
}

/** Outras entradas (oferta, dízimo, campanha, festa…). */
export interface Doacao {
  id: number;
  data: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  observacao: string | null;
}

export interface Equipe {
  id: number;
  numero: number | null;
  nome: string;
  descricao: string | null;
  ativa: boolean;
  coordenadorId: number | null;
  coordenadorNome: string | null;
  quantidadeMinistros: number;
  ministros: Ministro[];
}

export interface Missa {
  id: number;
  data: string;
  hora: string;
  titulo: string;
  celebrante: string | null;
  local: string | null;
  equipeId: number | null;
  equipeNome: string | null;
  observacoes: string | null;
  escalada: boolean;
  destaque: boolean;
}

export interface Configuracao {
  nomeParoquia: string;
  tituloGrupo: string;
  textoObs: string;
  textoMissaMinistros: string;
  adendos: string;
  /** Mês (AAAA-MM) a partir do qual a geração equilibra os horários pelo histórico. Vazio = sempre. */
  historicoDesde: string | null;
}

export interface Funcao {
  id: number;
  nome: string;
  ordem: number;
  quantidade: number;
  ativa: boolean;
}

export interface EscalaItem {
  id: number;
  mes: string;
  missaId: number;
  data: string;
  hora: string;
  tituloMissa: string;
  local: string | null;
  equipeId: number;
  equipeNome: string;
  ministroId: number;
  ministroNome: string;
  telefoneMinistro: string | null;
  funcaoId: number;
  funcaoNome: string;
  sequencia: number;
  observacao: string | null;
}

export interface GeracaoEquipesLinha {
  missaId: number;
  data: string;
  diaSemana: string;
  hora: string;
  titulo: string;
  equipeId: number;
  equipeNome: string;
  equipeNumero: number | null;
  jaEstava: boolean;
  historicoDiaSemana: number;
  noMesDiaSemana: number;
  noMesTotal: number;
}

export interface GeracaoEquipesResumo {
  equipeId: number;
  nome: string;
  numero: number | null;
  noMes: number;
  historicoTotal: number;
  historicoPorDiaSemana: Record<string, number>;
  noMesPorDiaSemana: Record<string, number>;
}

export interface GeracaoEquipes {
  mes: string;
  substituir: boolean;
  totalMissas: number;
  mantidas: number;
  atribuidas: number;
  /** Registro do histórico gravado nesta geração (membros e missas por dia). */
  historicoId: number | null;
  /** Se o equilíbrio por histórico (horários de meses anteriores) valeu nesta geração. */
  historicoConsiderado: boolean;
  linhas: GeracaoEquipesLinha[];
  resumo: GeracaoEquipesResumo[];
}

/** Fotografia da escala no momento em que foi gerada (lista). */
export interface HistoricoResumo {
  id: number;
  mes: string;
  criadoEm: string;
  totalMissas: number;
  totalEquipes: number;
  totalMembros: number;
}

/** Membro de uma equipe no momento da geração. */
export interface HistoricoMembro {
  ministroId: number;
  nome: string;
  telefone: string | null;
  sexo: string | null;
  coordenador: boolean;
}

/** Equipe e seus membros no momento da geração. */
export interface HistoricoEquipe {
  equipeId: number;
  nome: string;
  numero: number | null;
  membros: HistoricoMembro[];
}

/** Uma missa do mês e a equipe que a cobria no momento da geração. */
export interface HistoricoMissa {
  missaId: number;
  data: string;
  hora: string;
  titulo: string;
  observacoes: string | null;
  destaque: boolean;
  equipeId: number | null;
  equipeNome: string | null;
  equipeNumero: number | null;
}

/** Quantidade de missas de um dia da semana, com os horários do mês. */
export interface HistoricoDiaSemana {
  diaSemana: string;
  quantidade: number;
  horarios: string[];
}

/** Fotografia completa de uma geração da escala. */
export interface HistoricoDetalhe {
  id: number;
  mes: string;
  criadoEm: string;
  totalMissas: number;
  missasPorDiaSemana: HistoricoDiaSemana[];
  missas: HistoricoMissa[];
  equipes: HistoricoEquipe[];
}

export interface Resumo {
  ministrosAtivos: number;
  equipesAtivas: number;
  missasNoMes: number;
  escalasNoMes: number;
  escalaDoMesGerada: boolean;
  proximasMissas: Missa[];
  mesAtual: string;
}
