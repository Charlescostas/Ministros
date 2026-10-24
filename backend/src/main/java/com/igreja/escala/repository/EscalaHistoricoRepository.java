package com.igreja.escala.repository;

import com.igreja.escala.entity.EscalaHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EscalaHistoricoRepository extends JpaRepository<EscalaHistorico, Long> {

    /** Registros de um mes, do mais recente para o mais antigo. */
    List<EscalaHistorico> findByMesOrderByCriadoEmDesc(String mes);

    /** Todos os registros, do mes mais recente para o mais antigo. */
    List<EscalaHistorico> findAllByOrderByMesDescCriadoEmDesc();
}
