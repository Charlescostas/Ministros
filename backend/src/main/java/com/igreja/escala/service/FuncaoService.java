package com.igreja.escala.service;

import com.igreja.escala.dto.FuncaoDtos;
import com.igreja.escala.entity.Funcao;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EscalaRepository;
import com.igreja.escala.repository.FuncaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FuncaoService {

    private final FuncaoRepository funcoes;
    private final EscalaRepository escalas;

    public FuncaoService(FuncaoRepository funcoes, EscalaRepository escalas) {
        this.funcoes = funcoes;
        this.escalas = escalas;
    }

    @Transactional(readOnly = true)
    public List<FuncaoDtos.Resposta> listar() {
        return funcoes.findAllByOrderByOrdemAsc().stream().map(this::paraResposta).toList();
    }

    @Transactional
    public FuncaoDtos.Resposta salvar(FuncaoDtos.Dados dados) {
        validarNome(dados.nome(), null);
        Funcao f = new Funcao();
        aplicar(f, dados);
        funcoes.save(f);
        return paraResposta(f);
    }

    @Transactional
    public FuncaoDtos.Resposta atualizar(Long id, FuncaoDtos.Dados dados) {
        Funcao f = funcoes.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Funcao nao encontrada"));
        validarNome(dados.nome(), id);
        aplicar(f, dados);
        funcoes.save(f);
        return paraResposta(f);
    }

    @Transactional
    public void remover(Long id) {
        Funcao f = funcoes.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Funcao nao encontrada"));
        boolean emUso = escalas.findAll().stream().anyMatch(e -> e.getFuncao().getId().equals(id));
        if (emUso) {
            throw ApiException.conflito("Nao e possivel excluir: a funcao esta em uso em escalas geradas");
        }
        funcoes.delete(f);
    }

    private void aplicar(Funcao f, FuncaoDtos.Dados dados) {
        if (dados.nome() == null || dados.nome().isBlank()) throw ApiException.regra("Nome da funcao e obrigatorio");
        f.setNome(dados.nome().trim());
        f.setOrdem(dados.ordem() == null ? 1 : dados.ordem());
        f.setQuantidade(dados.quantidade() == null ? 1 : dados.quantidade());
        f.setAtiva(dados.ativa() == null || dados.ativa());
    }

    private void validarNome(String nome, Long idAtual) {
        if (nome == null || nome.isBlank()) throw ApiException.regra("Nome da funcao e obrigatorio");
        funcoes.findAllByOrderByOrdemAsc().stream()
                .filter(f -> f.getNome().equalsIgnoreCase(nome.trim()) && !f.getId().equals(idAtual))
                .findFirst()
                .ifPresent(f -> { throw ApiException.conflito("Ja existe uma funcao com esse nome"); });
    }

    private FuncaoDtos.Resposta paraResposta(Funcao f) {
        return new FuncaoDtos.Resposta(f.getId(), f.getNome(), f.getOrdem(), f.getQuantidade(), f.isAtiva());
    }
}
