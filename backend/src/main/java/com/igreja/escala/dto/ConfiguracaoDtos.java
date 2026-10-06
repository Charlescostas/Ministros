package com.igreja.escala.dto;

public final class ConfiguracaoDtos {

    private ConfiguracaoDtos() {}

    public record Dados(
            String nomeParoquia,
            String tituloGrupo,
            String textoObs,
            String textoMissaMinistros,
            String adendos) {}

    public record Resposta(
            String nomeParoquia,
            String tituloGrupo,
            String textoObs,
            String textoMissaMinistros,
            String adendos) {}
}
