package com.igreja.escala.entity;

import jakarta.persistence.*;

/**
 * Funcao exercida durante a missa (liturgista, leitor, ministro da comunhao...).
 * A quantidade define quantas pessoas sao chamadas por missa.
 */
@Entity
@Table(name = "funcao")
public class Funcao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nome;

    /** Ordem de exibicao na escala. */
    @Column(nullable = false)
    private Integer ordem = 1;

    /** Quantidade de ministros chamados por missa para esta funcao. */
    @Column(nullable = false)
    private Integer quantidade = 1;

    @Column(nullable = false)
    private boolean ativa = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
    public boolean isAtiva() { return ativa; }
    public void setAtiva(boolean ativa) { this.ativa = ativa; }
}
