package com.igreja.escala.repository;

import com.igreja.escala.entity.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EscalaRepository extends JpaRepository<Escala, Long> {

    List<Escala> findByMesOrderByMissaDataAscMissaHoraAscFuncaoOrdemAscSequenciaAsc(String mes);

    List<Escala> findByMesAndEquipeIdOrderByMissaDataAscMissaHoraAscFuncaoOrdemAscSequenciaAsc(String mes, Long equipeId);

    long countByMes(String mes);

    long countByMesAndEquipeId(String mes, Long equipeId);

    long countByEquipeId(Long equipeId);

    List<Escala> findByMissaId(Long missaId);

    @Query("select distinct e.missa.id from Escala e")
    List<Long> missasComEscala();

    @Modifying
    @Query("delete from Escala e where e.mes = :mes and e.equipe.id = :equipeId")
    void apagarPorMesEquipe(@Param("mes") String mes, @Param("equipeId") Long equipeId);

    @Query("select e.ministro.id, count(e) from Escala e where e.mes = :mes group by e.ministro.id")
    List<Object[]> contarPorMes(@Param("mes") String mes);

    @Query("select count(e) from Escala e where e.ministro.id = :ministroId")
    long contarPorMinistro(@Param("ministroId") Long ministroId);
}
