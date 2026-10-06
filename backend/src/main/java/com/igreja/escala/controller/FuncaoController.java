package com.igreja.escala.controller;

import com.igreja.escala.dto.FuncaoDtos;
import com.igreja.escala.service.FuncaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/funcoes")
public class FuncaoController {

    private final FuncaoService service;

    public FuncaoController(FuncaoService service) { this.service = service; }

    @GetMapping
    public List<FuncaoDtos.Resposta> listar() { return service.listar(); }

    @PostMapping
    public FuncaoDtos.Resposta salvar(@Valid @RequestBody FuncaoDtos.Dados dados) { return service.salvar(dados); }

    @PutMapping("/{id}")
    public FuncaoDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody FuncaoDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
