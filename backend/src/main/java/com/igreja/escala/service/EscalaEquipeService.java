package com.igreja.escala.service;

import com.igreja.escala.dto.EscalaEquipeDtos;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gera a escala de EQUIPES do mes: atribui uma equipe para cada missa
 * distribuindo o servico de forma justa.
 *
 * Critérios de escolha da equipe (nesta ordem, para cada missa):
 * 1. menor quantidade de atuacoes <b>nesse mesmo dia da semana</b>
 *    (segunda, terca, ...) nos <b>meses anteriores</b>;
 * 2. menor quantidade de atuacoes nesse dia da semana <b>no mes atual</b>;
 * 3. menor total de missas recebidas <b>no mes atual</b>;
 * 4. menor historico geral;
 * 5. empate: menor numero da equipe (depois, ordem alfabetica).
 */
@Service
public class EscalaEquipeService {

    /** Indices = DayOfWeek do Java (1 = segunda ... 7 = domingo). */
    private static final String[] DIAS = {
            null, "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA",
            "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO", "DOMINGO"};

    private final MissaRepository missas;
    private final EquipeRepository equipes;

    public EscalaEquipeService(MissaRepository missas, EquipeRepository equipes) {
        this.missas = missas;
        this.equipes = equipes;
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

        // 1) historico: todos os servicos ANTES do mes alvo, por dia da semana
        Map<Long, int[]> historicoPorDia = new HashMap<>();
        Map<Long, Integer> historicoTotal = new HashMap<>();
        for (Missa m : missas.buscarComEquipeAntesDe(inicio)) {
            Long id = m.getEquipe().getId();
            historicoPorDia.computeIfAbsent(id, k -> new int[8])[diaDaSemana(m.getData())]++;
            historicoTotal.merge(id, 1, Integer::sum);
        }

        // 2) mes atual: mantem o que ja existe (ou limpa tudo, se for substituir)
        Map<Long, int[]> mesPorDia = new HashMap<>();
        Map<Long, Integer> mesTotal = new HashMap<>();
        Set<Long> mantidas = new LinkedHashSet<>();
        for (Missa m : missasDoMes) {
            if (m.getEquipe() == null) continue;
            if (substituir) {
                m.setEquipe(null);
            } else {
                contar(mesPorDia, mesTotal, m);
                mantidas.add(m.getId());
            }
        }

        // 3) escolha, missa a missa, na ordem do calendario
        int atribuidas = 0;
        for (Missa m : missasDoMes) {
            if (m.getEquipe() != null) continue;
            int dow = diaDaSemana(m.getData());
            Equipe escolhida = escolher(candidatas, dow, historicoPorDia, mesPorDia, mesTotal, historicoTotal);
            m.setEquipe(escolhida);
            missas.save(m);
            contar(mesPorDia, mesTotal, m);
            atribuidas++;
        }

        // 4) relatorio (busca todas as equipes envolvidas em uma unica consulta)
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

        return new EscalaEquipeDtos.Resposta(
                mes, substituir, missasDoMes.size(), mantidas.size(), atribuidas,
                linhas, montarResumo(porId, mesTotal, mesPorDia, historicoTotal, historicoPorDia));
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

    private Equipe escolher(List<Equipe> candidatas, int dow,
                            Map<Long, int[]> historicoPorDia, Map<Long, int[]> mesPorDia,
                            Map<Long, Integer> mesTotal, Map<Long, Integer> historicoTotal) {
        Equipe melhor = null;
        int[] melhorChave = null;

        for (Equipe e : candidatas) {
            Long id = e.getId();
            int[] chave = {
                    conta(historicoPorDia, id, dow),        // 1. meses anteriores, mesmo dia
                    conta(mesPorDia, id, dow),              // 2. no mes, mesmo dia
                    mesTotal.getOrDefault(id, 0),           // 3. total no mes
                    historicoTotal.getOrDefault(id, 0)      // 4. total no historico
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

    private void contar(Map<Long, int[]> porDia, Map<Long, Integer> total, Missa m) {
        Long id = m.getEquipe().getId();
        porDia.computeIfAbsent(id, k -> new int[8])[diaDaSemana(m.getData())]++;
        total.merge(id, 1, Integer::sum);
    }

    private int conta(Map<Long, int[]> porDia, Long equipeId, int dow) {
        int[] vetor = porDia.get(equipeId);
        return vetor == null ? 0 : vetor[dow];
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
