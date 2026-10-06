package com.igreja.escala.controller;

import com.igreja.escala.dto.EquipeDtos;
import com.igreja.escala.service.EquipeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipes")
public class EquipeController {

    private final EquipeService service;

    public EquipeController(EquipeService service) { this.service = service; }

    @GetMapping
    public List<EquipeDtos.Resposta> listar() { return service.listar(); }

    @GetMapping("/{id}")
    public EquipeDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public EquipeDtos.Resposta salvar(@Valid @RequestBody EquipeDtos.Dados dados) { return service.salvar(dados); }

    @PutMapping("/{id}")
    public EquipeDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody EquipeDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }

    @PostMapping("/{id}/ministros/{ministroId}")
    public EquipeDtos.Resposta adicionarMinistro(@PathVariable Long id, @PathVariable Long ministroId) {
        return service.adicionarMinistro(id, ministroId);
    }

    @DeleteMapping("/{id}/ministros/{ministroId}")
    public EquipeDtos.Resposta removerMinistro(@PathVariable Long id, @PathVariable Long ministroId) {
        return service.removerMinistro(id, ministroId);
    }
}
