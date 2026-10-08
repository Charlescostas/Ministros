package com.igreja.escala.controller;

import com.igreja.escala.dto.DespesaDtos;
import com.igreja.escala.service.DespesaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/despesas")
public class DespesaController {

    private final DespesaService service;

    public DespesaController(DespesaService service) { this.service = service; }

    @GetMapping
    public List<DespesaDtos.Resposta> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.listar(de, ate);
    }

    @GetMapping("/{id}")
    public DespesaDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public DespesaDtos.Resposta salvar(@Valid @RequestBody DespesaDtos.Dados dados) {
        return service.salvar(dados);
    }

    @PutMapping("/{id}")
    public DespesaDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody DespesaDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
