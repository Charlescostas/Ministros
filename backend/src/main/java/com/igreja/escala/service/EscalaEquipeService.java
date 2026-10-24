package com.igreja.escala.service;

import com.igreja.escala.dto.EscalaEquipeDtos;
import com.igreja.escala.dto.EscalaHistoricoDtos;
import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.Missa;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EquipeRepository;
import com.igreja.escala.repository.MissaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gera a escala de EQUIPES do mes: atribui uma equipe para cada missa
 * distribuindo o servico de forma justa.
 *
 * Critérios de escolha da equipe (nesta ordem, para cada missa):
 * 1. menor total de missas <b>no mes atual</b> — assim as equipes ficam com
 *    quantidades parecidas (a diferenca entre a que mais e a que menos atua
 *    no mes nunca passa de 1);
 * 2. menor total de missas <b>nesse mesmo dia e horario</b> (mes + historico
 *    gravado) — a regra principal contra aculo: quem ja costuma fazer quinta
 *    19:30 e domingo 8h so volta a esses horarios quando as demais equipes
 *    tiverem feito o mesmo tanto;
 * 3. menor quantidade <b>nesse mesmo dia da semana</b> (mes + historico);
 * 4. menor total geral (mes + historico).
 * 5. empate: menor numero da equipe (depois, ordem alfabetica).
 *
 * O historico vem dos REGISTROS gravados a cada geracao (ver
 * EscalaHistoricoService), e nao das missas vivas, entao a contagem nao muda
 * se as equipes ou as missas forem alteradas depois. A configuracao
 * "historicoDesde" permite adiar essa regra para um mes escolhido.
 *
 * Ao final, se alguma equipe tiver ficado com o <b>mesmo horario duas vezes no
 * mes</b> (o equilibrio de totais pode forcar), as missas sao trocadas entre
 * equipes: as quantidades por equipe nao mudam, so muda quem faz cada missa.
 */
@Service
public class EscalaEquipeService {

    /** Indices = DayOfWeek do Java (1 = segunda ... 7 = domingo). */
    private static final String[] DIAS = {
            null, "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA",
            "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO", "DOMINGO"};

    private final MissaRepository missas;
    private final EquipeRepository equipes;
    private final EscalaHistoricoService historico;
    private final ConfiguracaoService configuracoes;

    public EscalaEquipeService(MissaRepository missas, EquipeRepository equipes,
                               EscalaHistoricoService historico, ConfiguracaoService configuracoes) {
        this.missas = missas;
        this.equipes = equipes;
        this.historico = historico;
        this.configuracoes = configuracoes;
    }

