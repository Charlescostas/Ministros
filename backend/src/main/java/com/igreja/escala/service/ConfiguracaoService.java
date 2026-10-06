package com.igreja.escala.service;

import com.igreja.escala.dto.ConfiguracaoDtos;
import com.igreja.escala.entity.Configuracao;
import com.igreja.escala.repository.ConfiguracaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfiguracaoService {

    private final ConfiguracaoRepository configuracoes;

    public ConfiguracaoService(ConfiguracaoRepository configuracoes) {
        this.configuracoes = configuracoes;
    }

    @Transactional
    public ConfiguracaoDtos.Resposta obter() {
        return paraResposta(carregar());
    }

    @Transactional
    public ConfiguracaoDtos.Resposta salvar(ConfiguracaoDtos.Dados dados) {
        Configuracao c = carregar();
        c.setNomeParoquia(dados.nomeParoquia());
        c.setTituloGrupo(dados.tituloGrupo());
        c.setTextoObs(dados.textoObs());
        c.setTextoMissaMinistros(dados.textoMissaMinistros());
        c.setAdendos(dados.adendos());
        configuracoes.save(c);
        return paraResposta(c);
    }

    private Configuracao carregar() {
        return configuracoes.findById(Configuracao.ID_UNICO).orElseGet(() -> {
            Configuracao nova = new Configuracao();
            nova.setNomeParoquia("PARÓQUIA SANTA TERESINHA DO MENINO JESUS");
            nova.setTituloGrupo("MINISTROS EXTRAORDINÁRIOS DA SAGRADA COMUNHÃO EUCARÍSTICA");
            nova.setTextoObs("Obs: No dia escalado, favor chegar com a máxima antecedência, "
                    + "possível até 45 minutos antes, é ideal. Se for faltar, convidar outro para substituí-lo.");
            nova.setTextoMissaMinistros("");
            nova.setAdendos("");
            return configuracoes.save(nova);
        });
    }

    private ConfiguracaoDtos.Resposta paraResposta(Configuracao c) {
        return new ConfiguracaoDtos.Resposta(
                c.getNomeParoquia(), c.getTituloGrupo(), c.getTextoObs(),
                c.getTextoMissaMinistros(), c.getAdendos());
    }
}
