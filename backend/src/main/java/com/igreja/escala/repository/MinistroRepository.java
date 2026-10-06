package com.igreja.escala.repository;

import com.igreja.escala.entity.Ministro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MinistroRepository extends JpaRepository<Ministro, Long> {

    List<Ministro> findAllByOrderByNomeAsc();

    List<Ministro> findByAtivoTrueOrderByNomeAsc();

    long countByAtivoTrue();

    @Query("select m from Ministro m where lower(m.nome) like lower(concat('%', :busca, '%')) order by m.nome asc")
    List<Ministro> buscar(String busca);

    /** Quantidade de itens de escala por ministro (apenas os que possuem escala). */
    @Query("select e.ministro.id, count(e) from Escala e group by e.ministro.id")
    List<Object[]> contarEscalasPorMinistro();
}
