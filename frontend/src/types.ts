export interface Ministro {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  funcaoPreferida: string | null;
  ativo: boolean;
  observacoes: string | null;
  totalEscalas: number;
}

export interface Equipe {
  id: number;
  numero: number | null;
  nome: string;
  descricao: string | null;
  ativa: boolean;
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

export interface Resumo {
  ministrosAtivos: number;
  equipesAtivas: number;
  missasNoMes: number;
  escalasNoMes: number;
  escalaDoMesGerada: boolean;
  proximasMissas: Missa[];
  mesAtual: string;
}