    @Transactional
    public EscalaEquipeDtos.Resposta gerar(EscalaEquipeDtos.GerarRequest req) {
        String mes = validarMes(req.mes());
        boolean substituir = Boolean.TRUE.equals(req.substituir());

        YearMonth periodo = YearMonth.parse(mes);
        LocalDate inicio = periodo.atDay(1);
        LocalDate fim = periodo.atEndOfMonth();

        List<Equipe> candidatas = carregarCandidatas();
        if (candidatas.isEmpty()) {
            throw ApiException.regra("Nenhuma equipe ativa cadastrada. Cadastre as equipes antes.");
        }

        List<Missa> missasDoMes = missas.findByDataBetweenOrderByDataAscHoraAsc(inicio, fim);
        if (missasDoMes.isEmpty()) {
            throw ApiException.regra("Nenhuma missa cadastrada em " + mes
                    + ". Cadastre as missas antes de gerar a escala de equipes.");
        }

        boolean todasComEquipe = missasDoMes.stream().allMatch(m -> m.getEquipe() != null);
        if (todasComEquipe && !substituir) {
            throw ApiException.conflito("Todas as missas de " + mes + " ja possuem equipe. "
                    + "Marque 'Substituir equipes ja cadastradas' para gerar novamente.");
        }

        // 1) historico: todos os servicos ANTES do mes alvo, por dia da semana e por
        //    horario. A contagem vem do HISTORICO GRAVADO (o registro mais recente de
        //    cada mes), entao nao muda mesmo que equipes ou missas sejam alteradas
        //    depois: a equipe que ja costuma fazer quinta 19:30 e domingo 8h nao
        //    acumula esses horarios em cima de quem os faz menos. A configuracao
        //    "historicoDesde" permite comecar a valer a partir de um mes escolhido.
        boolean considerarHistorico = considerarHistorico(mes);
        Map<Long, int[]> historicoPorDia = new HashMap<>();
        Map<Long, Map<String, Integer>> historicoPorSlot = new HashMap<>();
        Map<Long, Integer> historicoTotal = new HashMap<>();
        if (considerarHistorico) {
            for (EscalaHistoricoDtos.Atribuicao a : historico.atribuicoesAnteriores(mes)) {
                Long id = a.equipeId();
                int dow = a.data().getDayOfWeek().getValue();
                historicoPorDia.computeIfAbsent(id, k -> new int[8])[dow]++;
                historicoPorSlot.computeIfAbsent(id, k -> new HashMap<>())
                        .merge(dow + "|" + a.hora(), 1, Integer::sum);
                historicoTotal.merge(id, 1, Integer::sum);
            }
        }

        // 2) mes atual: mantem o que ja existe (ou limpa tudo, se for substituir)
        Map<Long, int[]> mesPorDia = new HashMap<>();
        Map<Long, Map<String, Integer>> mesPorSlot = new HashMap<>();
        Map<Long, Integer> mesTotal = new HashMap<>();
        Set<Long> mantidas = new LinkedHashSet<>();
        for (Missa m : missasDoMes) {
            if (m.getEquipe() == null) continue;
            if (substituir) {
                m.setEquipe(null);
            } else {
                contar(mesPorSlot, mesPorDia, mesTotal, m);
                mantidas.add(m.getId());
            }
        }

        // 3) escolha, missa a missa, na ordem do calendario
        int atribuidas = 0;
        Set<Long> geradas = new LinkedHashSet<>();
        for (Missa m : missasDoMes) {
            if (m.getEquipe() != null) continue;
            int dow = diaDaSemana(m.getData());
            Equipe escolhida = escolher(candidatas, dow, chaveSlot(m),
                    historicoPorDia, historicoPorSlot, mesPorDia, mesPorSlot,
                    mesTotal, historicoTotal);
            m.setEquipe(escolhida);
            missas.save(m);
            contar(mesPorSlot, mesPorDia, mesTotal, m);
            geradas.add(m.getId());
            atribuidas++;
        }

        // 4) o equilibrio de totais pode deixar alguem com 2 missas NO MESMO
        //    horario no mes: troca as missas entre equipes nesse caso (as
        //    quantidades nao mudam, so muda quem faz cada missa — e o horario
        //    acaba indo para a equipe que menos fez aquele horario)
        corrigirRepeticoes(missasDoMes, historicoPorSlot, geradas);

        // 5) refaz os contadores do mes (os totais nao mudam, mas a troca muda
        //    a distribuicao por dia da semana)
        mesPorDia.clear();
        mesPorSlot.clear();
        mesTotal.clear();
        for (Missa m : missasDoMes) contar(mesPorSlot, mesPorDia, mesTotal, m);

        // 6) relatorio (busca todas as equipes envolvidas em uma unica consulta)
        Set<Long> equipeIds = new LinkedHashSet<>();
        for (Missa m : missasDoMes) equipeIds.add(m.getEquipe().getId());
        candidatas.forEach(e -> equipeIds.add(e.getId()));
        Map<Long, Equipe> porId = new HashMap<>();
        equipes.findAllById(equipeIds).forEach(e -> porId.put(e.getId(), e));

        List<EscalaEquipeDtos.Linha> linhas = new ArrayList<>();
        for (Missa m : missasDoMes) {
            Long equipeId = m.getEquipe().getId();
            Equipe eq = porId.get(equipeId);
            int dow = diaDaSemana(m.getData());
            linhas.add(new EscalaEquipeDtos.Linha(
                    m.getId(), m.getData(), DIAS[dow], m.getHora(), m.getTitulo(),
                    equipeId, eq.getNome(), eq.getNumero(),
                    mantidas.contains(m.getId()),
                    conta(historicoPorDia, equipeId, dow),
                    conta(mesPorDia, equipeId, dow),
                    mesTotal.getOrDefault(equipeId, 0)));
        }

        // 7) fotografia do momento: membros de cada equipe e missas do mes, para
        //    o historico consultar mesmo que equipes/missas mudem depois
        Set<Long> usadas = new LinkedHashSet<>();
        for (Missa m : missasDoMes) usadas.add(m.getEquipe().getId());
        List<Equipe> equipesDaEscala = new ArrayList<>();
        for (Long id : usadas) {
            Equipe e = porId.get(id);
            if (e != null) equipesDaEscala.add(e);
        }
        Long historicoId = historico.registrar(mes, missasDoMes, equipesDaEscala);

        return new EscalaEquipeDtos.Resposta(
                mes, substituir, missasDoMes.size(), mantidas.size(), atribuidas, historicoId,
                considerarHistorico, linhas,
                montarResumo(porId, mesTotal, mesPorDia, historicoTotal, historicoPorDia));
    }

