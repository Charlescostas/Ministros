package com.igreja.escala.service;

import com.igreja.escala.dto.EscalaDtos;
import com.igreja.escala.entity.*;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.*;

/**
 * Regras da escala mensal: geracao automatica com distribuicao justa,
 * consulta, troca pontual e limpeza.
 *
 * Critérios de escolha do ministro (nesta ordem):
 * 1. menor quantidade de servicos no mes (justica);
 * 2. preferencia pessoal de funcao quando ha empate;
 * 3. quem nao exerceu a mesma funcao na missa anterior (variedade);
 * 4. sorteio entre os restantes.
 */
@Service
public class EscalaService {

    private final EscalaRepository escalas;
    private final MissaRepository missas;
    private final EquipeRepository equipes;
    private final MinistroRepository ministros;
    private final FuncaoRepository funcoes;

    private final Random sorteio = new Random();

    public EscalaService(EscalaRepository escalas, MissaRepository missas, EquipeRepository equipes,
                         MinistroRepository ministros, FuncaoRepository funcoes) {
        this.escalas = escalas;
        this.missas = missas;
        this.equipes = equipes;
        this.ministros = ministros;
        this.funcoes = funcoes;
    }

    @Transactional(readOnly = true)
    public List<EscalaDtos.Resposta> listar(String mes, Long equipeId) {
        validarMes(mes);
        List<Escala> lista = (equipeId == null)
                ? escalas.findByMesOrderByMissaDataAscMissaHoraAscFuncaoOrdemAscSequenciaAsc(mes)
                : escalas.findByMesAndEquipeIdOrderByMissaDataAscMissaHoraAscFuncaoOrdemAscSequenciaAsc(mes, equipeId);
        return lista.stream().map(this::paraResposta).toList();
    }

    /**
     * Gera a escala de um mes para uma equipe a partir das missas ja cadastradas.
     */
    @Transactional
    public List<EscalaDtos.Resposta> gerar(EscalaDtos.GerarRequest req) {
        String mes = validarMes(req.mes());
        Equipe equipe = equipes.findById(req.equipeId())
                .orElseThrow(() -> ApiException.naoEncontrado("Equipe nao encontrada"));
        if (!equipe.isAtiva()) throw ApiException.regra("Nao e possivel gerar escala de uma equipe inativa");

        YearMonth periodo = YearMonth.parse(mes);
        List<Missa> missasDoMes = missas.findByDataBetweenAndEquipeIdOrderByDataAscHoraAsc(
                periodo.atDay(1), periodo.atEndOfMonth(), equipe.getId());
        if (missasDoMes.isEmpty()) {
            throw ApiException.regra("Nenhuma missa cadastrada para a equipe '" + equipe.getNome()
                    + "' em " + mes + ". Cadastre as missas antes de gerar a escala.");
        }

        List<Ministro> disponiveis = equipe.getMinistros().stream().filter(Ministro::isAtivo).toList();
        if (disponiveis.isEmpty()) {
            throw ApiException.regra("A equipe '" + equipe.getNome() + "' nao possui ministros ativos.");
        }

        List<Funcao> funcoesAtivas = funcoes.findByAtivaTrueOrderByOrdemAsc();
        if (funcoesAtivas.isEmpty()) {
            throw ApiException.regra("Nenhuma funcao ativa cadastrada. Configure as funcoes antes.");
        }

        boolean jaExiste = escalas.countByMesAndEquipeId(mes, equipe.getId()) > 0;
        if (jaExiste && !Boolean.TRUE.equals(req.substituir())) {
            throw ApiException.conflito("Ja existe escala gerada para esta equipe em " + mes
                    + ". Marque 'Substituir escala existente' para gerar novamente.");
        }
        if (jaExiste) {
            escalas.apagarPorMesEquipe(mes, equipe.getId());
        }

        // carga atual de cada ministro no mes (inclui escala de outras equipes)
        Map<Long, Integer> carga = new HashMap<>();
        escalas.contarPorMes(mes)
                .forEach(linha -> carga.put((Long) linha[0], ((Number) linha[1]).intValue()));

        Map<Long, Set<Long>> feitoNaMissaAnterior = new HashMap<>();
        List<Escala> novas = new ArrayList<>();

        for (Missa missa : missasDoMes) {
            Set<Long> jaEscaladoNaMissa = new HashSet<>();
            Map<Long, Set<Long>> porFuncaoNaMissa = new HashMap<>();

            for (Funcao funcao : funcoesAtivas) {
                Set<Long> naAnterior = feitoNaMissaAnterior.getOrDefault(funcao.getId(), Set.of());
                Set<Long> escolhidos = new LinkedHashSet<>();

                for (int sequencia = 1; sequencia <= funcao.getQuantidade(); sequencia++) {
                    Ministro escolhido = escolher(disponiveis, carga, funcao, jaEscaladoNaMissa, naAnterior);
                    carga.merge(escolhido.getId(), 1, Integer::sum);
                    jaEscaladoNaMissa.add(escolhido.getId());
                    escolhidos.add(escolhido.getId());

                    Escala item = new Escala();
                    item.setMes(mes);
                    item.setMissa(missa);
                    item.setMinistro(escolhido);
                    item.setFuncao(funcao);
                    item.setEquipe(equipe);
                    item.setSequencia(sequencia);
                    novas.add(item);
                }
                porFuncaoNaMissa.put(funcao.getId(), escolhidos);
            }
            feitoNaMissaAnterior.putAll(porFuncaoNaMissa);
        }

        escalas.saveAll(novas);
        return listar(mes, equipe.getId());
    }

