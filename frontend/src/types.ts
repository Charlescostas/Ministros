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

/** Doação recebida (oferta, dízimo, campanha, festa…). */
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
  linhas: GeracaoEquipesLinha[];
  resumo: GeracaoEquipesResumo[];
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