    /**
     * O equilibrio por historico pode ser adiado: a configuracao
     * "historicoDesde" diz a partir de qual mes ele passa a valer (vazio =
     * valer sempre). Meses antes desse valor sao gerados so com o equilibrio
     * do proprio mes.
     */
    private boolean considerarHistorico(String mes) {
        String desde = configuracoes.obter().historicoDesde();
        return desde == null || mes.compareTo(desde) >= 0;
    }

    /** Equipes ativas (com membros, quando houver), ordenadas por numero e nome. */
    private List<Equipe> carregarCandidatas() {
        List<Equipe> ativas = equipes.findByAtivaTrueOrderByNomeAsc();
        if (ativas.isEmpty()) return ativas;

        List<Equipe> comMembros = ativas.stream().filter(e -> !e.getMinistros().isEmpty()).toList();
        List<Equipe> base = comMembros.isEmpty() ? ativas : comMembros;

        List<Equipe> ordenadas = new ArrayList<>(base);
        ordenar(ordenadas);
        return ordenadas;
    }

    private void ordenar(List<Equipe> lista) {
        lista.sort(Comparator
                .comparing((Equipe e) -> e.getNumero() == null ? Integer.MAX_VALUE : e.getNumero())
                .thenComparing(Equipe::getNome));
    }

    private Equipe escolher(List<Equipe> candidatas, int dow, String slot,
                            Map<Long, int[]> historicoPorDia, Map<Long, Map<String, Integer>> historicoPorSlot,
                            Map<Long, int[]> mesPorDia, Map<Long, Map<String, Integer>> mesPorSlot,
                            Map<Long, Integer> mesTotal, Map<Long, Integer> historicoTotal) {
        Equipe melhor = null;
        int[] melhorChave = null;

        for (Equipe e : candidatas) {
            Long id = e.getId();
            int[] chave = {
                    // 1. total no mes — quantidades parecidas no mes (diferenca <= 1)
                    mesTotal.getOrDefault(id, 0),
                    // 2. horario (dia + hora): total no mes + no historico. E a regra
                    //    principal contra aculo: se a equipe 4 ja fez quinta 19:30 e
                    //    domingo 8h nos meses anteriores, ela so volta a esses horarios
                    //    quando todas as outras ja tiverem feito o mesmo tanto.
                    contaSlot(mesPorSlot, id, slot) + contaSlot(historicoPorSlot, id, slot),
                    // 3. dia da semana: total no mes + no historico
                    conta(mesPorDia, id, dow) + conta(historicoPorDia, id, dow),
                    // 4. total geral (mes + historico) — desempate final
                    mesTotal.getOrDefault(id, 0) + historicoTotal.getOrDefault(id, 0)
            };
            if (melhor == null || comparar(chave, melhorChave) < 0) {
                melhor = e;
                melhorChave = chave;
            }
        }
        return melhor;
    }

