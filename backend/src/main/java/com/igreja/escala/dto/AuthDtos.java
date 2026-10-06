package com.igreja.escala.dto;

import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank(message = "Informe o usuario") String username,
            @NotBlank(message = "Informe a senha") String password) {}

    public record LoginResponse(String token, String username) {}
}
