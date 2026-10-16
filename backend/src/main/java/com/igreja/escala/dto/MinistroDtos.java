package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public final class MinistroDtos {

    private MinistroDtos() {}

    public record Dados(
            @NotBlank(message = "Nome e obrigatorio") String nome,
            String telefone,
            String email,
            String funcaoPreferida,
            String sexo,
            LocalDate dataNascimento,
            String estadoCivil,
            Long conjugeId,
            Boolean ativo,
            String observacoes) {}

    public record Resposta(
            Long id,
            String nome,
            String telefone,
            String email,
            String funcaoPreferida,
            String sexo,
            LocalDate dataNascimento,
            String estadoCivil,
            Long conjugeId,
            String conjugeNome,
            boolean ativo,
            String observacoes,
            long totalEscalas) {}
}
