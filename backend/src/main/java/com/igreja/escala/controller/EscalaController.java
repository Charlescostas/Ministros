package com.igreja.escala.controller;

import com.igreja.escala.dto.EscalaDtos;
import com.igreja.escala.service.EscalaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/escalas")
public class EscalaController {

    private final EscalaService service;

    public EscalaController(EscalaService service) { this.service = service; }

    @GetMapping
    public List<EscalaDtos.Resposta> listar(@RequestParam String mes,
                                            @RequestParam(required = false) Long equipeId) {
        return service.listar(mes, equipeId);
    }

    @PostMapping("/gerar")
    public List<EscalaDtos.Resposta> gerar(@Valid @RequestBody EscalaDtos.GerarRequest request) {
        return service.gerar(request);
    }

    @PutMapping("/{id}")
    public EscalaDtos.Resposta atualizar(@PathVariable Long id,
                                         @Valid @RequestBody EscalaDtos.AtualizarRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }

    @PostMapping("/limpar")
    public void limpar(@RequestParam String mes, @RequestParam Long equipeId) { service.limpar(mes, equipeId); }
}
