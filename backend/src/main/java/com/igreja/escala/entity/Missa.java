package com.igreja.escala.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Missa cadastrada por data/hora, opcionalmente vinculada a uma equipe.
 */
@Entity
@Table(name = "missa",
       uniqueConstraints = @UniqueConstraint(name = "uk_missa_data_hora", columnNames = {"data", "hora"}))
public class Missa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data", nullable = false)
    private LocalDate data;

    @Column(name = "hora", nullable = false)
    private LocalTime hora;

    /** Ex.: "Domingo - 11a Semana Comum". */
    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(length = 120)
    private String celebrante;

    @Column(length = 120)
    private String local;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_id")
    private Equipe equipe;

    @Column(columnDefinition = "text")
    private String observacoes;

    /** Destaque visual (vermelho) no documento impresso - batizado, casamento etc. */
    @Column(name = "destaque")
    private boolean destaque = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }
    public LocalTime getHora() { return hora; }
    public void setHora(LocalTime hora) { this.hora = hora; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getCelebrante() { return celebrante; }
    public void setCelebrante(String celebrante) { this.celebrante = celebrante; }
    public String getLocal() { return local; }
    public void setLocal(String local) { this.local = local; }
    public Equipe getEquipe() { return equipe; }
    public void setEquipe(Equipe equipe) { this.equipe = equipe; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public boolean isDestaque() { return destaque; }
    public void setDestaque(boolean destaque) { this.destaque = destaque; }
}
