package com.igreja.escala.dto;

import java.time.Instant;
import java.util.List;

public final class EscalaHistoricoDtos {

    private EscalaHistoricoDtos() {}

    /** Um registro do historico, na lista. */
    public record Resumo(
            Long id,
            String mes,
            Instant criadoEm,
            int totalMissas,
            int totalEquipes,
            int totalMembros) {}

    /** Fotografia completa de uma geracao da escala. */
    public record Resposta(
            Long id,
            String mes,
            Instant criadoEm,
            int totalMissas,
            List<DiaSemanaQtd> missasPorDiaSemana,
            List<MissaSnapshot> missas,
            List<EquipeSnapshot> equipes) {}

    /** Quantidade de missas de um dia da semana, com os horarios do mes. */
    public record DiaSemanaQtd(String diaSemana, int quantidade, List<String> horarios) {}

    /** Uma missa do mes e a equipe que a cobria naquele momento. */
    public record MissaSnapshot(
            Long missaId,
            java.time.LocalDate data,
            java.time.LocalTime hora,
            String titulo,
            String observacoes,
            boolean destaque,
            Long equipeId,
            String equipeNome,
            Integer equipeNumero) {}

    /** Uma equipe e os membros que a compunham no momento da geracao. */
    public record EquipeSnapshot(Long equipeId, String nome, Integer numero, List<MembroSnapshot> membros) {}

    /** Um membro da equipe naquele momento (id mantido so para referencia). */
    public record MembroSnapshot(Long ministroId, String nome, String telefone, String sexo, boolean coordenador) {}

    /** Missa passada (equipe + data/hora) usada para equilibrar a geracao. */
    public record Atribuicao(Long equipeId, java.time.LocalDate data, java.time.LocalTime hora) {}
}
