package com.igreja.escala.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Equipe de servico: agrupa ministros que cumprem a escala juntos.
 */
@Entity
@Table(name = "equipe")
public class Equipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nome;

    @Column(columnDefinition = "text")
    private String descricao;

    @Column(nullable = false)
    private boolean ativa = true;

    /** Numero da equipe no documento impresso (EQUIPE 1, EQUIPE 2...). */
    @Column(name = "numero")
    private Integer numero;

    /**
     * Ministro coordenador da equipe. Sempre um dos membros:
     * a referencia e limpa quando o ministro sai da equipe ou e excluido.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coordenador_id")
    private Ministro coordenador;

    @ManyToMany
    @JoinTable(
            name = "equipe_ministro",
            joinColumns = @JoinColumn(name = "equipe_id"),
            inverseJoinColumns = @JoinColumn(name = "ministro_id"))
    private List<Ministro> ministros = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public boolean isAtiva() { return ativa; }
    public void setAtiva(boolean ativa) { this.ativa = ativa; }
    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }
    public Ministro getCoordenador() { return coordenador; }
    public void setCoordenador(Ministro coordenador) { this.coordenador = coordenador; }
    public List<Ministro> getMinistros() { return ministros; }
    public void setMinistros(List<Ministro> ministros) { this.ministros = ministros; }
}
