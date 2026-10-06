package com.igreja.escala.controller;

import com.igreja.escala.dto.ConfiguracaoDtos;
import com.igreja.escala.service.ConfiguracaoService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracao")
public class ConfiguracaoController {

    private final ConfiguracaoService service;

    public ConfiguracaoController(ConfiguracaoService service) { this.service = service; }

    @GetMapping
    public ConfiguracaoDtos.Resposta obter() { return service.obter(); }

    @PutMapping
    public ConfiguracaoDtos.Resposta salvar(@RequestBody ConfiguracaoDtos.Dados dados) {
        return service.salvar(dados);
    }
}
