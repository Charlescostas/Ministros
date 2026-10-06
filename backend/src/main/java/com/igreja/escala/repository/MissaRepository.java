package com.igreja.escala.repository;

import com.igreja.escala.entity.Missa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MissaRepository extends JpaRepository<Missa, Long> {

    List<Missa> findAllByOrderByDataAscHoraAsc();

    List<Missa> findByDataBetweenOrderByDataAscHoraAsc(LocalDate de, LocalDate ate);

    List<Missa> findByDataBetweenAndEquipeIdOrderByDataAscHoraAsc(LocalDate de, LocalDate ate, Long equipeId);

    List<Missa> findByDataGreaterThanEqualOrderByDataAscHoraAsc(LocalDate de);

    long countByDataBetween(LocalDate de, LocalDate ate);

    long countByDataBetweenAndEquipeId(LocalDate de, LocalDate ate, Long equipeId);

    @Query("select m from Missa m where lower(m.titulo) like lower(concat('%', :busca, '%')) order by m.data asc, m.hora asc")
    List<Missa> buscar(@Param("busca") String busca);

    long countByEquipeId(Long equipeId);

    boolean existsByDataAndHora(LocalDate data, java.time.LocalTime hora);
}
