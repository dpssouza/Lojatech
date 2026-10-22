# LojaTech — Laboratório de Docker e AWS EC2

## Segurança e uso fora do laboratório

Este projeto é educacional e não deve ser considerado pronto para produção sem uma revisão
da infraestrutura e testes no ambiente de destino.

- Nunca publique `.env`, chaves privadas, tokens ou credenciais. Use `.env.example` apenas com valores fictícios.
- O servidor exige `DB_USER` e `DB_PASSWORD`; não há usuário ou senha padrão no backend.
- A API aplica limite de requisições e limite de tamanho do JSON.
- Em produção, publique por HTTPS com proxy reverso ou balanceador configurado corretamente.
- Restrinja SSH ao IP administrativo e não exponha a porta 5432 do PostgreSQL.
- O Compose ainda publica a porta 3000 do host para facilitar o laboratório. Em produção, remova essa publicação se a aplicação estiver atrás de um proxy na mesma rede Docker.
- As imagens `node` e `postgres` usam tags de versão, não digests imutáveis. Revise e atualize as imagens regularmente.
- O rate limit por IP depende da configuração de proxy. Defina `TRUST_PROXY=true` somente quando a aplicação estiver atrás de exatamente um proxy confiável; ajuste o número de saltos para sua infraestrutura.
- A senha em `.env` deve ser forte, exclusiva e rotacionada se já foi compartilhada ou utilizada fora do laboratório.
- O script `db/init.sql` só inicializa um volume PostgreSQL vazio; alterações nele não migram automaticamente um banco existente.

### Atualização de uma instalação que já possui volume PostgreSQL

Os scripts em `/docker-entrypoint-initdb.d` são executados somente quando o volume do banco é criado pela primeira vez. Se você já executava uma versão anterior do LojaTech, não apague o volume para aplicar esta alteração.

1. Faça backup do banco.
2. Defina `DB_ADMIN_USER` e `DB_ADMIN_PASSWORD` com as credenciais administrativas que já funcionam no volume existente.
3. Defina `DB_USER=lojatech_app` e uma nova senha forte em `DB_PASSWORD`.
4. Crie o usuário restrito e aplique as permissões do arquivo `db/create-app-user.sql` conectando-se ao banco como administrador. Ao executar manualmente, substitua `:app_user`, `:app_password` e `:db_name` pelos valores reais usando uma ferramenta segura; não publique a senha em comandos compartilhados ou histórico de terminal.
5. Só então recrie o serviço da aplicação com `docker compose up -d --build app`.

Em uma instalação nova, o script `02-create-app-user.sh` cria o usuário da aplicação automaticamente. Em um volume antigo, o usuário administrativo original pode continuar sendo superusuário; não o remova nem altere suas permissões sem testar e fazer backup.

### Instalação

Copie `.env.example` para `.env`, substitua `DB_PASSWORD` por um segredo forte e execute:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Não envie o `.env` para o GitHub. Para atualizar a aplicação, preserve o volume de dados e faça backup antes de qualquer operação destrutiva.


Bem-vindo(a) ao **LojaTech**! Neste projeto, você vai aprender a executar uma aplicação web, entender como ela se conecta a um banco de dados e publicar o projeto em uma máquina virtual na nuvem.

O laboratório foi organizado em etapas. Faça uma de cada vez, execute os comandos na ordem indicada e confira os resultados antes de avançar.

> **Importante:** este é um projeto educacional. Ele não está preparado para uso em produção: não possui autenticação administrativa, pagamento, HTTPS automático nem todas as proteções de segurança necessárias. Use somente dados fictícios.

## O que você vai aprender

Ao concluir o laboratório, você terá praticado:

- **Git e GitHub:** baixar o projeto e publicar o código.
- **VS Code:** abrir e editar os arquivos.
- **Docker e Docker Compose:** executar a aplicação e o banco de dados em contêineres.
- **PostgreSQL:** armazenar produtos e pedidos.
- **SSH:** conectar-se remotamente a uma máquina Linux.
- **AWS EC2:** criar uma máquina virtual e disponibilizar a aplicação para teste.

## O que a aplicação faz?

O LojaTech é uma pequena loja virtual didática. Ela:

