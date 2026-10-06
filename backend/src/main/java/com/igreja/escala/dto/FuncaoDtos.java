package com.igreja.escala.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class FuncaoDtos {

    private FuncaoDtos() {}

    public record Dados(
            @NotBlank(message = "Nome da funcao e obrigatorio") String nome,
            @Min(value = 1, message = "Ordem deve ser maior que zero") Integer ordem,
            @Min(value = 1, message = "Quantidade deve ser maior que zero") Integer quantidade,
            Boolean ativa) {}

    public record Resposta(Long id, String nome, Integer ordem, Integer quantidade, boolean ativa) {}
}
