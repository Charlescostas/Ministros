package com.igreja.escala.controller;

import com.igreja.escala.dto.MensalidadeDtos;
import com.igreja.escala.service.MensalidadeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/mensalidades")
public class MensalidadeController {

    private final MensalidadeService service;

    public MensalidadeController(MensalidadeService service) { this.service = service; }

    @GetMapping
    public List<MensalidadeDtos.Resposta> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(required = false) Long ministroId,
            @RequestParam(required = false) String competenciaDe,
            @RequestParam(required = false) String competenciaAte) {
        return service.listar(de, ate, ministroId, competenciaDe, competenciaAte);
    }

    @GetMapping("/{id}")
    public MensalidadeDtos.Resposta buscar(@PathVariable Long id) { return service.buscar(id); }

    @PostMapping
    public MensalidadeDtos.Resposta salvar(@Valid @RequestBody MensalidadeDtos.Dados dados) {
        return service.salvar(dados);
    }

    /** Baixa em lote: uma mensalidade por competencia do periodo. */
    @PostMapping("/lote")
    public MensalidadeDtos.LoteResposta salvarLote(@Valid @RequestBody MensalidadeDtos.Lote dados) {
        return service.salvarLote(dados);
    }

    @PutMapping("/{id}")
    public MensalidadeDtos.Resposta atualizar(@PathVariable Long id, @Valid @RequestBody MensalidadeDtos.Dados dados) {
        return service.atualizar(id, dados);
    }

    @DeleteMapping("/{id}")
    public void remover(@PathVariable Long id) { service.remover(id); }
}
