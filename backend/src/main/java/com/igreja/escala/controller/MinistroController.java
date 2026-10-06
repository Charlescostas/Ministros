package com.igreja.escala.controller;

import com.igreja.escala.dto.MinistroDtos;
import com.igreja.escala.service.MinistroService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ministros")
public class MinistroController {

    private final MinistroService service;

    public MinistroController(MinistroService service) { this.service = service; }

    @GetMapping
    public List<MinistroDtos.Resposta> listar(@RequestParam(required = false) String busca) {
        return service.listar(busca);
    }

    @GetMapping("/{id}")
    public MinistroDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public MinistroDtos.Resposta salvar(@Valid @RequestBody MinistroDtos.Dados dados) { return service.salvar(dados); }

    @PutMapping("/{id}")
    public MinistroDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody MinistroDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
