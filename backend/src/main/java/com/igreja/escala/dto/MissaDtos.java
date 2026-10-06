package com.igreja.escala.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public final class MissaDtos {

    private MissaDtos() {}

    public record Dados(
            @NotNull(message = "Data e obrigatoria") LocalDate data,
            @NotNull(message = "Hora e obrigatoria") LocalTime hora,
            @jakarta.validation.constraints.NotBlank(message = "Titulo e obrigatorio") String titulo,
            String celebrante,
            String local,
            Long equipeId,
            String observacoes,
            Boolean destaque) {}

    public record Resposta(
            Long id,
            LocalDate data,
            LocalTime hora,
            String titulo,
            String celebrante,
            String local,
            Long equipeId,
            String equipeNome,
            String observacoes,
            boolean escalada,
            boolean destaque) {}
}
