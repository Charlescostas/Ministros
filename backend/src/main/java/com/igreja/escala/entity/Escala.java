package com.igreja.escala.entity;

import jakarta.persistence.*;

/**
 * Item da escala mensal: qual ministro, em qual missa, exercendo qual funcao.
 */
@Entity
@Table(name = "escala",
       uniqueConstraints = @UniqueConstraint(name = "uk_escala_missa_funcao_seq",
               columnNames = {"missa_id", "funcao_id", "sequencia"}))
public class Escala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mes de referencia no formato AAAA-MM. */
    @Column(name = "mes", nullable = false, length = 7)
    private String mes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "missa_id", nullable = false)
    private Missa missa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ministro_id", nullable = false)
    private Ministro ministro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "funcao_id", nullable = false)
    private Funcao funcao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipe_id", nullable = false)
    private Equipe equipe;

    /** Posicao da vaga dentro da funcao (1a, 2a... pessoa para a mesma funcao). */
    @Column(nullable = false)
    private Integer sequencia = 1;

    @Column(columnDefinition = "text")
    private String observacao;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }
    public Missa getMissa() { return missa; }
    public void setMissa(Missa missa) { this.missa = missa; }
    public Ministro getMinistro() { return ministro; }
    public void setMinistro(Ministro ministro) { this.ministro = ministro; }
    public Funcao getFuncao() { return funcao; }
    public void setFuncao(Funcao funcao) { this.funcao = funcao; }
    public Equipe getEquipe() { return equipe; }
    public void setEquipe(Equipe equipe) { this.equipe = equipe; }
    public Integer getSequencia() { return sequencia; }
    public void setSequencia(Integer sequencia) { this.sequencia = sequencia; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