- apresenta produtos armazenados no PostgreSQL;
- permite adicionar produtos ao carrinho;
- registra pedidos com nome e e-mail do cliente;
- valida produtos, quantidades e estoque no backend;
- disponibiliza o endereço de verificação `GET /api/health`.

## Como as peças trabalham juntas?

| Peça | Para que serve |
| --- | --- |
| Navegador | Exibe a loja para o usuário. |
| Frontend (HTML, CSS e JavaScript) | Cuida da interface da loja. |
| Backend (Node.js + Express) | Recebe requisições e aplica as regras da aplicação. |
| PostgreSQL | Armazena produtos e pedidos. |
| Docker | Executa cada serviço em um contêiner. |
| Docker Compose | Inicia e organiza a aplicação e o banco de dados. |
| AWS EC2 | Hospeda o laboratório em uma máquina virtual na nuvem. |

## Escolha seu ambiente

Você pode executar o projeto de duas formas:

1. **Modo local — recomendado para começar:** executar no seu computador com Docker Desktop (Windows/macOS) ou Docker Engine (Linux).
2. **Modo nuvem — etapa seguinte:** publicar a aplicação em uma instância Ubuntu na AWS EC2.

> **Sugestão para a aula:** primeiro faça o projeto funcionar localmente. Só depois passe para a EC2. Assim, fica mais fácil descobrir se um problema está na aplicação ou na configuração da nuvem.

## Sumário

