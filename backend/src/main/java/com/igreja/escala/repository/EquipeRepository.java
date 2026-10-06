package com.igreja.escala.repository;

import com.igreja.escala.entity.Equipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EquipeRepository extends JpaRepository<Equipe, Long> {

    List<Equipe> findAllByOrderByNomeAsc();

    List<Equipe> findByAtivaTrueOrderByNomeAsc();

    long countByAtivaTrue();

    Optional<Equipe> findByNomeIgnoreCase(String nome);

    boolean existsByMinistrosId(Long ministroId);
}
