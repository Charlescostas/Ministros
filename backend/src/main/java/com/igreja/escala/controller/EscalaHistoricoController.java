package com.igreja.escala.controller;

import com.igreja.escala.dto.EscalaHistoricoDtos;
import com.igreja.escala.service.EscalaHistoricoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/escalas/historico")
public class EscalaHistoricoController {

    private final EscalaHistoricoService service;

    public EscalaHistoricoController(EscalaHistoricoService service) { this.service = service; }

    /** Registros do historico (de um mes, quando ?mes= for informado). */
    @GetMapping
    public List<EscalaHistoricoDtos.Resumo> listar(@RequestParam(required = false) String mes) {
        return service.listar(mes);
    }

    /** Fotografia completa de uma geracao: membros das equipes e missas do dia. */
    @GetMapping("/{id}")
    public EscalaHistoricoDtos.Resposta buscar(@PathVariable Long id) {
        return service.buscar(id);
    }
}