    private int comparar(int[] a, int[] b) {
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i]) return Integer.compare(a[i], b[i]);
        }
        return 0;
    }

    private void contar(Map<Long, Map<String, Integer>> porSlot, Map<Long, int[]> porDia,
                        Map<Long, Integer> total, Missa m) {
        Long id = m.getEquipe().getId();
        porDia.computeIfAbsent(id, k -> new int[8])[diaDaSemana(m.getData())]++;
        total.merge(id, 1, Integer::sum);
        porSlot.computeIfAbsent(id, k -> new HashMap<>()).merge(chaveSlot(m), 1, Integer::sum);
    }

    /** "Horario" da missa no calendario: dia da semana + hora (ex.: todo domingo as 8h). */
    private String chaveSlot(Missa m) {
        return diaDaSemana(m.getData()) + "|" + m.getHora();
    }

    private int conta(Map<Long, int[]> porDia, Long equipeId, int dow) {
        int[] vetor = porDia.get(equipeId);
        return vetor == null ? 0 : vetor[dow];
    }

    private int contaSlot(Map<Long, Map<String, Integer>> porSlot, Long equipeId, String slot) {
        Map<String, Integer> mapa = porSlot.get(equipeId);
        return mapa == null ? 0 : mapa.getOrDefault(slot, 0);
    }

    /**
     * Troca missas entre equipes quando uma delas ficou com o <b>mesmo horario
     * duas vezes no mes</b> (o equilibrio de totais pode forcar isso). As
     * quantidades de cada equipe nao mudam — so muda quem faz cada missa.
     * Escolhe a troca que: (a) nao cria repeticao nova para nenhuma das duas
     * equipes, (b) dá o horario para a equipe que menos fez aquele horario no
     * historico e (c) dá a missa da troca para a equipe que menos fez o horario
     * dela. So mexe em missas geradas nesta execucao (as mantidas do usuario
     * ficam como estao).
     */
    private void corrigirRepeticoes(List<Missa> missasDoMes,
                                    Map<Long, Map<String, Integer>> historicoPorSlot,
                                    Set<Long> geradas) {
        boolean trocou = true;
        while (trocou) {
            trocou = false;

            // missas do mes agrupadas por equipe, na ordem do calendario
            Map<Long, List<Missa>> porEquipe = new LinkedHashMap<>();
            for (Missa m : missasDoMes) {
                if (m.getEquipe() != null) {
                    porEquipe.computeIfAbsent(m.getEquipe().getId(), k -> new ArrayList<>()).add(m);
                }
            }

            Missa melhorLargar = null;
            Missa melhorReceber = null;
            int melhorP1 = Integer.MAX_VALUE;
            int melhorP2 = Integer.MAX_VALUE;

            for (Map.Entry<Long, List<Missa>> ent : porEquipe.entrySet()) {
                Long xId = ent.getKey();
                List<Missa> daX = ent.getValue();

                for (Missa largar : daX) {
                    if (!geradas.contains(largar.getId())) continue;
                    String slot = chaveSlot(largar);
                    // so vale a pena se esse horario esta repetido no mes
                    if (daX.stream().filter(m -> chaveSlot(m).equals(slot)).count() < 2) continue;

                    for (Map.Entry<Long, List<Missa>> outro : porEquipe.entrySet()) {
                        Long yId = outro.getKey();
                        if (yId.equals(xId)) continue;
                        List<Missa> daY = outro.getValue();
                        // a outra equipe nao pode fazer esse horario no mes
                        if (daY.stream().anyMatch(m -> chaveSlot(m).equals(slot))) continue;

                        for (Missa receber : daY) {
                            if (!geradas.contains(receber.getId())) continue;
                            String slot2 = chaveSlot(receber);
                            // a equipe X nao pode repetir o horario da troca
                            if (daX.stream().anyMatch(m -> chaveSlot(m).equals(slot2))) continue;

                            int p1 = historicoPorSlot.getOrDefault(yId, Map.of()).getOrDefault(slot, 0);
                            int p2 = historicoPorSlot.getOrDefault(xId, Map.of()).getOrDefault(slot2, 0);
                            if (p1 < melhorP1 || (p1 == melhorP1 && p2 < melhorP2)) {
                                melhorLargar = largar;
                                melhorReceber = receber;
                                melhorP1 = p1;
                                melhorP2 = p2;
                            }
                        }
                    }
                }
            }

            if (melhorLargar != null) {
                Equipe daVezX = melhorLargar.getEquipe();
                Equipe daVezY = melhorReceber.getEquipe();
                melhorLargar.setEquipe(daVezY);
                melhorReceber.setEquipe(daVezX);
                missas.save(melhorLargar);
                missas.save(melhorReceber);
                trocou = true;
            }
        }
    }

    private List<EscalaEquipeDtos.ResumoEquipe> montarResumo(
            Map<Long, Equipe> porId, Map<Long, Integer> mesTotal, Map<Long, int[]> mesPorDia,
            Map<Long, Integer> historicoTotal, Map<Long, int[]> historicoPorDia) {

        List<Equipe> lista = new ArrayList<>(porId.values());
        ordenar(lista);

        List<EscalaEquipeDtos.ResumoEquipe> resumo = new ArrayList<>();
        for (Equipe e : lista) {
            resumo.add(new EscalaEquipeDtos.ResumoEquipe(
                    e.getId(), e.getNome(), e.getNumero(),
                    mesTotal.getOrDefault(e.getId(), 0),
                    historicoTotal.getOrDefault(e.getId(), 0),
                    porDiaSemana(historicoPorDia.get(e.getId())),
                    porDiaSemana(mesPorDia.get(e.getId()))));
        }
        return resumo;
    }

    private Map<String, Integer> porDiaSemana(int[] vetor) {
        Map<String, Integer> mapa = new java.util.LinkedHashMap<>();
        if (vetor == null) return mapa;
        for (int i = 1; i <= 7; i++) {
            if (vetor[i] > 0) mapa.put(DIAS[i], vetor[i]);
        }
        return mapa;
    }

    private int diaDaSemana(LocalDate data) {
        return data.getDayOfWeek().getValue();
    }

    private String validarMes(String mes) {
        if (mes == null || !mes.matches("\\d{4}-(0[1-9]|1[0-2])")) {
            throw ApiException.regra("Mes invalido. Use o formato AAAA-MM (ex.: 2026-10)");
        }
        return mes;
    }
}