    /** Troca o ministro de um item da escala. */
    @Transactional
    public EscalaDtos.Resposta atualizar(Long id, EscalaDtos.AtualizarRequest req) {
        Escala item = escalas.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Item de escala nao encontrado"));
        Ministro novo = ministros.findById(req.ministroId())
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro nao encontrado"));
        if (!novo.isAtivo()) throw ApiException.regra("Nao e possivel escalar um ministro inativo");

        boolean repetidoNaMissa = escalas.findByMissaId(item.getMissa().getId()).stream()
                .anyMatch(e -> !e.getId().equals(id) && e.getMinistro().getId().equals(novo.getId()));
        if (repetidoNaMissa) {
            throw ApiException.conflito(novo.getNome() + " ja esta escalado nesta missa");
        }

        item.setMinistro(novo);
        if (req.observacao() != null && !req.observacao().isBlank()) {
            item.setObservacao(req.observacao().trim());
        }
        escalas.save(item);
        return paraResposta(item);
    }

    @Transactional
    public void remover(Long id) {
        Escala item = escalas.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Item de escala nao encontrado"));
        escalas.delete(item);
    }

    @Transactional
    public void limpar(String mes, Long equipeId) {
        validarMes(mes);
        if (equipeId == null) throw ApiException.regra("Selecione a equipe");
        escalas.apagarPorMesEquipe(mes, equipeId);
    }

    /**
     * Escolhe o ministro com menor carga no mes, respeitando preferencia,
     * variedade entre missas e, por fim, sorteio.
     */
    private Ministro escolher(List<Ministro> disponiveis, Map<Long, Integer> carga, Funcao funcao,
                              Set<Long> jaEscaladoNaMissa, Set<Long> feitoNaAnterior) {
        List<Ministro> livres = disponiveis.stream()
                .filter(m -> !jaEscaladoNaMissa.contains(m.getId()))
                .toList();
        // se a equipe for menor que o numero de vagas, permite repetir na mesma missa
        List<Ministro> candidatos = livres.isEmpty() ? disponiveis : livres;

        int menorCarga = candidatos.stream()
                .mapToInt(m -> carga.getOrDefault(m.getId(), 0))
                .min().orElse(0);

        List<Ministro> empatados = candidatos.stream()
                .filter(m -> carga.getOrDefault(m.getId(), 0) == menorCarga)
                .toList();

        List<Ministro> preferidos = empatados.stream()
                .filter(m -> mesmaFuncao(m.getFuncaoPreferida(), funcao.getNome()))
                .toList();
        if (!preferidos.isEmpty()) empatados = preferidos;

        List<Ministro> variados = empatados.stream()
                .filter(m -> !feitoNaAnterior.contains(m.getId()))
                .toList();
        if (!variados.isEmpty()) empatados = variados;

        return empatados.get(sorteio.nextInt(empatados.size()));
    }

    private boolean mesmaFuncao(String preferida, String funcao) {
        if (preferida == null || preferida.isBlank() || funcao == null) return false;
        return preferida.trim().equalsIgnoreCase(funcao.trim());
    }

    private String validarMes(String mes) {
        if (mes == null || !mes.matches("\\d{4}-(0[1-9]|1[0-2])")) {
            throw ApiException.regra("Mes invalido. Use o formato AAAA-MM (ex.: 2026-10)");
        }
        return mes;
    }

    private EscalaDtos.Resposta paraResposta(Escala e) {
        Missa m = e.getMissa();
        return new EscalaDtos.Resposta(
                e.getId(), e.getMes(), m.getId(), m.getData(), m.getHora(), m.getTitulo(), m.getLocal(),
                e.getEquipe().getId(), e.getEquipe().getNome(),
                e.getMinistro().getId(), e.getMinistro().getNome(), e.getMinistro().getTelefone(),
                e.getFuncao().getId(), e.getFuncao().getNome(), e.getSequencia(), e.getObservacao());
    }
}
