package com.igreja.escala.controller;

import com.igreja.escala.dto.EscalaEquipeDtos;
import com.igreja.escala.service.EscalaEquipeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/escalas/equipes")
public class EscalaEquipeController {

    private final EscalaEquipeService service;

    public EscalaEquipeController(EscalaEquipeService service) { this.service = service; }

    /** Atribui equipes a todas as missas do mes, distribuindo por dia da semana. */
    @PostMapping("/gerar")
    public EscalaEquipeDtos.Resposta gerar(@Valid @RequestBody EscalaEquipeDtos.GerarRequest request) {
        return service.gerar(request);
    }
}
