package com.igreja.escala.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Ministro da comunhao (membro da comunidade que compoe as equipes).
 */
@Entity
@Table(name = "ministro")
public class Ministro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 30)
    private String telefone;

    @Column(length = 120)
    private String email;

    /** Funcao que o ministro costuma exercer (preferencia pessoal). */
    @Column(length = 80)
    private String funcaoPreferida;

    /** Sexo do ministro: "Feminino" ou "Masculino". */
    @Column(length = 12)
    private String sexo;

    /** Data de nascimento (opcional), em ISO AAAA-MM-DD. */
    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(columnDefinition = "text")
    private String observacoes;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    void aoPersistir() {
        if (criadoEm == null) criadoEm = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFuncaoPreferida() { return funcaoPreferida; }
    public void setFuncaoPreferida(String funcaoPreferida) { this.funcaoPreferida = funcaoPreferida; }
    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }
    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate dataNascimento) { this.dataNascimento = dataNascimento; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public Instant getCriadoEm() { return criadoEm; }
    public void setCriadoEm(Instant criadoEm) { this.criadoEm = criadoEm; }
}
