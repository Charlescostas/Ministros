package com.igreja.escala.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Mensalidade recebida de um ministro. */
@Entity
@Table(name = "mensalidade")
public class Mensalidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "ministro_id")
    private Ministro ministro;

    /** Competencia da mensalidade no formato AAAA-MM. */
    @Column(name = "competencia", nullable = false, length = 7)
    private String competencia;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(name = "data_recebimento", nullable = false)
    private LocalDate dataRecebimento;

    /** Forma de pagamento: Dinheiro, Pix, Transferencia, Cartao ou Outro. */
    @Column(name = "forma_pagamento", length = 30)
    private String formaPagamento;

    @Column(length = 200)
    private String observacao;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Ministro getMinistro() { return ministro; }
    public void setMinistro(Ministro ministro) { this.ministro = ministro; }

    public String getCompetencia() { return competencia; }
    public void setCompetencia(String competencia) { this.competencia = competencia; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public LocalDate getDataRecebimento() { return dataRecebimento; }
    public void setDataRecebimento(LocalDate dataRecebimento) { this.dataRecebimento = dataRecebimento; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
