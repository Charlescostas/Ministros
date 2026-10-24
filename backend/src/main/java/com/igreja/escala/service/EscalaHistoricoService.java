package com.igreja.escala.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.igreja.escala.dto.EscalaHistoricoDtos;
import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.EscalaHistorico;
import com.igreja.escala.entity.Ministro;
import com.igreja.escala.entity.Missa;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EscalaHistoricoRepository;
import com.igreja.escala.repository.MissaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Guarda e consulta as fotografias da escala gerada.
 *
 * A fotografia e gravada automaticamente ao final de cada geracao de equipes
 * (ver EscalaEquipeService) e traz o que a escala era AQUELE momento: os
 * membros de cada equipe, as missas do mes com a equipe de cada uma e a
 * quantidade de missas por dia da semana. Nada referencia as tabelas vivas,
 * entao o registro continua correto mesmo que depois a equipe mude de membros
 * ou as missas do mes sejam alteradas.
 */
@Service
public class EscalaHistoricoService {

    /** Indices = DayOfWeek do Java (1 = segunda ... 7 = domingo). */
    private static final String[] DIAS = {
            null, "Segunda-feira", "Terça-feira", "Quarta-feira",
            "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"};

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final EscalaHistoricoRepository historicos;
    private final MissaRepository missas;
    private final ObjectMapper json;

    public EscalaHistoricoService(EscalaHistoricoRepository historicos, MissaRepository missas,
                                  ObjectMapper json) {
        this.historicos = historicos;
        this.missas = missas;
        this.json = json;
    }

    /**
     * Grava a fotografia da escala recem-gerada: membros de cada equipe, a
     * equipe de cada missa e as missas por dia da semana. Retorna o id do
     * registro.
     */
    @Transactional
    public Long registrar(String mes, List<Missa> missasDoMes, Collection<Equipe> equipesDaEscala) {
        List<EscalaHistoricoDtos.EquipeSnapshot> equipes = new ArrayList<>();
        int totalMembros = 0;

        List<Equipe> ordenadas = new ArrayList<>(equipesDaEscala);
        ordenadas.sort(Comparator
                .comparing((Equipe e) -> e.getNumero() == null ? Integer.MAX_VALUE : e.getNumero())
                .thenComparing(Equipe::getNome));

        for (Equipe e : ordenadas) {
            List<Ministro> membros = new ArrayList<>(e.getMinistros());
            membros.sort(Comparator.comparing(Ministro::getNome));

            List<EscalaHistoricoDtos.MembroSnapshot> snapshot = new ArrayList<>();
            for (Ministro m : membros) {
                snapshot.add(new EscalaHistoricoDtos.MembroSnapshot(
                        m.getId(), m.getNome(), m.getTelefone(), m.getSexo(),
                        e.getCoordenador() != null && e.getCoordenador().getId().equals(m.getId())));
            }
            totalMembros += snapshot.size();
            equipes.add(new EscalaHistoricoDtos.EquipeSnapshot(
                    e.getId(), e.getNome(), e.getNumero(), snapshot));
        }

        EscalaHistorico h = new EscalaHistorico();
        h.setMes(mes);
        h.setTotalMissas(missasDoMes.size());
        h.setTotalEquipes(equipes.size());
        h.setTotalMembros(totalMembros);
        h.setEquipes(escrever(equipes));
        h.setMissas(escrever(missasSnapshot(missasDoMes)));
        h.setMissasPorDiaSemana(escrever(missasPorDiaSemana(missasDoMes)));
        historicos.save(h);
        return h.getId();
    }

    /** Lista os registros (mais recentes primeiro), opcionalmente so de um mes. */
    @Transactional(readOnly = true)
    public List<EscalaHistoricoDtos.Resumo> listar(String mes) {
        List<EscalaHistorico> lista = (mes == null || mes.isBlank())
                ? historicos.findAllByOrderByMesDescCriadoEmDesc()
                : historicos.findByMesOrderByCriadoEmDesc(mes);
        List<EscalaHistoricoDtos.Resumo> resumos = new ArrayList<>();
        for (EscalaHistorico h : lista) {
            resumos.add(new EscalaHistoricoDtos.Resumo(
                    h.getId(), h.getMes(), h.getCriadoEm(), h.getTotalMissas(),
                    h.getTotalEquipes(), h.getTotalMembros()));
        }
        return resumos;
    }

    /** Fotografia completa de um registro: missas, membros e dias da semana. */
    @Transactional(readOnly = true)
    public EscalaHistoricoDtos.Resposta buscar(Long id) {
        EscalaHistorico h = historicos.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Registro de historico nao encontrado."));
        return paraResposta(h);
    }

