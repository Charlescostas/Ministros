# Escala de Ministros da Comunhão

Aplicação completa para gerenciar a escala dos ministros da comunhão:
cadastro de **ministros**, **equipes** e **missas por data**, com geração
automática da **escala mensal por equipe**.

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite |
| Backend | Java 17+ / Spring Boot 3.5 (Web, JPA, Validation, Security) |
| Banco | PostgreSQL 16 (`escala_ministros`) |

---

## 1. Requisitos

* JDK 17 ou superior (testado com JDK 22 em `C:\Program Files\Java\jdk-22`)
* Node.js 18+ e npm
* PostgreSQL 16 rodando na porta `5432`

> **Dica (Windows):** se aparecer o erro `The JAVA_HOME environment variable is not
> defined correctly`, defina a variável de usuário:
> `setx JAVA_HOME "C:\Program Files\Java\jdk-22"` (e abra um novo terminal).

## 2. Banco de dados

Crie o banco (uma única vez):

```powershell
$env:PGPASSWORD='sua_senha'
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE escala_ministros;"
```

As credenciais usadas pela aplicação ficam em
`backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/escala_ministros
spring.datasource.username=postgres
spring.datasource.password=net.net6910
```

As tabelas são criadas automaticamente (`spring.jpa.hibernate.ddl-auto=update`).

## 3. Como rodar

### Backend (porta 8080)

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### Frontend (porta 5173)

```powershell
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173> e faça login:

| Usuário | Senha |
| --- | --- |
| `admin` | `admin123` |

> Troque em `backend/src/main/resources/application.properties`
> (`app.auth.username` / `app.auth.password`).

O Vite faz *proxy* de `/api` para `http://localhost:8080`, então não há problema de CORS.

### Um comando só (opcional)

```powershell
.\rodar-tudo.ps1
```

## 4. Funcionalidades

* **Painel** — resumo: ministros ativos, equipes, missas do mês, itens de escala e próximas missas.
* **Ministros** — cadastro completo (nome, telefone, e-mail, **sexo**, **data de nascimento**,
  observações, ativo/inativo), busca e total de serviços já cumpridos.
  O campo antigo *função preferida* saiu do formulário: o valor já cadastrado continua no banco
  e ainda vale como critério de desempate na geração da escala.
* **Equipes** — cadastro com membros (adicionar/remover por *chips* ou no formulário),
  **coordenador** (escolhido no formulário entre os membros e marcado com ★ no cartão),
  ativa/inativa e **número da equipe** (`EQUIPE 1`, `EQUIPE 2`…) usado no documento impresso.
  Na lista **Membros** só aparecem os ministros que **ainda não têm equipe** (mais os que já estão
  marcados nesta equipe, para poder desmarcar) — ministros de outras equipes ficam ocultos, com a
  contagem informada embaixo.
  Alterar a equipe **não apaga a escala já gerada**: os membros anteriores continuam nas linhas
  já criadas e aparecem sinalizados como *“fora da equipe · escala mantida”* na página *Escala*
  (quem sai também deixa de ser coordenador).
* **Missas** — cadastro por **data/hora**, título da celebração, celebrante, local,
  **equipe responsável**, **observação** (ex.: *Batizado*) e marcação de **destaque em vermelho**;
  navegação por mês, filtro por equipe e selo “escala gerada/pendente”.
  A página também tem o botão **Gerar equipes do mês**, que distribui as equipes
  automaticamente entre as missas do mês (regras abaixo), com resumo por equipe.
* **Financeiro** — **mensalidades recebidas dos ministros** (competência `AAAA-MM`, data do
  recebimento, valor, forma de pagamento e observação), **doações recebidas** (data,
  descrição/doador, categoria `Dízimo / Oferta / Campanha / Festa / Doação / Outro`,
  valor e observação) e **despesas realizadas** (data, descrição, categoria e valor),
  com navegação por mês, filtro por ministro, cartões de **mensalidades**, **doações**,
  **despesas** e **saldo do mês** e **fechamento do ano** mês a mês
  (mensalidades pela competência; doações e despesas pela data).
  O formulário **Nova mensalidade** tem o checkbox **“Baixar mais de uma mensalidade”**:
  marcado, o campo de competência vira período **De → Até** e é lançada **uma mensalidade
  por competência** do mesmo ministro (competências já lançadas são ignoradas e a quantidade
  aparece no botão antes de salvar).
  Excluir um ministro que já tem mensalidades é bloqueado.
* **Funções da missa** — liturgista, leitor, ministro da comunhão, músico, acólito…
  com **ordem de exibição** e **vagas por missa**.
