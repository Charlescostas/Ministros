package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public final class EscalaEquipeDtos {

    private EscalaEquipeDtos() {}

    public record GerarRequest(
            @NotBlank(message = "Informe o mes (AAAA-MM)")
            @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])",
                     message = "Mes invalido. Use o formato AAAA-MM")
            String mes,
            Boolean substituir) {}

    public record Resposta(
            String mes,
            boolean substituir,
            int totalMissas,
            int mantidas,
            int atribuidas,
            List<Linha> linhas,
            List<ResumoEquipe> resumo) {}

    /** Uma missa e a equipe escolhida, com os contadores usados na decisao. */
    public record Linha(
            Long missaId,
            LocalDate data,
            String diaSemana,
            LocalTime hora,
            String titulo,
            Long equipeId,
            String equipeNome,
            Integer equipeNumero,
            boolean jaEstava,
            int historicoDiaSemana,
            int noMesDiaSemana,
            int noMesTotal) {}

    /** Fechamento por equipe: carga no mes e historico por dia da semana. */
    public record ResumoEquipe(
            Long equipeId,
            String nome,
            Integer numero,
            int noMes,
            int historicoTotal,
            Map<String, Integer> historicoPorDiaSemana,
            Map<String, Integer> noMesPorDiaSemana) {}
}
