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
* **Ministros** — cadastro completo (nome, telefone, e-mail, função preferida, observações,
  ativo/inativo), busca e total de serviços já cumpridos.
* **Equipes** — cadastro com membros (adicionar/remover por *chips* ou no formulário),
  ativa/inativa e **número da equipe** (`EQUIPE 1`, `EQUIPE 2`…) usado no documento impresso.
* **Missas** — cadastro por **data/hora**, título da celebração, celebrante, local,
  **equipe responsável**, **observação** (ex.: *Batizado*) e marcação de **destaque em vermelho**;
  navegação por mês, filtro por equipe e selo “escala gerada/pendente”.
* **Funções da missa** — liturgista, leitor, ministro da comunhão, músico, acólito…
  com **ordem de exibição** e **vagas por missa**.
* **Escala mensal** — geração automática por equipe e mês, troca manual de ministro linha a linha,
  remoção de item, limpeza da escala, painel com a carga de cada ministro e **impressão**.
* **Escala impressa** — documento mensal no **modelo do PDF** da paróquia (título do mês,
  cabeçalho da paróquia, tabela *Data | Dia da Semana | Horário | Equipe | Observação*,
  quadro de equipes com os integrantes, texto “Obs” e caixa “Missa dos Ministros”),
  com botão **Imprimir / Salvar em PDF** (papel A4).
* **Cabeçalho** — configuração dos textos do documento impresso (paróquia, título do grupo,
  “Obs”, caixa “Missa dos Ministros” e bloco de adendos, ex.: escala da Missa da Saúde).
* **Login simples** — token Bearer em memória (12 h), todas as rotas `/api` exigem autenticação.

### Como gerar a escala no modelo do PDF

1. Cadastre as **missas** do mês (data, horário, equipe, observação/evento).
2. Informe o **número** de cada equipe em *Equipes* (aparece como `EQUIPE 4`).
3. Ajuste o cabeçalho em *Cabeçalho* (nome da paróquia, texto “Obs”, caixa “Missa dos
   Ministros” e adendos).
4. Abra **Escala impressa**, escolha o mês e clique em **Imprimir / Salvar em PDF**.

### Regras da geração automática

Para cada missa do mês já vinculada à equipe, cada função ativa é preenchida na ordem
definida, escolhendo o ministro por:

1. **menor quantidade de serviços no mês** (distribuição justa);
2. **função preferida** do ministro, em caso de empate;
3. quem **não exerceu a mesma função na missa anterior** (variedade);
4. **sorteio** entre os restantes.

Já existindo escala, a geração exige a opção *substituir* (a API responde `409` caso contrário).
Ministros inativos e equipes inativas não recebem escala.

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
| GET/POST | `/api/equipes` | lista / cria |
| POST/DELETE | `/api/equipes/{id}/ministros/{ministroId}` | adiciona / remove membro |
| GET/POST | `/api/missas` | lista (`?de=&ate=&equipeId=&busca=`) / cria |
| GET/POST | `/api/funcoes` | funções da missa |
| GET | `/api/escalas?mes=AAAA-MM&equipeId=` | escala gerada |
| POST | `/api/escalas/gerar` | `{equipeId, mes, substituir}` → gera a escala |
| PUT/DELETE | `/api/escalas/{id}` | troca ministro / remove item |
| POST | `/api/escalas/limpar?mes=&equipeId=` | apaga a escala do mês |
| GET/PUT | `/api/configuracao` | textos do cabeçalho da escala impressa |

Todas as rotas exigem `Authorization: Bearer <token>` (exceto `/api/auth/login`).

Campos extras usados no documento impresso: `Equipe.numero` (número da equipe),
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
