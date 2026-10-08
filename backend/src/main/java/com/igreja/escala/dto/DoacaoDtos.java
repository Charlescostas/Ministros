package com.igreja.escala.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class DoacaoDtos {

    private DoacaoDtos() {}

    public record Dados(
            LocalDate data,
            String descricao,
            String categoria,
            BigDecimal valor,
            String observacao) {}

    public record Resposta(
            Long id,
            LocalDate data,
            String descricao,
            String categoria,
            BigDecimal valor,
            String observacao) {}
}
