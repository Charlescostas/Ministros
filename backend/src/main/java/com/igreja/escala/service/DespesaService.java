package com.igreja.escala.service;

import com.igreja.escala.dto.DespesaDtos;
import com.igreja.escala.entity.Despesa;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.DespesaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DespesaService {

    private final DespesaRepository despesas;

    public DespesaService(DespesaRepository despesas) {
        this.despesas = despesas;
    }

    @Transactional(readOnly = true)
    public List<DespesaDtos.Resposta> listar(LocalDate de, LocalDate ate) {
        List<Despesa> lista = (de != null && ate != null)
                ? despesas.findByDataBetweenOrderByDataDescIdDesc(de, ate)
                : despesas.findAllByOrderByIdDesc();
        return lista.stream().map(this::paraResposta).toList();
    }

    @Transactional(readOnly = true)
    public DespesaDtos.Resposta buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public DespesaDtos.Resposta salvar(DespesaDtos.Dados dados) {
        Despesa d = new Despesa();
        aplicar(d, dados);
        despesas.save(d);
        return paraResposta(d);
    }

    @Transactional
    public DespesaDtos.Resposta atualizar(Long id, DespesaDtos.Dados dados) {
        Despesa d = carregar(id);
        aplicar(d, dados);
        despesas.save(d);
        return paraResposta(d);
    }

    @Transactional
    public void remover(Long id) {
        despesas.delete(carregar(id));
    }

    private Despesa carregar(Long id) {
        return despesas.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Despesa nao encontrada"));
    }

    private void aplicar(Despesa d, DespesaDtos.Dados dados) {
        if (dados.data() == null) {
            throw ApiException.regra("Data e obrigatoria");
        }
        if (dados.descricao() == null || dados.descricao().isBlank()) {
            throw ApiException.regra("Descricao e obrigatoria");
        }
        if (dados.valor() == null || dados.valor().signum() <= 0) {
            throw ApiException.regra("Valor deve ser maior que zero");
        }
        d.setData(dados.data());
        d.setDescricao(dados.descricao().trim());
        d.setCategoria(dados.categoria() == null || dados.categoria().isBlank()
                ? null : dados.categoria().trim());
        d.setValor(dados.valor());
        d.setObservacao(dados.observacao() == null || dados.observacao().isBlank()
                ? null : dados.observacao().trim());
    }

    private DespesaDtos.Resposta paraResposta(Despesa d) {
        return new DespesaDtos.Resposta(
                d.getId(), d.getData(), d.getDescricao(), d.getCategoria(), d.getValor(), d.getObservacao());
    }
}
