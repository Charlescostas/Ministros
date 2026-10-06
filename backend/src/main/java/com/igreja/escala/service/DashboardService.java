package com.igreja.escala.service;

import com.igreja.escala.dto.DashboardDtos;
import com.igreja.escala.dto.MissaDtos;
import com.igreja.escala.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DashboardService {

    private final MinistroRepository ministros;
    private final EquipeRepository equipes;
    private final MissaRepository missas;
    private final EscalaRepository escalas;

    public DashboardService(MinistroRepository ministros, EquipeRepository equipes,
                            MissaRepository missas, EscalaRepository escalas) {
        this.ministros = ministros;
        this.equipes = equipes;
        this.missas = missas;
        this.escalas = escalas;
    }

    @Transactional(readOnly = true)
    public DashboardDtos.Resumo resumo() {
        YearMonth atual = YearMonth.now();
        String mes = atual.toString();
        LocalDate hoje = LocalDate.now();

        Set<Long> comEscala = new HashSet<>(escalas.missasComEscala());
        List<MissaDtos.Resposta> proximas = missas.findByDataGreaterThanEqualOrderByDataAscHoraAsc(hoje)
                .stream()
                .limit(5)
                .map(m -> new MissaDtos.Resposta(
                        m.getId(), m.getData(), m.getHora(), m.getTitulo(), m.getCelebrante(), m.getLocal(),
                        m.getEquipe() == null ? null : m.getEquipe().getId(),
                        m.getEquipe() == null ? null : m.getEquipe().getNome(),
                        m.getObservacoes(), comEscala.contains(m.getId()), m.isDestaque()))
                .toList();

        long missasNoMes = missas.countByDataBetween(atual.atDay(1), atual.atEndOfMonth());
        long escalasNoMes = escalas.countByMes(mes);

        return new DashboardDtos.Resumo(
                ministros.countByAtivoTrue(),
                equipes.countByAtivaTrue(),
                missasNoMes,
                escalasNoMes,
                escalasNoMes > 0,
                proximas,
                mes);
    }
}
