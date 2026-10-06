package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class EquipeDtos {

    private EquipeDtos() {}

    public record Dados(
            @NotBlank(message = "Nome da equipe e obrigatorio") String nome,
            String descricao,
            Boolean ativa,
            Integer numero,
            List<Long> ministroIds) {}

    public record Resposta(
            Long id,
            Integer numero,
            String nome,
            String descricao,
            boolean ativa,
            int quantidadeMinistros,
            List<MinistroDtos.Resposta> ministros) {}
}
