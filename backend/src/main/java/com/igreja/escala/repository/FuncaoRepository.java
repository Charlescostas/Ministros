package com.igreja.escala.repository;

import com.igreja.escala.entity.Funcao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FuncaoRepository extends JpaRepository<Funcao, Long> {

    List<Funcao> findAllByOrderByOrdemAsc();

    List<Funcao> findByAtivaTrueOrderByOrdemAsc();

    boolean existsByNomeIgnoreCase(String nome);
}