* **Escala mensal** — **dashboard** no topo com a quantidade de missas do mês de cada equipe,
  com **uma coluna separada para cada horário** (dia da semana + hora, ex.: `Sábado 17:00`,
  `Domingo 19:30`): cada célula mostra quantas missas daquele horário a equipe cobre, com totais
  por equipe, total de missas em cada horário e cartões de resumo; geração automática por equipe
  e mês, troca manual de ministro linha a linha, remoção de item, limpeza da escala, painel com a
  carga de cada ministro e **impressão** (o dashboard é só de tela e não entra na impressão).
* **Escala impressa** — documento mensal no **modelo do PDF** da paróquia (título do mês,
  cabeçalho da paróquia, tabela *Data | Dia da Semana | Horário | Equipe | Observação*,
  quadro de equipes com os integrantes — o **coordenador aparece primeiro da linha**,
  em negrito, com **cor de fundo** e “(coordenador)” —, texto “Obs” e caixa “Missa dos Ministros”),
  com botão **Imprimir / Salvar em PDF** (papel A4).
* **Caixa impresso** — página `/caixa?mes=AAAA-MM`, aberta pelo botão **Imprimir caixa**
  do Financeiro, no mesmo modelo dos demais documentos da paróquia: título
  **“Caixa {Mês} {Ano}”**, navegação de mês, tabela de **entradas — mensalidades**,
  tabela de **entradas — doações**, tabela de **saídas — despesas**, resumo com
  **saldo em caixa** e linha de assinatura do **responsável pelo caixa**,
  com botão **Imprimir / Salvar em PDF** (papel A4).
* **Caixa anual impresso** — página `/caixa/anual?ano=AAAA`, aberta pelo botão **Caixa anual**:
  movimentação **mês a mês** (mensalidades, doações, despesas e saldo de cada mês), linha de
  **totais do ano**, resumo com saldo em caixa e assinatura — mensalidades agrupadas pela
  competência, doações e despesas pela data do lançamento; navegação de ano e impressão A4.
* **Mensalidades anuais impressas** — página `/mensalidades/anual?ano=AAAA`, aberta pelo botão
  **Mensalidades anual**: quadro (matriz) com **um ministro por linha** e os **12 meses** em
  colunas, total por ministro e por mês (ministros inativos marcados quando têm lançamento),
  impresso em **A4 paisagem** com o cabeçalho repetido em cada folha.
* **Cabeçalho** — configuração dos textos do documento impresso (paróquia, título do grupo,
  “Obs”, caixa “Missa dos Ministros” e bloco de adendos, ex.: escala da Missa da Saúde).
* **Login simples** — token Bearer em memória (12 h), todas as rotas `/api` exigem autenticação.

### Como gerar a escala no modelo do PDF

1. Cadastre as **missas** do mês (data, horário, título, observação/evento).
2. Em *Missas*, clique em **Gerar equipes do mês** — as equipes são distribuídas
   automaticamente (ou escolha a equipe missa a missa).
3. Informe o **número** de cada equipe em *Equipes* (aparece como `EQUIPE 4`).
4. Ajuste o cabeçalho em *Cabeçalho* (nome da paróquia, texto “Obs”, caixa “Missa dos
   Ministros” e adendos).
5. Abra **Escala impressa**, escolha o mês e clique em **Imprimir / Salvar em PDF**.

### Regras da geração de equipes (dia da semana)

O botão **Gerar equipes do mês** (página *Missas*) atribui uma equipe para cada missa do
mês, na ordem do calendário, sempre escolhendo a equipe com menor pontuação nesta ordem:

1. **menos atuações nesse mesmo dia da semana** (segunda, terça, quarta…) nos
   **meses anteriores** — o histórico completo é consultado;
2. **menos atuações nesse dia da semana** já no **mês atual**;
3. **menos missas no mês atual** (distribuição justa do mês);
4. **menor histórico geral**. Empate: menor **número** da equipe (depois, ordem alfabética).

Observações:

* A opção **“Substituir as equipes já cadastradas”** desliga ou religa a reescrita do mês;
  sem ela, as equipes já definidas são mantidas e só as missas “sem equipe” são preenchidas.
* Se todas as missas do mês já tiverem equipe e a opção estiver desligada, a API responde `409`.
* Participam da escala apenas equipes **ativas** (com membros, quando houver).
* O retorno traz o **resumo por equipe** (carga no mês e histórico por dia da semana),
  exibido na tela logo após a geração.

### Regras da geração da escala de ministros

Para cada missa do mês já vinculada à equipe, cada função ativa é preenchida na ordem
definida, escolhendo o ministro por:

1. **menor quantidade de serviços no mês** (distribuição justa);
2. **função preferida** do ministro (campo antigo — não é mais editado na tela, mas continua
   valendo para quem já tem o valor preenchido), em caso de empate;
3. quem **não exerceu a mesma função na missa anterior** (variedade);
4. **sorteio** entre os restantes.

