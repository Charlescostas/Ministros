package com.igreja.escala.repository;

import com.igreja.escala.entity.Doacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DoacaoRepository extends JpaRepository<Doacao, Long> {

    List<Doacao> findByDataBetweenOrderByDataDescIdDesc(LocalDate de, LocalDate ate);

    List<Doacao> findAllByOrderByIdDesc();
}
