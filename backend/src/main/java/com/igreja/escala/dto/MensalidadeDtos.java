package com.igreja.escala.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class MensalidadeDtos {

    private MensalidadeDtos() {}

    public record Dados(
            Long ministroId,
            String competencia,
            BigDecimal valor,
            LocalDate dataRecebimento,
            String formaPagamento,
            String observacao) {}

    public record Resposta(
            Long id,
            Long ministroId,
            String ministroNome,
            String competencia,
            BigDecimal valor,
            LocalDate dataRecebimento,
            String formaPagamento,
            String observacao) {}

    /** Lancamento em lote: uma mensalidade por competencia no periodo. */
    public record Lote(
            Long ministroId,
            String competenciaDe,
            String competenciaAte,
            BigDecimal valor,
            LocalDate dataRecebimento,
            String formaPagamento,
            String observacao) {}

    public record LoteResposta(
            int criadas,
            int ignoradas,
            List<String> competenciasCriadas,
            List<String> competenciasIgnoradas) {}
}