- [1. Pré-requisitos](#1-pré-requisitos)
- [2. Baixar o projeto e abrir no VS Code](#2-baixar-o-projeto-e-abrir-no-vs-code)
- [3. Configurar o arquivo de ambiente](#3-configurar-o-arquivo-de-ambiente)
- [4. Executar localmente com Docker Compose](#4-executar-localmente-com-docker-compose)
- [5. Publicar o código no GitHub](#5-publicar-o-código-no-github)
- [6. Criar a instância EC2](#6-criar-a-instância-ec2)
- [7. Conectar à EC2 por SSH](#7-conectar-à-ec2-por-ssh)
- [8. Instalar o Docker na EC2](#8-instalar-o-docker-na-ec2)
- [9. Executar a aplicação na EC2](#9-executar-a-aplicação-na-ec2)
- [10. Atualizar a aplicação na EC2](#10-atualizar-a-aplicação-na-ec2)
- [11. Resolver problemas comuns](#11-resolver-problemas-comuns)
- [12. Limpar os recursos ao terminar](#12-limpar-os-recursos-ao-terminar)
- [Estrutura dos arquivos](#estrutura-dos-arquivos)
- [Desafios para continuar aprendendo](#desafios-para-continuar-aprendendo)

---

## 1. Pré-requisitos

Antes de começar, confira se você tem:

| Ferramenta | Por que precisamos dela? |
| --- | --- |
| Git | Para baixar e enviar o código. |
| Visual Studio Code | Para visualizar e editar os arquivos. |
| Docker | Para executar a aplicação e o banco em contêineres. |
| Conta AWS | Necessária somente para a etapa de nuvem. |

### No Windows

1. Instale o **Git** e o **Visual Studio Code**.
2. Instale o **Docker Desktop**.
3. Abra o Docker Desktop e espere até que ele indique que está em execução.
4. Abra um terminal no VS Code e confira as versões.

No Linux, você precisará do Docker Engine e do plugin Docker Compose. No macOS, pode usar o Docker Desktop.

Execute:

```bash
git --version
docker --version
docker compose version
```

**O que deve acontecer?** Cada comando deve mostrar a versão instalada. Se algum comando não for reconhecido, confira a instalação antes de continuar.

## 2. Baixar o projeto e abrir no VS Code

Abra um terminal. Escolha a pasta do computador em que deseja guardar o projeto e execute:

```bash
git clone <URL-DO-SEU-REPOSITORIO>
cd lojatech
code .
```

Substitua `<URL-DO-SEU-REPOSITORIO>` pelo endereço real do repositório no GitHub.

**O que cada comando faz?**

- `git clone`: baixa uma cópia do repositório.
- `cd lojatech`: entra na pasta do projeto.
- `code .`: abre a pasta atual no VS Code.

> Se o comando `code .` não funcionar, abra o VS Code manualmente e escolha **Arquivo → Abrir Pasta**. Se você ainda não publicou o projeto no GitHub, use a pasta do projeto que recebeu do professor.

## 3. Configurar o arquivo de ambiente

O projeto usa um arquivo chamado `.env` para guardar configurações, como a senha do banco. O arquivo `.env.example` é um modelo que pode ser compartilhado; o `.env` contém os valores usados no seu ambiente.

### Criar o arquivo `.env`

**Linux/macOS ou terminal Bash:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

### Definir a senha do banco

1. Abra a pasta do projeto no VS Code.
2. Abra o arquivo `.env`.
3. Localize `DB_PASSWORD`.
4. Troque o valor por uma senha forte para o laboratório.
5. Salve o arquivo.

Use a mesma senha configurada no `.env` durante a primeira inicialização do banco. Não compartilhe essa senha.

> **Segurança:** nunca envie o arquivo `.env` ao GitHub. O projeto deve ignorá-lo pelo `.gitignore`. Para conferir, execute:
>
> ```bash
> git check-ignore -v .env
> ```
>
> Se o comando mostrar uma regra, o arquivo está sendo ignorado pelo Git. O `.env.example` pode ser publicado, desde que não contenha segredos reais.

## 4. Executar localmente com Docker Compose

Nesta etapa, vamos iniciar a aplicação e o PostgreSQL no seu computador.

### Passo 1 — Iniciar os serviços

No terminal, dentro da pasta `lojatech`, execute:

```bash
docker compose up -d --build
```

Entenda o comando:

- `docker compose`: usa as configurações do arquivo `docker-compose.yml`.
- `up`: cria e inicia os serviços.
- `-d`: deixa os contêineres executando em segundo plano.
- `--build`: constrói a imagem da aplicação antes de iniciá-la.

Na primeira execução, o Docker pode precisar baixar imagens e construir a aplicação. Aguarde a conclusão.

### Passo 2 — Conferir os contêineres

```bash
docker compose ps
```

Confira se os serviços aparecem em execução. Se algum serviço não estiver funcionando, consulte os logs:

```bash
docker compose logs -f app
```

Esse comando acompanha as mensagens da aplicação em tempo real. Para sair da visualização dos logs, pressione `Ctrl+C`. Isso **não** encerra os contêineres.

### Passo 3 — Abrir a loja

No navegador, acesse:

**http://localhost:3000**

Se a página abrir, a aplicação está respondendo no seu computador.

### Passo 4 — Testar a API

Execute no terminal:

```bash
curl http://localhost:3000/api/health
```

Esse endereço verifica se a aplicação responde. No PowerShell, se `curl` apresentar comportamento inesperado, use:

```powershell
curl.exe http://localhost:3000/api/health
```

### Encerrar os serviços

Quando terminar de trabalhar, execute:

```bash
docker compose down
```

Esse comando remove os contêineres do projeto, mas normalmente preserva o volume de dados do banco.

> **Atenção: apagar os dados.** O comando a seguir remove também os volumes associados ao projeto e, portanto, apaga os dados locais de teste:
>
> ```bash
> docker compose down -v
> ```
>
> Use-o somente se quiser recomeçar o laboratório com o banco vazio. O script `db/init.sql` é executado quando o PostgreSQL inicializa um volume vazio. Se você alterar esse script depois da primeira inicialização, será necessário recriar o volume para que as alterações sejam aplicadas.

## 5. Publicar o código no GitHub

Se o projeto ainda não estiver em um repositório GitHub, siga esta etapa. Se ele já estiver publicado e você o clonou, pule para a seção 6.

### Passo 1 — Criar o repositório

No GitHub, crie um repositório **vazio** para o LojaTech. Para este procedimento, não inicialize o repositório com README, licença ou `.gitignore`, pois esses arquivos já podem existir no projeto local.

### Passo 2 — Enviar o projeto

No terminal, dentro da pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Cria aplicação LojaTech"
git branch -M main
git remote add origin <URL-DO-SEU-REPOSITORIO>
git push -u origin main
```

Troque `<URL-DO-SEU-REPOSITORIO>` pela URL do repositório que você criou.

**O que esses comandos fazem?**

- `git init`: prepara a pasta para usar Git.
- `git add .`: seleciona os arquivos para o próximo registro.
- `git commit`: registra uma versão do projeto.
- `git branch -M main`: define o nome da branch principal como `main`.
- `git remote add origin`: associa o projeto local ao repositório remoto.
- `git push`: envia os commits para o GitHub.

Se o Git informar que já existe um repositório remoto chamado `origin`, não repita esse comando sem antes conferir a configuração com `git remote -v`.

### Passo 3 — Conferir o GitHub

Abra o repositório no navegador e confirme:

- [ ] Os diretórios `db/`, `src/` e `public/` estão presentes.
- [ ] Os arquivos `Dockerfile`, `docker-compose.yml` e `README.md` estão presentes.
- [ ] O arquivo `.env.example` está presente.
- [ ] O arquivo `.env` **não** foi enviado.

## 6. Criar a instância EC2

Agora vamos preparar uma máquina virtual na AWS para executar o mesmo projeto fora do seu computador.

> **Atenção aos custos:** recursos da AWS podem gerar cobranças, incluindo instâncias, discos e endereços IPv4 públicos. Confira os preços e remova os recursos quando terminar a aula.

### Passo 1 — Criar a instância

No console da AWS:

1. Acesse o serviço **EC2**.
2. Inicie a criação de uma instância.
3. Escolha uma imagem **Ubuntu LTS**.
4. Selecione um tipo de instância adequado ao laboratório e às condições da sua conta.
5. Crie ou selecione um par de chaves para SSH.
6. Baixe e guarde a chave privada `.pem` em local seguro. Ela permite acesso à máquina: não a compartilhe nem a envie ao GitHub.

Os nomes das opções podem mudar conforme a versão do console.

### Passo 2 — Configurar o Security Group

O Security Group funciona como um firewall virtual da instância. Para este laboratório:

| Porta | Protocolo | Finalidade | Origem recomendada |
| --- | --- | --- | --- |
| 22 | TCP | Conexão SSH | Seu IP atual |
| 3000 | TCP | Acesso à aplicação durante o teste | Seu IP atual |

Não libere a porta **5432** do PostgreSQL para a internet.

### Passo 3 — Garantir o acesso público

Para acessar a instância pela internet, confira:

- a instância está no estado `running`;
- existe um endereço IPv4 público associado à instância;
- a subnet tem uma rota `0.0.0.0/0` apontando para um Internet Gateway;
- o Security Group permite a porta necessária a partir do seu IP atual.

Criar um Internet Gateway, sozinho, não atribui um IP público à instância. A associação de IP público e a rota da subnet também precisam estar configuradas.

> Se seu IP residencial mudar, as regras do Security Group limitadas ao IP antigo deixarão de permitir a conexão. Atualize a origem para seu IP atual, em vez de liberar o acesso para qualquer endereço.

## 7. Conectar à EC2 por SSH

SSH é o protocolo que permite abrir um terminal remoto na máquina Ubuntu.

No computador local, abra um terminal e execute o comando abaixo, substituindo o caminho da chave e o IP público pelos valores corretos:

```bash
ssh -i "caminho/para/sua-chave.pem" ubuntu@IP_PUBLICO_DA_EC2
```

Exemplo de formato: `ubuntu@203.0.113.10`. O endereço acima é apenas ilustrativo; use o IP real da sua instância.

No Linux/macOS, se o SSH reclamar das permissões da chave, execute:

```bash
chmod 400 caminho/para/sua-chave.pem
```

Na primeira conexão, pode aparecer uma pergunta para confirmar a identidade do servidor. Se você estiver certo de que está conectando à sua instância, digite `yes`.

**Como saber se conectou?** O terminal passará a executar comandos na máquina Ubuntu remota. Os comandos das próximas seções devem ser executados dentro dessa sessão SSH, salvo quando indicado o contrário.

## 8. Instalar o Docker na EC2

Os comandos desta seção são executados **dentro da EC2**, depois de conectar por SSH.

### Passo 1 — Atualizar a lista de pacotes

```bash
sudo apt update
```

O comando atualiza a lista de pacotes disponíveis nos repositórios configurados.

### Passo 2 — Instalar dependências básicas

```bash
sudo apt install -y ca-certificates curl git
```

Essas ferramentas serão utilizadas para acessar repositórios e baixar o código.

### Passo 3 — Instalar o Docker pelo repositório oficial

Siga as instruções atualizadas da documentação oficial para Ubuntu:

<https://docs.docker.com/engine/install/ubuntu/>

A documentação oficial é a referência para configurar o repositório, instalar o Docker Engine e instalar o plugin Docker Compose. Siga os passos correspondentes à versão do Ubuntu da sua instância.

### Passo 4 — Validar a instalação

```bash
sudo docker --version
sudo docker compose version
sudo docker run --rm hello-world
```

O último comando baixa e executa uma imagem de teste. Se aparecer uma mensagem de sucesso do Docker, a instalação básica está funcionando.

Nos próximos comandos deste README, usamos `sudo docker` para evitar configurar permissões adicionais no usuário da máquina.

## 9. Executar a aplicação na EC2

Agora vamos baixar o código e iniciar a aplicação na nuvem.

### Passo 1 — Baixar o repositório

Na sessão SSH da EC2:

```bash
git clone <URL-DO-SEU-REPOSITORIO>
cd lojatech
```

Substitua a URL pelo endereço do seu repositório GitHub.

### Passo 2 — Criar e editar o `.env`

```bash
cp .env.example .env
nano .env
```

No editor `nano`, altere `DB_PASSWORD` para uma senha forte. Para salvar, pressione `Ctrl+O`, depois `Enter`. Para sair, pressione `Ctrl+X`.

Não reutilize uma senha pessoal e não compartilhe o arquivo `.env`.

### Passo 3 — Construir e iniciar os contêineres

```bash
sudo docker compose up -d --build
```

Aguarde o comando terminar. Em seguida, confira o estado dos serviços:

```bash
sudo docker compose ps
```

Se precisar investigar algum problema, consulte os logs:

```bash
sudo docker compose logs -f app
```

Para sair dos logs, pressione `Ctrl+C`; os serviços continuam em execução.

### Passo 4 — Testar dentro da EC2

```bash
curl http://localhost:3000/api/health
```

Se a aplicação responder, ela está acessível localmente dentro da instância.

### Passo 5 — Acessar pelo navegador do seu computador

Abra:

`http://IP_PUBLICO_DA_EC2:3000`

Substitua `IP_PUBLICO_DA_EC2` pelo IPv4 público real da instância.

Se não abrir, não exponha o banco de dados. Consulte a seção [11. Resolver problemas comuns](#11-resolver-problemas-comuns) e verifique principalmente o IP público, a rota da subnet, o Security Group e o estado dos contêineres.

## 10. Atualizar a aplicação na EC2

Quando você alterar o código e enviar as mudanças ao GitHub, será necessário atualizar a cópia que está na EC2.

Conecte-se por SSH e execute:

```bash
cd lojatech
git pull
sudo docker compose up -d --build
sudo docker compose ps
```

**Por que reconstruir?** O comando `git pull` baixa as mudanças do repositório. O comando `docker compose up -d --build` reconstrói a imagem da aplicação quando necessário e recria/inicia os serviços conforme a configuração do Compose.

## 11. Resolver problemas comuns

Antes de mudar configurações, identifique em qual etapa o problema acontece. Estes comandos ajudam a investigar.

### Comandos de diagnóstico

Execute na pasta do projeto. Na EC2, acrescente `sudo` antes de `docker`:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 db
docker image ls
docker container ls -a
```

Para verificar portas em escuta no Linux/EC2:

```bash
sudo ss -lntp
```

### Problemas frequentes

| Sintoma | O que verificar |
| --- | --- |
| `docker: command not found` | O Docker está instalado? No Windows/macOS, o Docker Desktop está aberto e totalmente iniciado? |
| Erro ao conectar ao Docker daemon | O serviço do Docker está ativo? No Windows/macOS, aguarde a inicialização do Docker Desktop. |
| Porta 3000 já está em uso | Outro programa pode estar usando a porta. Confira os contêineres e os processos antes de parar qualquer serviço. |
| A página não abre na EC2 | Confira o IP público, o estado da instância, a rota da subnet, a regra TCP 3000 do Security Group e se os contêineres estão em execução. |
| SSH expira (`timeout`) | Confira o IP público, a rota da subnet e se a porta TCP 22 permite seu IP atual. |
| `Permission denied (publickey)` | Confira o caminho da chave `.pem`, o usuário `ubuntu` e as permissões da chave. |
| Alterei `db/init.sql`, mas nada mudou | O script de inicialização só é executado quando o banco inicializa um volume vazio. Recriar o volume apaga os dados de teste. |
| A aplicação não conecta ao banco | Consulte os logs do banco e confira se `DB_PASSWORD` corresponde à configuração usada na inicialização do banco. |

Se precisar recriar o banco local do zero, lembre-se de que o comando abaixo apaga os dados armazenados no volume:

```bash
docker compose down -v
```

> **Não tente resolver falhas abrindo a porta 5432 para a internet.** Mantenha o PostgreSQL sem exposição pública.

## 12. Limpar os recursos ao terminar

Esta etapa é importante para evitar custos desnecessários na AWS.

### Passo 1 — Remover os contêineres do projeto

Dentro da EC2, entre na pasta do projeto e execute:

```bash
cd lojatech
sudo docker compose down
```

Isso remove os contêineres do projeto, mas não encerra a instância EC2 nem elimina todos os recursos da AWS.

### Passo 2 — Encerrar a instância

No console da AWS, **encerre (terminate)** a instância quando não precisar mais dela. Apenas parar a instância não elimina todas as cobranças possíveis, pois recursos como discos podem continuar existindo.

### Passo 3 — Conferir recursos restantes

No console AWS, confira se ficaram recursos que você criou durante o laboratório:

- [ ] Volumes EBS que não são mais necessários.
- [ ] Snapshots.
- [ ] Elastic IPs alocados.
- [ ] Outras instâncias ou recursos criados durante a aula.

Apagar os contêineres não exclui automaticamente os recursos da sua conta AWS. Antes de remover qualquer recurso, confira se ele realmente pertence ao laboratório e não está sendo usado por outra atividade.

---

## Estrutura dos arquivos

```text
lojatech/
├── db/
│   └── init.sql             # Script inicial do banco de dados
├── public/
│   ├── app.js               # JavaScript da interface
│   ├── index.html           # Página principal
│   └── styles.css           # Estilos da loja
├── src/
│   └── server.js            # Servidor Node.js/Express
├── .env.example             # Modelo das variáveis de ambiente
├── .gitignore               # Arquivos que o Git deve ignorar
├── Dockerfile               # Instruções para construir a imagem
├── docker-compose.yml       # Configuração dos serviços
├── package.json             # Dependências e scripts Node.js
└── README.md                # Este guia
```

## Desafios para continuar aprendendo

Depois que o laboratório estiver funcionando, você pode avançar aos poucos:

1. Criar um endpoint para consultar um pedido pelo ID.
2. Criar um painel administrativo protegido para cadastrar produtos.
3. Adicionar testes automatizados.
4. Distribuir a imagem usando Docker Hub ou Amazon ECR.
5. Configurar HTTPS com domínio e proxy reverso.
6. Automatizar o deploy com GitHub Actions — depois de entender o processo manual.

## Checklist final do laboratório

Antes de encerrar, confira o que você conseguiu fazer:

- [ ] Baixei o projeto e abri no VS Code.
- [ ] Criei o arquivo `.env` sem publicá-lo no GitHub.
- [ ] Iniciei a aplicação e o PostgreSQL com Docker Compose.
- [ ] Acessei `http://localhost:3000`.
- [ ] Testei o endpoint `/api/health`.
- [ ] Publiquei o código no GitHub (quando aplicável).
- [ ] Conectei à EC2 por SSH.
- [ ] Instalei e testei o Docker na EC2.
- [ ] Acessei a aplicação pela EC2.
- [ ] Conferi e limpei os recursos da AWS ao terminar.
