package com.igreja.escala.entity;

import jakarta.persistence.*;

/**
 * Configuracao do documento de escala impressa (singleton, id = 1).
 * Guarda os textos do cabecalho, do rodape e dos adendos.
 */
@Entity
@Table(name = "configuracao")
public class Configuracao {

    public static final Long ID_UNICO = 1L;

    @Id
    private Long id = ID_UNICO;

    /** Ex.: PARÓQUIA SANTA TERESINHA DO MENINO JESUS */
    @Column(name = "nome_paroquia", length = 160)
    private String nomeParoquia;

    /** Ex.: MINISTROS EXTRAORDINÁRIOS DA SAGRADA COMUNHÃO EUCARÍSTICA */
    @Column(name = "titulo_grupo", length = 200)
    private String tituloGrupo;

    /** Paragrafo "Obs:" da impressao. */
    @Column(name = "texto_obs", columnDefinition = "text")
    private String textoObs;

    /** Conteudo da caixa "Missa dos Ministros". */
    @Column(name = "texto_missa_ministros", columnDefinition = "text")
    private String textoMissaMinistros;

    /** Bloco lateral de adendos (ex.: escala da Missa da Saude). */
    @Column(columnDefinition = "text")
    private String adendos;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomeParoquia() { return nomeParoquia; }
    public void setNomeParoquia(String nomeParoquia) { this.nomeParoquia = nomeParoquia; }
    public String getTituloGrupo() { return tituloGrupo; }
    public void setTituloGrupo(String tituloGrupo) { this.tituloGrupo = tituloGrupo; }
    public String getTextoObs() { return textoObs; }
    public void setTextoObs(String textoObs) { this.textoObs = textoObs; }
    public String getTextoMissaMinistros() { return textoMissaMinistros; }
    public void setTextoMissaMinistros(String textoMissaMinistros) { this.textoMissaMinistros = textoMissaMinistros; }
    public String getAdendos() { return adendos; }
    public void setAdendos(String adendos) { this.adendos = adendos; }
}
