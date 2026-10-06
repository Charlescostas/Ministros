package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;

public final class MinistroDtos {

    private MinistroDtos() {}

    public record Dados(
            @NotBlank(message = "Nome e obrigatorio") String nome,
            String telefone,
            String email,
            String funcaoPreferida,
            Boolean ativo,
            String observacoes) {}

    public record Resposta(
            Long id,
            String nome,
            String telefone,
            String email,
            String funcaoPreferida,
            boolean ativo,
            String observacoes,
            long totalEscalas) {}
}
