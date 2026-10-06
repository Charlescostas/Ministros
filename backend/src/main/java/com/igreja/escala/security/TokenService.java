package com.igreja.escala.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tokens de sessao em memoria (login simples, sem banco de sessao).
 * Ao reiniciar o servidor os usuarios precisam logar novamente.
 */
@Component
public class TokenService {

    public record Sessao(String username, Instant expiraEm) {}

    private final Map<String, Sessao> tokens = new ConcurrentHashMap<>();

    @Value("${app.auth.username}")
    private String usuario;

    @Value("${app.auth.password}")
    private String senha;

    @Value("${app.auth.token-ttl-hours:12}")
    private long ttlHoras;

    public String login(String username, String password) {
        boolean usuarioOk = compara(usuario, username);
        boolean senhaOk = compara(senha, password);
        if (!usuarioOk || !senhaOk) {
            return null;
        }
        limparExpirados();
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, new Sessao(username, Instant.now().plusSeconds(ttlHoras * 3600)));
        return token;
    }

    /** Retorna o usuario autenticado ou null se o token for invalido/expirado. */
    public String validar(String token) {
        if (token == null || token.isBlank()) return null;
        limparExpirados();
        Sessao sessao = tokens.get(token);
        return sessao == null ? null : sessao.username();
    }

    public void logout(String token) {
        if (token != null) tokens.remove(token);
    }

    private void limparExpirados() {
        Instant agora = Instant.now();
        tokens.values().removeIf(s -> s.expiraEm().isBefore(agora));
    }

    private boolean compara(String esperado, String informado) {
        if (esperado == null || informado == null) return false;
        return MessageDigest.isEqual(
                esperado.getBytes(StandardCharsets.UTF_8),
                informado.getBytes(StandardCharsets.UTF_8));
    }
}
