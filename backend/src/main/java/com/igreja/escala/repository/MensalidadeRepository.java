package com.igreja.escala.repository;

import com.igreja.escala.entity.Mensalidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MensalidadeRepository extends JpaRepository<Mensalidade, Long> {

    List<Mensalidade> findByDataRecebimentoBetweenOrderByDataRecebimentoDescIdDesc(LocalDate de, LocalDate ate);

    List<Mensalidade> findByDataRecebimentoBetweenAndMinistroIdOrderByDataRecebimentoDescIdDesc(
            LocalDate de, LocalDate ate, Long ministroId);

    List<Mensalidade> findAllByOrderByIdDesc();

    /** Por competencia (AAAA-MM: ordem lexicografica = cronologica) — usado nos relatorios anuais. */
    List<Mensalidade> findByCompetenciaBetweenOrderByCompetenciaAscIdAsc(String de, String ate);

    List<Mensalidade> findByCompetenciaBetweenAndMinistroIdOrderByCompetenciaAscIdAsc(
            String de, String ate, Long ministroId);

    /** Competencias ja lancadas de um ministro no intervalo (AAAA-MM: ordem lexicografica = cronologica). */
    @Query("select m.competencia from Mensalidade m "
            + "where m.ministro.id = :ministroId and m.competencia between :de and :ate")
    List<String> competenciasDoMinistro(@Param("ministroId") Long ministroId, @Param("de") String de,
                                        @Param("ate") String ate);

    long countByMinistroId(Long ministroId);
}
