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

import java.text.Normalizer;
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
        ministros.save(m); // precisa do id para espelhar o casamento no outro lado
        espelharCasamento(m, null);
        ministros.save(m);
        return paraResposta(m, Map.of());
    }

    @Transactional
    public MinistroDtos.Resposta atualizar(Long id, MinistroDtos.Dados dados) {
        Ministro m = carregar(id);
        Long conjugeAntes = m.getConjuge() != null ? m.getConjuge().getId() : null;
        aplicar(m, dados);
        ministros.save(m);
        espelharCasamento(m, conjugeAntes);
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
        // quem era conjuge deste ministro fica sem casamento (senao a exclusao
        // esbarra na chave estrangeira de conjuge_id)
        for (Ministro outro : ministros.findByConjugeId(id)) {
            outro.setConjuge(null);
            if ("Casado(a)".equals(outro.getEstadoCivil())) outro.setEstadoCivil("Solteiro(a)");
            ministros.save(outro);
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
        String estadoCivil = normalizarEstadoCivil(dados.estadoCivil());
        m.setEstadoCivil(estadoCivil);
        m.setConjuge(resolverConjuge(m, estadoCivil, dados.conjugeId()));
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

    /**
     * O casamento e registrado dos dois lados: o conjuge passa a apontar de volta
     * para o ministro (e tambem a constar como casado(a)), e um casamento anterior
     * e desfeito. `conjugeAntes` e o conjuge que o ministro tinha antes desta
     * alteracao.
     */
    private void espelharCasamento(Ministro m, Long conjugeAntes) {
        if (conjugeAntes != null
                && (m.getConjuge() == null || !conjugeAntes.equals(m.getConjuge().getId()))) {
            ministros.findById(conjugeAntes)
                    .filter(x -> x.getConjuge() != null && x.getConjuge().getId().equals(m.getId()))
                    .ifPresent(x -> {
                        x.setConjuge(null);
                        // ficou sem casal: se estava como casado(a), volta a solteiro(a)
                        if ("Casado(a)".equals(x.getEstadoCivil())) x.setEstadoCivil("Solteiro(a)");
                        ministros.save(x);
                    });
        }
        Ministro atual = m.getConjuge();
        if (atual == null) return;
        boolean apontaDeVolta = atual.getConjuge() != null && atual.getConjuge().getId().equals(m.getId());
        if (!apontaDeVolta) {
            atual.setConjuge(m);
        }
        // o outro lado tambem passa a constar como casado(a)
        if (!"Casado(a)".equals(atual.getEstadoCivil())) {
            atual.setEstadoCivil("Casado(a)");
        }
        ministros.save(atual);
    }

    /** Estados civis aceitos no cadastro. */
    private static final List<String> ESTADOS_CIVIS =
            List.of("Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável");

    /** Estado civil do cadastro: devolve o rotulo padrao (aceita com ou sem acento). */
    private String normalizarEstadoCivil(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String chave = semAcentos(valor.trim()).toLowerCase();
        for (String opcao : ESTADOS_CIVIS) {
            if (semAcentos(opcao).toLowerCase().equals(chave)) return opcao;
        }
        throw ApiException.regra("Estado civil invalido. Use: " + String.join(", ", ESTADOS_CIVIS));
    }

    private static String semAcentos(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    /**
     * Conjuge escolhido no formulario: so casado(a) tem conjuge, e nao pode ser o
     * proprio ministro nem alguem que ja e casado com outra pessoa.
     */
    private Ministro resolverConjuge(Ministro m, String estadoCivil, Long conjugeId) {
        if (!"Casado(a)".equals(estadoCivil) || conjugeId == null) return null;
        if (conjugeId.equals(m.getId())) {
            throw ApiException.regra("O ministro nao pode ser casado consigo mesmo");
        }
        Ministro c = ministros.findById(conjugeId)
                .orElseThrow(() -> ApiException.naoEncontrado("Ministro conjuge nao encontrado"));
        if (c.getConjuge() != null && !c.getConjuge().getId().equals(m.getId())) {
            throw ApiException.conflito(c.getNome() + " ja e casado(a) com " + c.getConjuge().getNome()
                    + ". Desfaca esse casamento antes de vincular outro.");
        }
        return c;
    }

    private Map<Long, Long> contagemDeEscalas() {
        Map<Long, Long> mapa = new HashMap<>();
        ministros.contarEscalasPorMinistro()
                .forEach(linha -> mapa.put((Long) linha[0], ((Number) linha[1]).longValue()));
        return mapa;
    }

    private MinistroDtos.Resposta paraResposta(Ministro m, Map<Long, Long> contagem) {
        Ministro conjuge = m.getConjuge();
        return new MinistroDtos.Resposta(
                m.getId(), m.getNome(), m.getTelefone(), m.getEmail(), m.getFuncaoPreferida(),
                m.getSexo(), m.getDataNascimento(),
                m.getEstadoCivil(),
                conjuge != null ? conjuge.getId() : null,
                conjuge != null ? conjuge.getNome() : null,
                m.isAtivo(), m.getObservacoes(), contagem.getOrDefault(m.getId(), 0L));
    }
}
