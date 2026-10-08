package com.igreja.escala.controller;

import com.igreja.escala.dto.DoacaoDtos;
import com.igreja.escala.service.DoacaoService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/doacoes")
public class DoacaoController {

    private final DoacaoService service;

    public DoacaoController(DoacaoService service) { this.service = service; }

    @GetMapping
    public List<DoacaoDtos.Resposta> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.listar(de, ate);
    }

    @GetMapping("/{id}")
    public DoacaoDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public DoacaoDtos.Resposta salvar(@Valid @RequestBody DoacaoDtos.Dados dados) {
        return service.salvar(dados);
    }

    @PutMapping("/{id}")
    public DoacaoDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody DoacaoDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