Já existindo escala, a geração exige a opção *substituir* (a API responde `409` caso contrário).
Ministros inativos e equipes inativas não recebem escala.

As linhas já geradas são **preservadas quando a equipe muda**: adicionar ou remover membros
(não) mexe nos itens existentes — quem saiu da equipe continua na escala do mês, identificado
como *fora da equipe*, e volta a participar apenas nas próximas gerações.

## 5. Estrutura do projeto

```
Ministros/
├── backend/                  # Spring Boot (Maven Wrapper)
│   └── src/main/java/com/igreja/escala/
│       ├── config/           # SecurityConfig, DataSeeder
│       ├── controller/       # REST: ministros, equipes, missas, funcoes, escalas, dashboard, configuracao
│       ├── dto/              # registros de request/response
│       ├── entity/           # Ministro, Equipe, Missa, Funcao, Escala, Configuracao
│       ├── exception/        # tratamento global de erros
│       ├── repository/       # Spring Data JPA
│       ├── security/         # login, TokenService, TokenAuthFilter
│       └── service/          # regras de negocio (EscalaService = geracao)
├── frontend/                 # React + TypeScript + Vite
│   └── src/
│       ├── api/client.ts     # fetch com token Bearer e tratamento de erros
│       ├── components/       # Layout, Modal
│       ├── context/          # AuthContext (login/logout)
│       ├── pages/            # Login, Dashboard, Ministros, Equipes, Missas, Escala,
│       │                     # Impressao, Funcoes, Configuracoes
│       └── types.ts          # contratos compartilhados com a API
└── rodar-tudo.ps1            # sobe backend + frontend juntos
```

## 6. API (resumo)

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/login` | `{username,password}` → `{token,username}` |
| GET | `/api/dashboard/resumo` | números do painel |
| GET/POST | `/api/ministros` | lista (com `?busca=`) / cria |
| PUT/DELETE | `/api/ministros/{id}` | edita / exclui |
| GET/POST/PUT | `/api/equipes` | lista / cria / edita (aceita `coordenadorId`) |
| DELETE | `/api/equipes/{id}` | exclui (bloqueada se a equipe tiver escala gerada) |
| POST/DELETE | `/api/equipes/{id}/ministros/{ministroId}` | adiciona / remove membro **sem apagar a escala já gerada** |
| GET/POST | `/api/missas` | lista (`?de=&ate=&equipeId=&busca=`) / cria |
| GET/POST | `/api/funcoes` | funções da missa |
| GET | `/api/escalas?mes=AAAA-MM&equipeId=` | escala gerada |
| POST | `/api/escalas/gerar` | `{equipeId, mes, substituir}` → gera a escala |
| POST | `/api/escalas/equipes/gerar` | `{mes, substituir}` → distribui as **equipes** nas missas |
| PUT/DELETE | `/api/escalas/{id}` | troca ministro / remove item |
| POST | `/api/escalas/limpar?mes=&equipeId=` | apaga a escala do mês |
| GET/POST | `/api/mensalidades` | lista (`?de=&ate=&ministroId=&competenciaDe=&competenciaAte=`) / cria |
| POST | `/api/mensalidades/lote` | baixa em lote: `competenciaDe`…`competenciaAte` |
| PUT/DELETE | `/api/mensalidades/{id}` | edita / exclui |
| GET/POST | `/api/despesas` | lista (`?de=&ate=`) / cria |
| PUT/DELETE | `/api/despesas/{id}` | edita / exclui |
| GET/POST | `/api/doacoes` | lista (`?de=&ate=`) / cria |
| PUT/DELETE | `/api/doacoes/{id}` | edita / exclui |
| GET/PUT | `/api/configuracao` | textos do cabeçalho da escala impressa |

Todas as rotas exigem `Authorization: Bearer <token>` (exceto `/api/auth/login`).

Campos extras usados no documento impresso: `Equipe.numero` (número da equipe),
`Equipe.coordenadorId` / `coordenadorNome` (coordenador — precisa ser membro da equipe),
`Missa.observacoes` (coluna “Observação”) e `Missa.destaque` (linha em vermelho).

## 7. Dados de demonstração

Na primeira execução, se o banco estiver vazio, o `DataSeeder` cria:

* 5 funções da missa (com 3 vagas para “Ministro da Comunhao”);
* 16 ministros e 2 equipes (8 membros cada);
* missas de todos os domingos do mês atual e do próximo (08h e 18h).

Para começar do zero, altere `app.seed.demo=false` e apague as tabelas (ou o banco).

## 8. Próximos passos possíveis

* Indisponibilidade de ministros por data (justificativa/férias).
* Escala consolidada de todas as equipes e envio por WhatsApp/e-mail.
* Histórico de substituições e exportação em PDF.
* Multiusuário com perfis (coordenador / leitura).
