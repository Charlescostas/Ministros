package com.igreja.escala.dto;

import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {}

    public record Resumo(
            long ministrosAtivos,
            long equipesAtivas,
            long missasNoMes,
            long escalasNoMes,
            boolean escalaDoMesGerada,
            List<MissaDtos.Resposta> proximasMissas,
            String mesAtual) {}
}
