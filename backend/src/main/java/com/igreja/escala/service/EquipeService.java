package com.igreja.escala.service;

import com.igreja.escala.dto.EquipeDtos;
import com.igreja.escala.dto.MinistroDtos;
import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.Ministro;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EquipeRepository;
import com.igreja.escala.repository.EscalaRepository;
import com.igreja.escala.repository.MissaRepository;
import com.igreja.escala.repository.MinistroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EquipeService {

    private final EquipeRepository equipes;
    private final MinistroRepository ministros;
    private final EscalaRepository escalas;
    private final MissaRepository missas;

    public EquipeService(EquipeRepository equipes, MinistroRepository ministros,
                         EscalaRepository escalas, MissaRepository missas) {
        this.equipes = equipes;
        this.ministros = ministros;
        this.escalas = escalas;
        this.missas = missas;
    }

    @Transactional(readOnly = true)
    public List<EquipeDtos.Resposta> listar() {
        Map<Long, Long> contagem = contagemDeEscalas();
        return equipes.findAllByOrderByNomeAsc().stream()
                .map(e -> paraResposta(e, contagem))
                .toList();
    }

    @Transactional(readOnly = true)
    public EquipeDtos.Resposta buscar(Long id) {
        return paraResposta(carregar(id), contagemDeEscalas());
    }

    @Transactional
    public EquipeDtos.Resposta salvar(EquipeDtos.Dados dados) {
        validarNome(dados.nome(), null);
        Equipe e = new Equipe();
        e.setNome(dados.nome().trim());
        e.setDescricao(dados.descricao());
        e.setAtiva(dados.ativa() == null || dados.ativa());
        e.setNumero(dados.numero());
        e.setMinistros(resolverMinistros(dados.ministroIds()));
        aplicarCoordenador(e, dados.coordenadorId());
        equipes.save(e);
        return paraResposta(e, Map.of());
    }

    /**
     * Atualiza a equipe. Trocar os membros NAO apaga a escala ja gerada:
     * os itens anteriores continuam vinculados aos ministros que estavam na
     * equipe na época, preservando o histórico impresso.
     */
    @Transactional
    public EquipeDtos.Resposta atualizar(Long id, EquipeDtos.Dados dados) {
        Equipe e = carregar(id);
        validarNome(dados.nome(), id);
        e.setNome(dados.nome().trim());
        e.setDescricao(dados.descricao());
        e.setAtiva(dados.ativa() == null || dados.ativa());
        e.setNumero(dados.numero());
        e.setMinistros(resolverMinistros(dados.ministroIds()));
        aplicarCoordenador(e, dados.coordenadorId());
        equipes.save(e);
        return paraResposta(e, contagemDeEscalas());
    }

    @Transactional
    public void remover(Long id) {
        Equipe e = carregar(id);
        long missasVinculadas = missas.countByEquipeId(id);
        if (missasVinculadas > 0) {
            throw ApiException.conflito("Nao e possivel excluir: a equipe esta vinculada a "
                    + missasVinculadas + " missa(s). Retire a equipe dessas missas antes.");
        }
        long total = escalas.countByEquipeId(id);
        if (total > 0) {
            throw ApiException.conflito("Nao e possivel excluir: a equipe possui escala gerada. Edite ou apague a escala antes.");
        }
        equipes.delete(e);
    }

    @Transactional
    public EquipeDtos.Resposta adicionarMinistro(Long equipeId, Long ministroId) {
        Equipe e = carregar(equipeId);
        Ministro m = ministros.findById(ministroId)
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro nao encontrado"));
        if (e.getMinistros().stream().anyMatch(x -> x.getId().equals(ministroId))) {
            throw ApiException.conflito("Ministro ja pertence a esta equipe");
        }
        e.getMinistros().add(m);
        equipes.save(e);
        return paraResposta(e, contagemDeEscalas());
    }

    /**
     * Remove o membro da equipe. A escala ja gerada NAO e alterada:
     * os itens daquele ministro permanecem na escala (historico).
     */
    @Transactional
    public EquipeDtos.Resposta removerMinistro(Long equipeId, Long ministroId) {
        Equipe e = carregar(equipeId);
        boolean removido = e.getMinistros().removeIf(x -> x.getId().equals(ministroId));
        if (!removido) {
            throw ApiException.naoEncontrado("Ministro nao esta nesta equipe");
        }
        // quem sai da equipe deixa de ser coordenador
        if (e.getCoordenador() != null && e.getCoordenador().getId().equals(ministroId)) {
            e.setCoordenador(null);
        }
        equipes.save(e);
        return paraResposta(e, contagemDeEscalas());
    }

    /**
     * Define o coordenador. Precisa ser um dos membros da equipe;
     * id nulo limpa a referencia (nunca mexe na escala gerada).
     */
    private void aplicarCoordenador(Equipe e, Long coordenadorId) {
        if (coordenadorId == null) {
            e.setCoordenador(null);
            return;
        }
        Ministro coordenador = e.getMinistros().stream()
                .filter(m -> m.getId().equals(coordenadorId))
                .findFirst()
                .orElseThrow(() -> ApiException.regra("O coordenador precisa ser um membro da equipe"));
        e.setCoordenador(coordenador);
    }

    private List<Ministro> resolverMinistros(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();
        List<Ministro> encontrados = ministros.findAllById(ids);
        if (encontrados.size() != ids.size()) {
            throw ApiException.regra("Lista de ministros invalida");
        }
        return new ArrayList<>(encontrados);
    }

    private void validarNome(String nome, Long idAtual) {
        if (nome == null || nome.isBlank()) throw ApiException.regra("Nome da equipe e obrigatorio");
        equipes.findByNomeIgnoreCase(nome.trim())
                .ifPresent(e -> {
                    if (idAtual == null || !e.getId().equals(idAtual)) {
                        throw ApiException.conflito("Ja existe uma equipe com esse nome");
                    }
                });
    }

    private Equipe carregar(Long id) {
        return equipes.findById(id).orElseThrow(() -> ApiException.naoEncontrado("Equipe nao encontrada"));
    }

    private Map<Long, Long> contagemDeEscalas() {
        Map<Long, Long> mapa = new HashMap<>();
        ministros.contarEscalasPorMinistro()
                .forEach(linha -> mapa.put((Long) linha[0], ((Number) linha[1]).longValue()));
        return mapa;
    }

    private EquipeDtos.Resposta paraResposta(Equipe e, Map<Long, Long> contagem) {
        List<MinistroDtos.Resposta> membros = e.getMinistros().stream()
                .sorted((a, b) -> a.getNome().compareToIgnoreCase(b.getNome()))
                .map(m -> new MinistroDtos.Resposta(
                        m.getId(), m.getNome(), m.getTelefone(), m.getEmail(), m.getFuncaoPreferida(),
                        m.getSexo(), m.getDataNascimento(),
                        m.isAtivo(), m.getObservacoes(), contagem.getOrDefault(m.getId(), 0L)))
                .toList();
        Ministro coordenador = e.getCoordenador();
        return new EquipeDtos.Resposta(
                e.getId(), e.getNumero(), e.getNome(), e.getDescricao(), e.isAtiva(),
                coordenador == null ? null : coordenador.getId(),
                coordenador == null ? null : coordenador.getNome(),
                membros.size(), membros);
    }
}
