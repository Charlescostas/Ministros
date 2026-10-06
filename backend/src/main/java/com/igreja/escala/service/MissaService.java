package com.igreja.escala.service;

import com.igreja.escala.dto.MissaDtos;
import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.Missa;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EquipeRepository;
import com.igreja.escala.repository.EscalaRepository;
import com.igreja.escala.repository.MissaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class MissaService {

    private final MissaRepository missas;
    private final EquipeRepository equipes;
    private final EscalaRepository escalas;

    public MissaService(MissaRepository missas, EquipeRepository equipes, EscalaRepository escalas) {
        this.missas = missas;
        this.equipes = equipes;
        this.escalas = escalas;
    }

    @Transactional(readOnly = true)
    public List<MissaDtos.Resposta> listar(LocalDate de, LocalDate ate, Long equipeId, String busca) {
        Set<Long> comEscala = new HashSet<>(escalas.missasComEscala());
        List<Missa> lista;

        if (busca != null && !busca.isBlank()) {
            lista = missas.buscar(busca.trim());
        } else if (de != null && ate != null) {
            lista = equipeId != null
                    ? missas.findByDataBetweenAndEquipeIdOrderByDataAscHoraAsc(de, ate, equipeId)
                    : missas.findByDataBetweenOrderByDataAscHoraAsc(de, ate);
        } else {
            lista = missas.findAllByOrderByDataAscHoraAsc();
        }

        return lista.stream().map(m -> paraResposta(m, comEscala)).toList();
    }

    @Transactional(readOnly = true)
    public MissaDtos.Resposta buscar(Long id) {
        return paraResposta(carregar(id), new HashSet<>(escalas.missasComEscala()));
    }

    @Transactional
    public MissaDtos.Resposta salvar(MissaDtos.Dados dados) {
        Missa m = new Missa();
        aplicar(m, dados);
        verificarDuplicidade(m);
        missas.save(m);
        return paraResposta(m, Set.of());
    }

    @Transactional
    public MissaDtos.Resposta atualizar(Long id, MissaDtos.Dados dados) {
        Missa m = carregar(id);
        aplicar(m, dados);
        verificarDuplicidade(m);
        missas.save(m);
        return paraResposta(m, new HashSet<>(escalas.missasComEscala()));
    }

    @Transactional
    public void remover(Long id) {
        Missa m = carregar(id);
        if (escalas.findByMissaId(id).isEmpty()) {
            missas.delete(m);
        } else {
            throw ApiException.conflito("Nao e possivel excluir: a missa possui escala gerada.");
        }
    }

    private void aplicar(Missa m, MissaDtos.Dados dados) {
        if (dados.data() == null) throw ApiException.regra("Data e obrigatoria");
        if (dados.hora() == null) throw ApiException.regra("Hora e obrigatoria");
        if (dados.titulo() == null || dados.titulo().isBlank()) throw ApiException.regra("Titulo e obrigatorio");

        m.setData(dados.data());
        m.setHora(dados.hora());
        m.setTitulo(dados.titulo().trim());
        m.setCelebrante(dados.celebrante());
        m.setLocal(dados.local());
        m.setObservacoes(dados.observacoes());
        m.setDestaque(Boolean.TRUE.equals(dados.destaque()));

        if (dados.equipeId() == null) {
            m.setEquipe(null);
        } else {
            Equipe e = equipes.findById(dados.equipeId())
                    .orElseThrow(() -> ApiException.naoEncontrado("Equipe nao encontrada"));
            m.setEquipe(e);
        }
    }

    private void verificarDuplicidade(Missa m) {
        boolean duplicada = missas.findAllByOrderByDataAscHoraAsc().stream()
                .anyMatch(x -> !x.getId().equals(m.getId())
                        && x.getData().equals(m.getData())
                        && x.getHora().equals(m.getHora()));
        if (duplicada) {
            throw ApiException.conflito("Ja existe uma missa cadastrada nesta data e hora");
        }
    }

    private Missa carregar(Long id) {
        return missas.findById(id).orElseThrow(() -> ApiException.naoEncontrado("Missa nao encontrada"));
    }

    private MissaDtos.Resposta paraResposta(Missa m, Set<Long> comEscala) {
        return new MissaDtos.Resposta(
                m.getId(), m.getData(), m.getHora(), m.getTitulo(), m.getCelebrante(), m.getLocal(),
                m.getEquipe() == null ? null : m.getEquipe().getId(),
                m.getEquipe() == null ? null : m.getEquipe().getNome(),
                m.getObservacoes(),
                comEscala.contains(m.getId()),
                m.isDestaque());
    }
}
