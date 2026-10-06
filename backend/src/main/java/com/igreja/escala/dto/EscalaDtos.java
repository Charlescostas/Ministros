package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.time.LocalTime;

public final class EscalaDtos {

    private EscalaDtos() {}

    public record GerarRequest(
            @jakarta.validation.constraints.NotNull(message = "Selecione a equipe") Long equipeId,
            @NotBlank(message = "Informe o mes (AAAA-MM)")
            @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "Mes invalido. Use o formato AAAA-MM")
            String mes,
            Boolean substituir) {}

    public record AtualizarRequest(
            @jakarta.validation.constraints.NotNull(message = "Selecione o ministro") Long ministroId,
            String observacao) {}

    public record Resposta(
            Long id,
            String mes,
            Long missaId,
            LocalDate data,
            LocalTime hora,
            String tituloMissa,
            String local,
            Long equipeId,
            String equipeNome,
            Long ministroId,
            String ministroNome,
            String telefoneMinistro,
            Long funcaoId,
            String funcaoNome,
            int sequencia,
            String observacao) {}
}
