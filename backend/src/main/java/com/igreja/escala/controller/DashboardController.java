package com.igreja.escala.controller;

import com.igreja.escala.dto.DashboardDtos;
import com.igreja.escala.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping("/resumo")
    public DashboardDtos.Resumo resumo() { return service.resumo(); }
}
