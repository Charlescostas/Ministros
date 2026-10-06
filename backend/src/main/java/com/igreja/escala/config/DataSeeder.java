package com.igreja.escala.config;

import com.igreja.escala.entity.Equipe;
import com.igreja.escala.entity.Funcao;
import com.igreja.escala.entity.Missa;
import com.igreja.escala.entity.Ministro;
import com.igreja.escala.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Carga inicial: funcoes da missa e (opcional) dados de demonstracao.
 * Só executa quando as tabelas estao vazias.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final FuncaoRepository funcoes;
    private final MinistroRepository ministros;
    private final EquipeRepository equipes;
    private final MissaRepository missas;

    @Value("${app.seed.demo:true}")
    private boolean demo;

    public DataSeeder(FuncaoRepository funcoes, MinistroRepository ministros,
                      EquipeRepository equipes, MissaRepository missas) {
        this.funcoes = funcoes;
        this.ministros = ministros;
        this.equipes = equipes;
        this.missas = missas;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (funcoes.count() == 0) {
            funcoes.saveAll(List.of(
                    novaFuncao("Liturgista", 1, 1),
                    novaFuncao("Leitor", 2, 1),
                    novaFuncao("Ministro da Comunhao", 3, 3),
                    novaFuncao("Musico", 4, 1),
                    novaFuncao("Acolito", 5, 1)));
            log.info("Funcoes da missa criadas.");
        }

        if (demo && ministros.count() == 0 && equipes.count() == 0 && missas.count() == 0) {
            criarDadosDeDemonstracao();
        }
    }

    private Funcao novaFuncao(String nome, int ordem, int quantidade) {
        Funcao f = new Funcao();
        f.setNome(nome);
        f.setOrdem(ordem);
        f.setQuantidade(quantidade);
        f.setAtiva(true);
        return f;
    }

    private void criarDadosDeDemonstracao() {
        List<Ministro> base = List.of(
                novoMinistro("Ana Souza", "(11) 99999-0001", "Liturgista"),
                novoMinistro("Carlos Lima", "(11) 99999-0002", "Leitor"),
                novoMinistro("Mariana Oliveira", "(11) 99999-0003", "Ministro da Comunhao"),
                novoMinistro("Paulo Santos", "(11) 99999-0004", "Leitor"),
                novoMinistro("Fernanda Costa", "(11) 99999-0005", "Ministro da Comunhao"),
                novoMinistro("Jose Pereira", "(11) 99999-0006", "Musico"),
                novoMinistro("Lucia Martins", "(11) 99999-0007", "Ministro da Comunhao"),
                novoMinistro("Rafael Almeida", "(11) 99999-0008", "Acolito"),
                novoMinistro("Beatriz Rocha", "(11) 99999-0009", "Liturgista"),
                novoMinistro("Marcos Teixeira", "(11) 99999-0010", "Leitor"),
                novoMinistro("Juliana Ramos", "(11) 99999-0011", "Ministro da Comunhao"),
                novoMinistro("Thiago Barbosa", "(11) 99999-0012", "Musico"),
                novoMinistro("Patricia Nunes", "(11) 99999-0013", "Ministro da Comunhao"),
                novoMinistro("Diego Cardoso", "(11) 99999-0014", "Acolito"),
                novoMinistro("Renata Freitas", "(11) 99999-0015", "Ministro da Comunhao"),
                novoMinistro("Bruno Cunha", "(11) 99999-0016", "Liturgista"));
        ministros.saveAll(base);

        Equipe manha = novaEquipe("Equipe Domingo Manha",
                "Celebra das 8h - 1o domingo de cada mes", base.subList(0, 8));
        manha.setNumero(1);
        Equipe noite = novaEquipe("Equipe Domingo Noite",
                "Celebra das 18h", base.subList(8, 16));
        noite.setNumero(2);
        equipes.saveAll(List.of(manha, noite));

        List<Missa> novas = new ArrayList<>();
        for (YearMonth periodo : List.of(YearMonth.now(), YearMonth.now().plusMonths(1))) {
            LocalDate domingo = primeiroDomingo(periodo);
            while (domingo.getMonth() == periodo.getMonth()) {
                novas.add(novaMissa(domingo, LocalTime.of(8, 0),
                        "Domingo - " + periodo.getMonth().getValue() + "/" + periodo.getYear(), manha));
                novas.add(novaMissa(domingo, LocalTime.of(18, 0),
                        "Domingo - " + periodo.getMonth().getValue() + "/" + periodo.getYear(), noite));
                domingo = domingo.plusWeeks(1);
            }
        }
        missas.saveAll(novas);
        log.info("Dados de demonstracao criados ({} ministros, 2 equipes, {} missas).",
                base.size(), novas.size());
    }

    private LocalDate primeiroDomingo(YearMonth periodo) {
        LocalDate dia = periodo.atDay(1);
        while (dia.getDayOfWeek() != DayOfWeek.SUNDAY) dia = dia.plusDays(1);
        return dia;
    }

    private Ministro novoMinistro(String nome, String telefone, String funcaoPreferida) {
        Ministro m = new Ministro();
        m.setNome(nome);
        m.setTelefone(telefone);
        m.setFuncaoPreferida(funcaoPreferida);
        m.setAtivo(true);
        return m;
    }

    private Equipe novaEquipe(String nome, String descricao, List<Ministro> membros) {
        Equipe e = new Equipe();
        e.setNome(nome);
        e.setDescricao(descricao);
        e.setAtiva(true);
        e.getMinistros().addAll(membros);
        return e;
    }

    private Missa novaMissa(LocalDate data, LocalTime hora, String titulo, Equipe equipe) {
        Missa m = new Missa();
        m.setData(data);
        m.setHora(hora);
        m.setTitulo(titulo);
        m.setLocal("Paroquia");
        m.setEquipe(equipe);
        return m;
    }
}
