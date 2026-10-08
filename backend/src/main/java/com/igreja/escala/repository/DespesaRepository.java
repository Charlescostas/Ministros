package com.igreja.escala.repository;

import com.igreja.escala.entity.Despesa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DespesaRepository extends JpaRepository<Despesa, Long> {

    List<Despesa> findByDataBetweenOrderByDataDescIdDesc(LocalDate de, LocalDate ate);

    List<Despesa> findAllByOrderByIdDesc();
}
