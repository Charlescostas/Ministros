package com.igreja.escala.controller;

import com.igreja.escala.dto.MissaDtos;
import com.igreja.escala.service.MissaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/missas")
public class MissaController {

    private final MissaService service;

    public MissaController(MissaService service) { this.service = service; }

    @GetMapping
    public List<MissaDtos.Resposta> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(required = false) Long equipeId,
            @RequestParam(required = false) String busca) {
        return service.listar(de, ate, equipeId, busca);
    }

    @GetMapping("/{id}")
    public MissaDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public MissaDtos.Resposta salvar(@Valid @RequestBody MissaDtos.Dados dados) { return service.salvar(dados); }

    @PutMapping("/{id}")
    public MissaDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody MissaDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
