package com.igreja.escala.service;

import com.igreja.escala.dto.MensalidadeDtos;
import com.igreja.escala.entity.Mensalidade;
import com.igreja.escala.entity.Ministro;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.MensalidadeRepository;
import com.igreja.escala.repository.MinistroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class MensalidadeService {

    private final MensalidadeRepository mensalidades;
    private final MinistroRepository ministros;

    public MensalidadeService(MensalidadeRepository mensalidades, MinistroRepository ministros) {
        this.mensalidades = mensalidades;
        this.ministros = ministros;
    }

    /**
     * Lista por periodo. {@code de}/{@code ate} filtram pela <b>data de recebimento</b>;
     * {@code competenciaDe}/{@code competenciaAte} filtram pela <b>competencia</b>
     * (AAAA-MM) e, quando presentes, tem prioridade.
     */
    @Transactional(readOnly = true)
    public List<MensalidadeDtos.Resposta> listar(LocalDate de, LocalDate ate, Long ministroId,
                                                  String competenciaDe, String competenciaAte) {
        List<Mensalidade> lista;
        if (!vazio(competenciaDe) || !vazio(competenciaAte)) {
            String cd = vazio(competenciaDe) ? "0000-01" : competenciaDe.trim();
            String ca = vazio(competenciaAte) ? "9999-12" : competenciaAte.trim();
            lista = ministroId != null
                    ? mensalidades.findByCompetenciaBetweenAndMinistroIdOrderByCompetenciaAscIdAsc(cd, ca, ministroId)
                    : mensalidades.findByCompetenciaBetweenOrderByCompetenciaAscIdAsc(cd, ca);
        } else if (de != null && ate != null) {
            lista = ministroId != null
                    ? mensalidades.findByDataRecebimentoBetweenAndMinistroIdOrderByDataRecebimentoDescIdDesc(de, ate, ministroId)
                    : mensalidades.findByDataRecebimentoBetweenOrderByDataRecebimentoDescIdDesc(de, ate);
        } else {
            lista = mensalidades.findAllByOrderByIdDesc();
        }
        return lista.stream().map(this::paraResposta).toList();
    }

    @Transactional(readOnly = true)
    public MensalidadeDtos.Resposta buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public MensalidadeDtos.Resposta salvar(MensalidadeDtos.Dados dados) {
        Mensalidade m = new Mensalidade();
        aplicar(m, dados);
        mensalidades.save(m);
        return paraResposta(m);
    }

    /**
     * Baixa varias mensalidades do mesmo ministro de uma vez: uma por competencia
     * do periodo (competenciaDe..competenciaAte, inclusive). Competencias que ja
     * existem para o ministro sao ignoradas (retornadas em {@code competenciasIgnoradas}).
     */
    @Transactional
    public MensalidadeDtos.LoteResposta salvarLote(MensalidadeDtos.Lote dados) {
        if (dados.ministroId() == null) {
            throw ApiException.regra("Ministro e obrigatorio");
        }
        // falha rapida: o ministro precisa existir antes de criar qualquer lancamento
        ministros.findById(dados.ministroId())
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro nao encontrado"));
        if (dados.valor() == null || dados.valor().signum() <= 0) {
            throw ApiException.regra("Valor deve ser maior que zero");
        }
        if (dados.dataRecebimento() == null) {
            throw ApiException.regra("Data de recebimento e obrigatoria");
        }

        YearMonth de = paraAnoMes(dados.competenciaDe(), "Competencia inicial invalida (use AAAA-MM)");
        YearMonth ate = paraAnoMes(dados.competenciaAte(), "Competencia final invalida (use AAAA-MM)");
        if (de.isAfter(ate)) {
            throw ApiException.regra("Competencia inicial deve ser anterior ou igual a final");
        }
        if (ChronoUnit.MONTHS.between(de, ate) + 1 > 36) {
            throw ApiException.regra("Periodo limitado a 36 meses por lancamento");
        }

        Set<String> existentes = new HashSet<>(mensalidades.competenciasDoMinistro(
                dados.ministroId(), de.toString(), ate.toString()));

        List<String> criadas = new ArrayList<>();
        List<String> ignoradas = new ArrayList<>();
        for (YearMonth ym = de; !ym.isAfter(ate); ym = ym.plusMonths(1)) {
            String competencia = ym.toString();
            if (existentes.contains(competencia)) {
                ignoradas.add(competencia);
                continue;
            }
            Mensalidade m = new Mensalidade();
            aplicar(m, new MensalidadeDtos.Dados(
                    dados.ministroId(), competencia, dados.valor(), dados.dataRecebimento(),
                    dados.formaPagamento(), dados.observacao()));
            mensalidades.save(m);
            criadas.add(competencia);
        }
        return new MensalidadeDtos.LoteResposta(criadas.size(), ignoradas.size(), criadas, ignoradas);
    }

    @Transactional
    public MensalidadeDtos.Resposta atualizar(Long id, MensalidadeDtos.Dados dados) {
        Mensalidade m = carregar(id);
        aplicar(m, dados);
        mensalidades.save(m);
        return paraResposta(m);
    }

    @Transactional
    public void remover(Long id) {
        mensalidades.delete(carregar(id));
    }

    private Mensalidade carregar(Long id) {
        return mensalidades.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Mensalidade nao encontrada"));
    }

    private void aplicar(Mensalidade m, MensalidadeDtos.Dados dados) {
        if (dados.ministroId() == null) {
            throw ApiException.regra("Ministro e obrigatorio");
        }
        Ministro ministro = ministros.findById(dados.ministroId())
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro nao encontrado"));
        if (dados.valor() == null || dados.valor().signum() <= 0) {
            throw ApiException.regra("Valor deve ser maior que zero");
        }
        if (dados.dataRecebimento() == null) {
            throw ApiException.regra("Data de recebimento e obrigatoria");
        }
        String competencia = dados.competencia() == null ? null : dados.competencia().trim();
        if (competencia == null || !competencia.matches("\\d{4}-\\d{2}")) {
            throw ApiException.regra("Competencia invalida (use AAAA-MM)");
        }
        m.setMinistro(ministro);
        m.setCompetencia(competencia);
        m.setValor(dados.valor());
        m.setDataRecebimento(dados.dataRecebimento());
        m.setFormaPagamento(vazio(dados.formaPagamento()) ? null : dados.formaPagamento().trim());
        m.setObservacao(vazio(dados.observacao()) ? null : dados.observacao().trim());
    }

    /** Converte "AAAA-MM" em YearMonth validando formato e mes (01-12). */
    private YearMonth paraAnoMes(String valor, String mensagem) {
        String v = valor == null ? null : valor.trim();
        if (v == null || !v.matches("\\d{4}-\\d{2}")) {
            throw ApiException.regra(mensagem);
        }
        try {
            return YearMonth.parse(v);
        } catch (DateTimeParseException e) {
            throw ApiException.regra(mensagem);
        }
    }

    private boolean vazio(String valor) {
        return valor == null || valor.isBlank();
    }

    private MensalidadeDtos.Resposta paraResposta(Mensalidade m) {
        Ministro ministro = m.getMinistro();
        return new MensalidadeDtos.Resposta(
                m.getId(),
                ministro.getId(),
                ministro.getNome(),
                m.getCompetencia(),
                m.getValor(),
                m.getDataRecebimento(),
                m.getFormaPagamento(),
                m.getObservacao());
    }
}
