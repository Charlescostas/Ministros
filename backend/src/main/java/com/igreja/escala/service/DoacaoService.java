package com.igreja.escala.service;

import com.igreja.escala.dto.DoacaoDtos;
import com.igreja.escala.entity.Doacao;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.DoacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DoacaoService {

    private final DoacaoRepository doacoes;

    public DoacaoService(DoacaoRepository doacoes) {
        this.doacoes = doacoes;
    }

    @Transactional(readOnly = true)
    public List<DoacaoDtos.Resposta> listar(LocalDate de, LocalDate ate) {
        List<Doacao> lista = (de != null && ate != null)
                ? doacoes.findByDataBetweenOrderByDataDescIdDesc(de, ate)
                : doacoes.findAllByOrderByIdDesc();
        return lista.stream().map(this::paraResposta).toList();
    }

    @Transactional(readOnly = true)
    public DoacaoDtos.Resposta buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public DoacaoDtos.Resposta salvar(DoacaoDtos.Dados dados) {
        Doacao d = new Doacao();
        aplicar(d, dados);
        doacoes.save(d);
        return paraResposta(d);
    }

    @Transactional
    public DoacaoDtos.Resposta atualizar(Long id, DoacaoDtos.Dados dados) {
        Doacao d = carregar(id);
        aplicar(d, dados);
        doacoes.save(d);
        return paraResposta(d);
    }

    @Transactional
    public void remover(Long id) {
        doacoes.delete(carregar(id));
    }

    private Doacao carregar(Long id) {
        return doacoes.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Doacao nao encontrada"));
    }

    private void aplicar(Doacao d, DoacaoDtos.Dados dados) {
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

    private DoacaoDtos.Resposta paraResposta(Doacao d) {
        return new DoacaoDtos.Resposta(
                d.getId(), d.getData(), d.getDescricao(), d.getCategoria(), d.getValor(), d.getObservacao());
    }
}