    /**
     * Atribuicoes (equipe + missa) dos meses ANTERIORES ao mes alvo, usadas
     * pela geracao para equilibrar os horarios. Para cada mes considerado vale
     * o REGISTRO MAIS RECENTE (regenerar o mes nao duplica a contagem); meses
     * sem registro usam as missas vivas, como antes do historico existir.
     */
    @Transactional(readOnly = true)
    public List<EscalaHistoricoDtos.Atribuicao> atribuicoesAnteriores(String mesAlvo) {
        List<EscalaHistoricoDtos.Atribuicao> lista = new ArrayList<>();
        Set<String> mesesComRegistro = new LinkedHashSet<>();

        // registros do mes mais recente para o mais antigo: o primeiro de cada mes vale
        Map<String, EscalaHistorico> ultimoPorMes = new LinkedHashMap<>();
        for (EscalaHistorico h : historicos.findAllByOrderByMesDescCriadoEmDesc()) {
            if (h.getMes().compareTo(mesAlvo) >= 0) continue;
            ultimoPorMes.putIfAbsent(h.getMes(), h);
        }

        for (EscalaHistorico h : ultimoPorMes.values()) {
            List<EscalaHistoricoDtos.MissaSnapshot> doMes = lerMissas(h);
            if (doMes.isEmpty()) continue; // registro antigo (sem missas): usa as missas vivas
            mesesComRegistro.add(h.getMes());
            for (EscalaHistoricoDtos.MissaSnapshot m : doMes) {
                if (m.equipeId() != null && m.data() != null && m.hora() != null) {
                    lista.add(new EscalaHistoricoDtos.Atribuicao(m.equipeId(), m.data(), m.hora()));
                }
            }
        }

        // meses anteriores sem registro: missas vivas ja com equipe atribuida
        LocalDate inicioAlvo = LocalDate.parse(mesAlvo + "-01");
        for (Missa m : missas.buscarComEquipeAntesDe(inicioAlvo)) {
            String mesDaMissa = m.getData().toString().substring(0, 7);
            if (mesesComRegistro.contains(mesDaMissa)) continue;
            lista.add(new EscalaHistoricoDtos.Atribuicao(m.getEquipe().getId(), m.getData(), m.getHora()));
        }
        return lista;
    }

    private EscalaHistoricoDtos.Resposta paraResposta(EscalaHistorico h) {
        return new EscalaHistoricoDtos.Resposta(
                h.getId(), h.getMes(), h.getCriadoEm(), h.getTotalMissas(),
                ler(h.getMissasPorDiaSemana(), new TypeReference<List<EscalaHistoricoDtos.DiaSemanaQtd>>() {}),
                lerMissas(h),
                ler(h.getEquipes(), new TypeReference<List<EscalaHistoricoDtos.EquipeSnapshot>>() {}));
    }

    private List<EscalaHistoricoDtos.MissaSnapshot> lerMissas(EscalaHistorico h) {
        if (h.getMissas() == null || h.getMissas().isBlank()) return List.of();
        return ler(h.getMissas(), new TypeReference<List<EscalaHistoricoDtos.MissaSnapshot>>() {});
    }

    /** Cada missa do mes e a equipe que a cobria no momento da geracao. */
    private List<EscalaHistoricoDtos.MissaSnapshot> missasSnapshot(List<Missa> missasDoMes) {
        List<Missa> ordenadas = new ArrayList<>(missasDoMes);
        ordenadas.sort(Comparator.comparing(Missa::getData).thenComparing(Missa::getHora));

        List<EscalaHistoricoDtos.MissaSnapshot> snapshot = new ArrayList<>();
        for (Missa m : ordenadas) {
            Equipe e = m.getEquipe();
            snapshot.add(new EscalaHistoricoDtos.MissaSnapshot(
                    m.getId(), m.getData(), m.getHora(), m.getTitulo(), m.getObservacoes(),
                    m.isDestaque(),
                    e == null ? null : e.getId(),
                    e == null ? null : e.getNome(),
                    e == null ? null : e.getNumero()));
        }
        return snapshot;
    }

    /** Missas do mes agrupadas por dia da semana, na ordem do calendario. */
    private List<EscalaHistoricoDtos.DiaSemanaQtd> missasPorDiaSemana(List<Missa> missasDoMes) {
        Map<Integer, List<String>> porDia = new TreeMap<>();
        for (Missa m : missasDoMes) {
            porDia.computeIfAbsent(diaDaSemana(m), k -> new ArrayList<>())
                    .add(HORA.format(m.getHora()));
        }

        List<EscalaHistoricoDtos.DiaSemanaQtd> dias = new ArrayList<>();
        for (Map.Entry<Integer, List<String>> ent : porDia.entrySet()) {
            List<String> horarios = ent.getValue();
            Collections.sort(horarios);
            dias.add(new EscalaHistoricoDtos.DiaSemanaQtd(
                    DIAS[ent.getKey()], horarios.size(), horarios));
        }
        return dias;
    }

    private int diaDaSemana(Missa m) {
        return m.getData().getDayOfWeek().getValue();
    }

    private String escrever(Object valor) {
        try {
            return json.writeValueAsString(valor);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Falha ao gravar o historico da escala", ex);
        }
    }

    private <T> T ler(String texto, TypeReference<T> tipo) {
        try {
            return json.readValue(texto, tipo);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Historico da escala gravado em formato invalido", ex);
        }
    }
}
