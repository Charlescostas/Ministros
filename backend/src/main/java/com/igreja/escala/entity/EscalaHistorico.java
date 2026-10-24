package com.igreja.escala.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Fotografia da escala no momento em que ela foi gerada: os membros de cada
 * equipe e a quantidade de missas por dia da semana.
 *
 * Os dados sao gravados em JSON (colunas de texto) de proposito: nada aqui
 * referencia equipe, ministro ou missa, entao o historico continua igual mesmo
 * que a equipe mude de membros, o ministro seja excluido ou as missas do mes
 * sejam reprogramadas depois.
 */
@Entity
@Table(name = "escala_historico",
       indexes = @Index(name = "idx_escala_historico_mes", columnList = "mes"))
public class EscalaHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mes da escala gerada, no formato AAAA-MM. */
    @Column(nullable = false, length = 7)
    private String mes;

    /** Quantidade de missas do mes no momento da geracao. */
    @Column(name = "total_missas", nullable = false)
    private int totalMissas;

    /** Quantidade de equipes envolvidas na escala do mes. */
    @Column(name = "total_equipes", nullable = false)
    private int totalEquipes;

    /** Total de membros somando as equipes da escala. */
    @Column(name = "total_membros", nullable = false)
    private int totalMembros;

    /** Membros de cada equipe, em JSON (lista de EquipeSnapshot). */
    @Column(name = "equipes", nullable = false, columnDefinition = "text")
    private String equipes;

    /** Missas do mes e a equipe de cada uma, em JSON (lista de MissaSnapshot). */
    @Column(name = "missas", columnDefinition = "text")
    private String missas;

    /** Missas do mes por dia da semana, em JSON (lista de DiaSemanaQtd). */
    @Column(name = "missas_por_dia_semana", nullable = false, columnDefinition = "text")
    private String missasPorDiaSemana;

    /** Quando a fotografia foi gravada. */
    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    void aoPersistir() {
        if (criadoEm == null) criadoEm = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }
    public int getTotalMissas() { return totalMissas; }
    public void setTotalMissas(int totalMissas) { this.totalMissas = totalMissas; }
    public int getTotalEquipes() { return totalEquipes; }
    public void setTotalEquipes(int totalEquipes) { this.totalEquipes = totalEquipes; }
    public int getTotalMembros() { return totalMembros; }
    public void setTotalMembros(int totalMembros) { this.totalMembros = totalMembros; }
    public String getEquipes() { return equipes; }
    public void setEquipes(String equipes) { this.equipes = equipes; }
    public String getMissas() { return missas; }
    public void setMissas(String missas) { this.missas = missas; }
    public String getMissasPorDiaSemana() { return missasPorDiaSemana; }
    public void setMissasPorDiaSemana(String missasPorDiaSemana) { this.missasPorDiaSemana = missasPorDiaSemana; }
    public Instant getCriadoEm() { return criadoEm; }
    public void setCriadoEm(Instant criadoEm) { this.criadoEm = criadoEm; }
}
