package com.igreja.escala.service;

import com.igreja.escala.dto.MinistroDtos;
import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.Ministro;
import com.igreja.escala.exception.ApiException;
import com.igreja.escala.repository.EquipeRepository;
import com.igreja.escala.repository.EscalaRepository;
import com.igreja.escala.repository.MensalidadeRepository;
import com.igreja.escala.repository.MinistroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MinistroService {

    private final MinistroRepository ministros;
    private final EquipeRepository equipes;
    private final EscalaRepository escalas;
    private final MensalidadeRepository mensalidades;

    public MinistroService(MinistroRepository ministros, EquipeRepository equipes, EscalaRepository escalas,
                           MensalidadeRepository mensalidades) {
        this.ministros = ministros;
        this.equipes = equipes;
        this.escalas = escalas;
        this.mensalidades = mensalidades;
    }

    @Transactional(readOnly = true)
    public List<MinistroDtos.Resposta> listar(String busca) {
        Map<Long, Long> contagem = contagemDeEscalas();
        List<Ministro> lista = (busca == null || busca.isBlank())
                ? ministros.findAllByOrderByNomeAsc()
                : ministros.buscar(busca.trim());
        return lista.stream().map(m -> paraResposta(m, contagem)).toList();
    }

    @Transactional(readOnly = true)
    public MinistroDtos.Resposta buscar(Long id) {
        Ministro m = carregar(id);
        return paraResposta(m, contagemDeEscalas());
    }

    @Transactional
    public MinistroDtos.Resposta salvar(MinistroDtos.Dados dados) {
        Ministro m = new Ministro();
        aplicar(m, dados);
        ministros.save(m);
        return paraResposta(m, Map.of());
    }

    @Transactional
    public MinistroDtos.Resposta atualizar(Long id, MinistroDtos.Dados dados) {
        Ministro m = carregar(id);
        aplicar(m, dados);
        ministros.save(m);
        return paraResposta(m, contagemDeEscalas());
    }

    @Transactional
    public void remover(Long id) {
        Ministro m = carregar(id);
        long total = escalas.contarPorMinistro(id);
        if (total > 0) {
            throw ApiException.conflito("Nao e possivel excluir: o ministro possui " + total + " item(ns) de escala.");
        }
        long totalMensalidades = mensalidades.countByMinistroId(id);
        if (totalMensalidades > 0) {
            throw ApiException.conflito(
                    "Nao e possivel excluir: o ministro possui " + totalMensalidades + " mensalidade(s) lancada(s).");
        }
        for (Equipe e : equipes.findAll()) {
            boolean alterada = e.getMinistros().removeIf(x -> x.getId().equals(id));
            // o ministro nao pode continuar como coordenador de equipe
            if (e.getCoordenador() != null && e.getCoordenador().getId().equals(id)) {
                e.setCoordenador(null);
                alterada = true;
            }
            if (alterada) {
                equipes.save(e);
            }
        }
        ministros.delete(m);
    }

    private Ministro carregar(Long id) {
        return ministros.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro nao encontrado"));
    }

    private void aplicar(Ministro m, MinistroDtos.Dados dados) {
        if (dados.nome() == null || dados.nome().isBlank()) {
            throw ApiException.regra("Nome e obrigatorio");
        }
        m.setNome(dados.nome().trim());
        m.setTelefone(dados.telefone());
        m.setEmail(dados.email());
        // "Funcao preferida" saiu do formulario: o valor ja cadastrado e mantido
        // (continua valendo como criterio de desempate na geracao da escala).
        if (dados.funcaoPreferida() != null) {
            m.setFuncaoPreferida(dados.funcaoPreferida().trim());
        }
        m.setSexo(normalizarSexo(dados.sexo()));
        m.setDataNascimento(dados.dataNascimento());
        m.setAtivo(dados.ativo() == null || dados.ativo());
        m.setObservacoes(dados.observacoes());
    }

    /** Aceita "Feminino"/"Masculino" (ou "F"/"M") e devolve o rotulo padrao. */
    private String normalizarSexo(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String v = valor.trim();
        if (v.equalsIgnoreCase("F") || v.equalsIgnoreCase("Feminino")) return "Feminino";
        if (v.equalsIgnoreCase("M") || v.equalsIgnoreCase("Masculino")) return "Masculino";
        throw ApiException.regra("Sexo deve ser Feminino ou Masculino");
    }

    private Map<Long, Long> contagemDeEscalas() {
        Map<Long, Long> mapa = new HashMap<>();
        ministros.contarEscalasPorMinistro()
                .forEach(linha -> mapa.put((Long) linha[0], ((Number) linha[1]).longValue()));
        return mapa;
    }

    private MinistroDtos.Resposta paraResposta(Ministro m, Map<Long, Long> contagem) {
        return new MinistroDtos.Resposta(
                m.getId(), m.getNome(), m.getTelefone(), m.getEmail(), m.getFuncaoPreferida(),
                m.getSexo(), m.getDataNascimento(),
                m.isAtivo(), m.getObservacoes(), contagem.getOrDefault(m.getId(), 0L));
    }
}
