# LojaTech --- Laboratório de Docker e AWS EC2

Bem-vindo(a) ao **LojaTech**!

Neste laboratório, você vai aprender, passo a passo, a executar uma
aplicação web no seu computador e depois publicá-la em uma máquina
virtual na nuvem usando a AWS EC2.

Este guia foi escrito para quem está fazendo o primeiro deploy. Não pule
etapas: copie um comando, execute, confira o resultado e só então
avance.

> **Importante:** este é um projeto educacional. Não está preparado para
> uso em produção. Utilize apenas dados fictícios durante as atividades.

## Sumário

- [1. Entender o que vamos montar](#1-entender-o-que-vamos-montar)
- [2. Preparar o computador](#2-preparar-o-computador)
- [3. Baixar o projeto do GitHub](#3-baixar-o-projeto-do-github)
- [4. Configurar as senhas do banco](#4-configurar-as-senhas-do-banco)
- [5. Executar a aplicação no computador](#5-executar-a-aplicação-no-computador)
- [6. Criar uma máquina virtual na AWS EC2](#6-criar-uma-máquina-virtual-na-aws-ec2)
- [7. Conectar à EC2 por SSH](#7-conectar-à-ec2-por-ssh)
- [8. Instalar Docker na EC2](#8-instalar-docker-na-ec2)
- [9. Publicar a aplicação na EC2](#9-publicar-a-aplicação-na-ec2)
- [10. Atualizar a aplicação](#10-atualizar-a-aplicação)
- [11. Resolver problemas comuns](#11-resolver-problemas-comuns)
- [12. Configurar domínio e HTTPS](#12-configurar-domínio-e-https)
- [13. Encerrar o laboratório e evitar custos](#13-encerrar-o-laboratório-e-evitar-custos)
- [14. Entender os arquivos do projeto](#14-entender-os-arquivos-do-projeto)
- [Referências oficiais](#referências-oficiais)

------------------------------------------------------------------------

## 1. Entender o que vamos montar

O LojaTech é uma pequena loja virtual didática. Ela mostra produtos,
permite adicionar produtos ao carrinho e registra pedidos em um banco de
dados.

### As peças do projeto

| Peça | Explicação simples |
|---|---|
| Navegador | O programa usado para abrir sites, como Chrome. |
| Frontend | A parte visual da loja: botões, textos, produtos e carrinho. |
| Backend | A parte que recebe pedidos do navegador e aplica as regras. |
| Node.js | Permite executar JavaScript no servidor. |
| Express | Biblioteca usada pelo backend para criar rotas e responder a requisições. |
| PostgreSQL | O banco de dados que guarda produtos e pedidos. |
| Docker | Executa programas dentro de ambientes isolados chamados contêineres. |
| Docker Compose | Permite configurar e iniciar vários contêineres juntos. |
| Git | Registra alterações no código. |
| GitHub | Hospeda o repositório do projeto na internet. |
| SSH | Permite abrir um terminal remoto em outra máquina. |
| AWS EC2 | Serviço da AWS que fornece uma máquina virtual na nuvem. |
| IP público | Endereço usado para acessar a máquina pela internet. |
| Security Group | Firewall virtual que controla quais conexões podem chegar à EC2. |

### Como as peças conversam?

1.  O navegador solicita a página da loja.
2.  O backend executado com Node.js recebe as solicitações da aplicação.
3.  Quando precisa de produtos ou pedidos, o backend conversa com o
    PostgreSQL.
4.  Docker executa o backend e o banco em contêineres separados.
5.  Docker Compose configura como esses contêineres funcionam juntos.
6.  Na etapa de nuvem, a EC2 será a máquina que executará o projeto.

### O que significa "deploy"?

**Deploy** é colocar uma aplicação em um ambiente onde outras pessoas
possam acessá-la. Primeiro vamos executar o projeto no seu computador.
Depois vamos fazer a mesma aplicação funcionar em uma máquina virtual da
AWS.

------------------------------------------------------------------------

## 2. Preparar o computador

Você precisará de:

-   Git;
-   Visual Studio Code (VS Code);
-   Docker Desktop no Windows ou macOS; no Linux, Docker Engine e Docker
    Compose;
-   uma conexão com a internet.

### Windows: verificar as ferramentas

Abra o **PowerShell**. Você pode encontrá-lo pelo menu Iniciar do
Windows. Digite cada comando abaixo, um de cada vez.

``` powershell
git --version
```

**O que faz?** Mostra a versão do Git instalada. Git será usado para
baixar o projeto.

``` powershell
docker --version
```

**O que faz?** Mostra a versão do Docker. Se aparecer uma mensagem
dizendo que o comando não foi encontrado, instale o Docker Desktop.

``` powershell
docker compose version
```

**O que faz?** Verifica se o comando Docker Compose está disponível. Ele
será usado para iniciar a aplicação e o banco juntos.

Abra o Docker Desktop e espere até que esteja iniciado antes de executar
comandos Docker.

> Se algum comando não funcionar, resolva a instalação dessa ferramenta
> antes de continuar. Não adianta tentar iniciar contêineres se o Docker
> não estiver instalado e funcionando.

------------------------------------------------------------------------

## 3. Baixar o projeto do GitHub

Vamos baixar uma cópia do projeto para o seu computador.

### Passo 1 --- Abrir o terminal

Abra o PowerShell ou o terminal integrado do VS Code. Escolha a pasta em
que deseja guardar o projeto. O comando a seguir criará uma pasta
chamada `lojatech` dentro da pasta atual.

``` bash
git clone https://github.com/dpssouza/Lojatech.git lojatech
```

**Explicando o comando:**

-   `git`: executa o programa Git.
-   `clone`: significa copiar um repositório remoto para o computador.
-   `https://github.com/dpssouza/Lojatech.git`: endereço do repositório
    do projeto.
-   `lojatech`: nome da pasta local que será criada. O nome em
    minúsculas evita confusão com maiúsculas e minúsculas no Linux.

### Passo 2 --- Entrar na pasta do projeto

``` bash
cd lojatech
```

**O que faz?**

-   `cd` vem de *change directory*, isto é, "mudar de diretório/pasta".
-   `lojatech` é a pasta para a qual queremos entrar.

Os próximos comandos devem ser executados dentro dessa pasta, salvo
quando o guia disser o contrário.

### Passo 3 --- Abrir no VS Code

``` bash
code .
```

**O que significa?**

-   `code` abre o Visual Studio Code pelo terminal.
-   `.` significa "a pasta atual".

Se o comando não funcionar, abra o VS Code pelo menu Iniciar, clique em
**Arquivo → Abrir Pasta** e selecione a pasta `lojatech`.

### Passo 4 --- Reconhecer os arquivos principais

Na pasta do projeto, você encontrará arquivos como:

-   `Dockerfile`: instruções para construir a imagem da aplicação.
-   `docker-compose.yml`: configura os serviços da aplicação e do banco no laboratório básico.
-   `.env.example`: modelo das variáveis de configuração.
-   `src/`: código do backend.
-   `public/`: arquivos da interface web.
-   `db/`: scripts SQL e arquivos usados na inicialização do banco.

Não altere arquivos que ainda não conhece. Primeiro vamos executar o
projeto como ele foi preparado.

------------------------------------------------------------------------

## 4. Configurar as senhas do banco

A aplicação precisa de senhas para conectar ao PostgreSQL. Essas
configurações ficam no arquivo `.env`.

### Passo 1 --- Criar o arquivo `.env`

No Windows PowerShell, execute:

``` powershell
Copy-Item .env.example .env
```

Explicação:

-   `Copy-Item` é um comando do PowerShell para copiar um arquivo ou
    item.
-   `.env.example` é o arquivo-modelo que já existe no projeto.
-   `.env` é o nome da cópia que será usada pelo Docker Compose.

No Linux/macOS, o comando equivalente é:

``` bash
cp .env.example .env
```

Aqui, `cp` significa "copy", ou seja, copiar.

### Passo 2 --- Abrir o arquivo `.env`

Abra o arquivo `.env` no VS Code. Você verá variáveis parecidas com
estas:

``` dotenv
DB_NAME=lojatech
DB_ADMIN_USER=lojatech
DB_ADMIN_PASSWORD=SUBSTITUA_POR_UM_SEGREDO_ADMIN_FORTE
DB_USER=lojatech_app
DB_PASSWORD=SUBSTITUA_POR_OUTRO_SEGREDO_FORTE_E_UNICO
DB_POOL_MAX=10
APP_BIND_IP=127.0.0.1
APP_HOST_PORT=3000
ADMIN_USERNAME=SEU_USUARIO_ADMIN
ADMIN_PASSWORD=SUBSTITUA_POR_UMA_SENHA_FORTE
ADMIN_SESSION_SECRET=SUBSTITUA_POR_UMA_CHAVE_ALEATORIA_LONGA
```

Substitua os valores fictícios antes de iniciar a aplicação. Configure
senhas fortes e diferentes para `DB_ADMIN_PASSWORD`, `DB_PASSWORD` e
`ADMIN_PASSWORD`. Defina também um nome de usuário próprio em
`ADMIN_USERNAME` e uma chave aleatória longa e exclusiva em
`ADMIN_SESSION_SECRET`. Não use os textos de exemplo como valores reais.

A variável `ADMIN_SESSION_SECRET` protege as sessões de administração.
O aplicativo exige uma chave com pelo menos 64 caracteres. Não reutilize
senhas, tokens ou chaves de outros serviços.

#### Gerar a chave no Windows PowerShell

Copie e execute estes comandos **um por vez**, no PowerShell. Eles funcionam
também em versões mais antigas do Windows PowerShell:

```powershell
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
$secret.Length
$secret
```

O resultado de `$secret.Length` deve ser `64`. O comando `$secret` mostra
a chave aleatória gerada. Copie esse valor e cole-o no arquivo `.env`, na
linha `ADMIN_SESSION_SECRET=`, depois do sinal `=`.

Por exemplo, a linha deve ficar assim (use a chave que você gerou; não copie
o texto ilustrativo):

```dotenv
ADMIN_SESSION_SECRET=COLE_A_CHAVE_GERADA_AQUI
```

Substitua `COLE_A_CHAVE_GERADA_AQUI` pela chave real, salve o arquivo
(`Ctrl+S` no VS Code ou Bloco de Notas) e feche o editor.

**Importante:** não envie a chave pelo chat, não a publique no GitHub e
não a reutilize em outra instalação. Se gerar uma chave nova para uma
instalação já em uso, as sessões administrativas existentes poderão ser
invalidadas.

  -----------------------------------------------------------------------
  Variável                            O que significa
  ----------------------------------- -----------------------------------
  `DB_NAME`                           Nome do banco de dados.

  `DB_ADMIN_USER`                     Nome da conta administrativa usada
                                      para inicializar o banco.

  `DB_ADMIN_PASSWORD`                 Senha dessa conta administrativa.

  `DB_USER`                           Nome da conta restrita que a
                                      aplicação usa.

  `DB_PASSWORD`                       Senha que a aplicação usa para
                                      conectar ao banco.

  `DB_POOL_MAX`                       Número máximo de conexões do
                                      conjunto de conexões do backend.

  `APP_BIND_IP`                       Endereço local em que a porta será
                                      publicada. Use `127.0.0.1` no computador.

  `APP_HOST_PORT`                     Porta do computador usada para acessar
                                      a aplicação (por padrão, `3000`).

  `ADMIN_USERNAME`                    Nome de usuário para entrar no painel
                                      administrativo.

  `ADMIN_PASSWORD`                    Senha forte para o painel administrativo.

  `ADMIN_SESSION_SECRET`              Segredo aleatório longo usado para
                                      proteger as sessões administrativas.
  -----------------------------------------------------------------------

**Por que existem duas senhas?** A conta administrativa serve para
tarefas de configuração do banco. A aplicação usa uma conta separada,
com permissões mais limitadas.

Mantenha os nomes das variáveis exatamente como aparecem. Não remova o
sinal `=` nem coloque espaços ao redor dele. Salve o arquivo.

> **Segurança:** não envie `.env` ao GitHub. Ele contém senhas privadas.
> O arquivo `.env.example` pode ser publicado porque deve conter apenas
> valores fictícios.

------------------------------------------------------------------------

## 5. Executar a aplicação no computador

Agora vamos iniciar a loja e o banco com Docker Compose.

### Passo 1 --- Confirmar a pasta

O terminal deve estar dentro da pasta `lojatech`, onde está o arquivo
`docker-compose.yml`.

Se não estiver, entre nela:

``` bash
cd lojatech
```

Se você já estiver dentro dela, não execute `cd lojatech` novamente,
pois isso tentaria entrar em uma pasta `lojatech` dentro da pasta atual.

### Passo 2 --- Construir e iniciar a aplicação

``` bash
docker compose up -d --build
```

Vamos separar o comando em partes:

-   `docker`: executa o programa Docker.
-   `compose`: chama a ferramenta que gerencia vários serviços definidos
    no arquivo `docker-compose.yml`.
-   `up`: cria e inicia os serviços definidos nesse arquivo.
-   `-d`: significa *detached*. Executa os contêineres em segundo plano
    e devolve o controle do terminal.
-   `--build`: manda construir a imagem da aplicação antes de iniciar os
    serviços.

A primeira execução pode demorar, pois o Docker pode baixar imagens da
internet e construir a imagem da aplicação. Aguarde o comando terminar.

### Passo 3 --- Conferir se os serviços estão em execução

``` bash
docker compose ps
```

-   `ps` lista os contêineres/serviços do projeto e mostra o estado
    deles.

Confira se os serviços da aplicação e do banco estão ativos. Se algum
não estiver funcionando, consulte os logs no próximo passo.

### Passo 4 --- Consultar os logs

Logs são mensagens que o programa registra enquanto está funcionando.
Eles ajudam a descobrir o motivo de uma falha.

Para ver as últimas 100 linhas dos logs da aplicação:

``` bash
docker compose logs --tail=100 app
```

-   `logs`: mostra as mensagens registradas pelo serviço.
-   `--tail=100`: limita a saída às últimas 100 linhas, evitando uma
    tela enorme.
-   `app`: nome do serviço da aplicação no Compose.

Para ver os logs do banco de dados:

``` bash
docker compose logs --tail=100 db
```

Aqui, `db` é o nome do serviço do PostgreSQL.

Para acompanhar os logs da aplicação em tempo real:

``` bash
docker compose logs -f app
```

-   `-f` significa *follow*: continua mostrando novas mensagens à medida
    que aparecem.
-   Pressione `Ctrl+C` para parar de acompanhar os logs. Isso não
    encerra o contêiner.

### Passo 5 --- Abrir a loja

Abra o navegador e digite:

**http://localhost:3000**

O que significa `localhost`? É uma forma de dizer "este próprio
computador". A porta `3000` é a porta publicada pelo projeto para
acessar a aplicação.

### Passo 6 --- Testar a rota de saúde

No Windows PowerShell, execute:

``` powershell
curl.exe http://localhost:3000/api/health
```

No Linux/macOS:

``` bash
curl http://localhost:3000/api/health
```

-   `curl` é uma ferramenta que faz uma requisição a um endereço web.
-   `http://localhost:3000` é o endereço local da aplicação.
-   `/api/health` é a rota de verificação da aplicação.

Se a resposta indicar que a verificação foi bem-sucedida, a aplicação
conseguiu responder à requisição. Se houver erro, consulte os logs da
aplicação e do banco.

### Passo 7 --- Parar a aplicação

Para parar e remover os contêineres do projeto:

``` bash
docker compose down
```

-   `down` para e remove os contêineres e a rede criados pelo Compose.
-   Normalmente, o volume nomeado do banco é preservado, então os dados
    continuam guardados.

Para iniciar novamente:

``` bash
docker compose up -d
```

Desta vez, não usamos `--build`, porque não estamos pedindo uma nova
construção da imagem.

> **Cuidado:** não use `docker compose down -v` como procedimento
> normal. A opção `-v` remove os volumes associados e pode apagar os
> dados armazenados no PostgreSQL.

------------------------------------------------------------------------

## 6. Criar uma máquina virtual na AWS EC2

A aplicação já funciona localmente. Agora vamos preparar uma máquina na
nuvem para executá-la.

> **Atenção a custos:** a AWS pode cobrar pelo uso da instância,
> armazenamento e endereços IPv4 públicos. Confira os preços aplicáveis
> à sua conta e encerre os recursos quando terminar a aula.

### Passo 1 --- Abrir o serviço EC2

1.  Entre no console da AWS.
2.  Procure o serviço **EC2**.
3.  Clique em **Launch instance** (Criar instância).

A interface da AWS pode mudar um pouco com o tempo, mas os conceitos são
os mesmos.

### Passo 2 --- Configurar a instância

1.  Dê um nome, por exemplo `LojaTech-Laboratorio`.
2.  Escolha uma imagem Ubuntu LTS.
3.  Selecione um tipo de instância adequado ao laboratório.
4.  Crie ou selecione um par de chaves para SSH.
5.  Baixe a chave privada `.pem` e guarde-a em local seguro.

**O que é uma chave `.pem`?** É um arquivo usado para provar que você
tem autorização para se conectar à instância. Trate-o como uma chave de
casa: não compartilhe e não envie ao GitHub.

### Passo 3 --- Configurar as regras de rede

A EC2 usa um **Security Group**, que funciona como um firewall virtual.
Ele define quais conexões podem chegar à máquina.

Configure inicialmente estas regras de entrada para o laboratório:

| Tipo | Porta | Origem |
|---|---:|---|
| SSH | 22 | Seu IP atual (`My IP`) |
| TCP personalizado | 3000 | Seu IP atual (`My IP`) |

A porta 3000 será usada apenas na etapa inicial, para testar a aplicação diretamente por HTTP. Depois de configurar o HTTPS no Passo 12, remova essa regra e acesse a loja pelo domínio.

- **Porta 22:** usada para conexão SSH. Restrinja-a ao seu IP sempre que possível.
- **Porta 3000:** usada para abrir a loja durante o laboratório. Restrinja-a ao seu IP; não use `Anywhere` (`0.0.0.0/0`) sem necessidade.

Não crie uma regra de entrada para a porta `5432`. Essa porta é usada
pelo PostgreSQL, que deve ser acessado pela aplicação na rede interna do
Docker, não diretamente pela internet.

### Passo 4 --- Conferir o IPv4 público

Depois de criar a instância, procure o campo **Public IPv4 address** no
console EC2. Anote o endereço: você vai usá-lo para conectar por SSH e
abrir a loja.

Para a conexão funcionar, a instância precisa estar em uma rede com
acesso à internet, endereço público e regras de rede adequadas. Se a
conexão falhar, confira essas configurações antes de alterar outras
coisas.

------------------------------------------------------------------------

## 7. Conectar à EC2 por SSH

SSH é uma forma de abrir um terminal em uma máquina remota. Neste caso,
você vai controlar a Ubuntu que criou na AWS.

### Windows PowerShell

Imagine que a chave privada foi salva em `C:\loja.pem`. Execute:

``` powershell
ssh -i "C:\loja.pem" ubuntu@IP_PUBLICO_DA_EC2
```

Substitua `IP_PUBLICO_DA_EC2` pelo endereço IPv4 público real da sua
instância.

Explicando o comando:

-   `ssh`: inicia uma conexão remota segura.
-   `-i`: indica qual arquivo de chave privada deve ser usado.
-   `"C:\loja.pem"`: caminho do arquivo de chave no seu computador.
-   `ubuntu`: nome do usuário na máquina remota. Para Ubuntu na AWS,
    esse é normalmente o usuário padrão.
-   `@`: separa o nome do usuário do endereço da máquina.
-   `IP_PUBLICO_DA_EC2`: endereço da instância na AWS.

### Se o SSH apresentar erro de permissões no arquivo `.pem` (Windows)

Se aparecer uma mensagem como `UNPROTECTED PRIVATE KEY FILE`, `Bad permissions` ou `Permissions for ... are too open`, o Windows pode estar permitindo que outros usuários acessem a chave privada.

Neste caso, se a chave estiver em `C:\loja.pem`, abra o PowerShell no Windows e execute os comandos abaixo, um de cada vez:

```powershell
icacls "C:\loja.pem" /reset
icacls "C:\loja.pem" /grant:r "$($env:USERNAME):(R)"
icacls "C:\loja.pem" /inheritance:r
```

**O que esses comandos fazem?**

- `icacls`: ferramenta do Windows para consultar e alterar permissões de arquivos.
- `/reset`: restaura as permissões herdadas ou padrão aplicáveis ao arquivo.
- `/grant:r`: concede a permissão especificada, substituindo concessões explícitas anteriores para o usuário indicado.
- `$($env:USERNAME):(R)`: concede permissão de leitura ao usuário atual do Windows.
- `/inheritance:r`: desativa a herança de permissões e remove as permissões herdadas.

Depois, tente novamente a conexão SSH:

```powershell
ssh -i "C:\loja.pem" ubuntu@IP_PUBLICO_DA_EC2
```

Substitua `IP_PUBLICO_DA_EC2` pelo IPv4 público da sua instância.

**Importante:** execute esses comandos apenas no arquivo correto da chave privada. Nunca envie o arquivo `.pem` ao GitHub ou compartilhe seu conteúdo.

Se o erro continuar, confira o caminho da chave, as permissões do arquivo, o usuário SSH e se a chave corresponde à instância EC2.


### Linux/macOS

Primeiro, restrinja as permissões da chave:

``` bash
chmod 400 caminho/para/sua-chave.pem
```

-   `chmod`: altera as permissões de um arquivo.
-   `400`: permite que o proprietário leia o arquivo, sem permitir
    escrita ou acesso por outros usuários.

Depois, conecte-se:

``` bash
ssh -i "caminho/para/sua-chave.pem" ubuntu@IP_PUBLICO_DA_EC2
```

Na primeira conexão, pode aparecer uma pergunta sobre confiar na
identidade do servidor. Confirme somente se estiver certo de que o
endereço corresponde à sua instância.

**Como saber se conectou?** O terminal passa a mostrar um prompt da
máquina Ubuntu. A partir deste ponto, os comandos de instalação devem
ser executados nessa sessão remota, não no PowerShell local.

------------------------------------------------------------------------

## 8. Instalar Docker na EC2

**Atenção:** os comandos desta seção devem ser executados dentro do
terminal SSH da EC2.

### Passo 1 --- Atualizar a lista de pacotes

``` bash
sudo apt update
```

-   `sudo`: executa o comando com privilégios administrativos.
-   `apt`: ferramenta do Ubuntu para gerenciar pacotes.
-   `update`: atualiza a lista de pacotes disponíveis. Não significa que
    todos os programas foram atualizados.

### Passo 2 --- Instalar ferramentas necessárias

``` bash
sudo apt install -y ca-certificates curl git
```

Explicando:

-   `apt install`: instala programas/pacotes.
-   `-y`: responde "sim" automaticamente às confirmações de instalação.
-   `ca-certificates`: certificados necessários para verificar conexões
    seguras.
-   `curl`: ferramenta para testar endereços web e baixar conteúdo.
-   `git`: ferramenta para baixar o repositório do projeto.

### Passo 3 --- Instalar Docker Engine e Docker Compose

Siga a documentação oficial do Docker para instalar o Docker Engine e o
plugin Docker Compose na versão do Ubuntu da sua instância:

<https://docs.docker.com/engine/install/ubuntu/>

A documentação oficial é a referência para os comandos de instalação
atualizados. Siga a seção correspondente à sua versão do Ubuntu.

### Passo 4 --- Testar o Docker

``` bash
sudo docker --version
```

Mostra a versão do Docker instalada.

``` bash
sudo docker compose version
```

Mostra a versão do Docker Compose.

``` bash
sudo docker run --rm hello-world
```

Explicando:

-   `run`: cria e executa um contêiner a partir de uma imagem.
-   `--rm`: remove o contêiner de teste quando ele termina.
-   `hello-world`: nome da imagem simples usada para testar a
    instalação.

Se o comando exibir uma mensagem de sucesso, o Docker está funcionando.

Neste guia, usamos `sudo docker` na EC2 para evitar alterar as
permissões do usuário.

------------------------------------------------------------------------

## 9. Publicar a aplicação na EC2

Agora vamos colocar a loja na máquina da AWS. Execute os comandos desta
seção dentro da sessão SSH da EC2.

### Passo 1 --- Baixar o projeto

``` bash
git clone https://github.com/dpssouza/Lojatech.git lojatech
cd lojatech
```

O primeiro comando baixa o repositório do GitHub e cria a pasta `lojatech`.
O segundo entra nessa pasta.

### Passo 2 --- Criar o arquivo `.env`

``` bash
cp .env.example .env
```

- `cp`: copia um arquivo.
- `.env.example`: arquivo-modelo versionado no GitHub.
- `.env`: arquivo local com as configurações privadas deste ambiente.

### Passo 3 --- Configurar as senhas e a porta de acesso

``` bash
nano .env
```

Substitua os valores fictícios de `DB_ADMIN_PASSWORD`, `DB_PASSWORD` e
`ADMIN_PASSWORD` por senhas fortes e diferentes entre si. Configure
`ADMIN_USERNAME` com um nome de usuário próprio e troque
`ADMIN_SESSION_SECRET` por uma chave aleatória longa e exclusiva. Não
reutilize senhas pessoais nem publique o arquivo `.env`.

Na EC2, confira também estas duas linhas:

```dotenv
APP_BIND_IP=0.0.0.0
APP_HOST_PORT=3000
```

`APP_BIND_IP=0.0.0.0` faz o Docker publicar a porta em todas as interfaces
de rede da instância, permitindo o acesso externo quando o Security Group
também autorizar. Isso é necessário na configuração didática atual, pois
o valor padrão `127.0.0.1` permite acesso somente a partir da própria EC2.
A porta `3000` deve continuar restrita ao seu IP no Security Group.

Para salvar no `nano`:

1. Pressione `Ctrl+O` para gravar o arquivo.
2. Pressione `Enter` para confirmar o nome.
3. Pressione `Ctrl+X` para sair.

### Passo 4 --- Construir e iniciar a aplicação

``` bash
sudo docker compose up -d --build
```

- `sudo`: executa o comando com privilégios administrativos.
- `docker compose`: usa a configuração do `docker-compose.yml`.
- `up`: cria e inicia os serviços.
- `-d`: deixa os serviços rodando em segundo plano.
- `--build`: constrói a imagem da aplicação antes de iniciá-la.

Aguarde a conclusão.

### Passo 5 --- Conferir os serviços

``` bash
sudo docker compose ps
```

Confira se `app` está em execução e se `db` está saudável (`healthy`).
Se algum serviço não estiver funcionando, consulte os logs:

``` bash
sudo docker compose logs --tail=100 app
sudo docker compose logs --tail=100 db
```

### Passo 6 --- Testar a aplicação dentro da EC2

``` bash
curl http://127.0.0.1:3000/api/health
```

Esse teste é executado na própria máquina EC2. `127.0.0.1` significa a
própria instância. A resposta esperada é um JSON indicando que o serviço
está saudável, por exemplo `{"status":"ok"}`.

### Passo 7 --- Abrir a loja no seu computador

No navegador do seu computador, acesse:

`http://IP_PUBLICO_DA_EC2:3000`

Substitua `IP_PUBLICO_DA_EC2` pelo IPv4 público real da instância.
A conexão só funcionará se:

1. `APP_BIND_IP=0.0.0.0` estiver configurado no `.env` da EC2;
2. o Security Group permitir TCP 3000 a partir do seu IP;
3. a instância tiver conectividade de rede e um IPv4 público válido.

Se alterar o `.env` depois de iniciar os contêineres, recrie os serviços:

``` bash
sudo docker compose up -d --force-recreate
```

> **Limite de segurança:** este é um acesso HTTP sem criptografia, destinado
> somente ao laboratório e a dados fictícios. Não use essa configuração em
> produção. Para um serviço público real, configure HTTPS com um proxy
> reverso e reveja as regras de rede. Nunca publique a porta `5432` do banco.

------------------------------------------------------------------------

## 10. Atualizar a aplicação

Se você fizer alterações no projeto, enviá-las ao GitHub e quiser
baixá-las para a EC2, conecte-se por SSH e execute:

``` bash
cd lojatech
```

Entra na pasta do projeto na EC2.

``` bash
git pull
```

-   `git`: ferramenta de controle de versão.
-   `pull`: busca e integra as alterações publicadas no repositório
    remoto.

Depois, reconstrua e inicie os serviços.

Depois, reconstrua e inicie os serviços. Se você configurou HTTPS, o
serviço Caddy também será iniciado porque foi adicionado ao mesmo arquivo
`docker-compose.yml`.

```bash
sudo docker compose up -d --build
sudo docker compose ps
```

**Importante:** não apague volumes para atualizar o código. Os volumes
podem guardar os produtos, pedidos e alterações de estoque do laboratório.
O `Caddyfile` é criado somente na etapa opcional de HTTPS; ele não é
necessário para o laboratório local.

------------------------------------------------------------------------

## 11. Resolver problemas comuns

### A página não abre no computador

1.  Confirme que o Docker Desktop está iniciado.
2.  Execute `docker compose ps` na pasta do projeto.
3.  Consulte os logs:

``` bash
docker compose logs --tail=100 app
docker compose logs --tail=100 db
```

4.  Confirme que o endereço local é `http://localhost:3000`.

### A aplicação não conecta ao banco

1.  Confira se o serviço `db` está em execução:

``` bash
docker compose ps
```

2.  Confira se o arquivo `.env` contém `DB_ADMIN_PASSWORD` e
    `DB_PASSWORD`.
3.  Consulte os logs da aplicação e do banco.
4.  Não apague o volume do banco como primeira tentativa.

### Não consigo conectar à EC2

1.  Confirme que a instância está no estado `running`.
2.  Confira se está usando o IPv4 público correto.
3.  Confira se a regra SSH (porta 22) permite o seu IP.
4.  Confira se a chave `.pem` corresponde ao par de chaves da instância
    e se o usuário SSH é `ubuntu`.

### Conectei à EC2, mas a página não abre

1.  Dentro da EC2, confira os contêineres:

``` bash
sudo docker compose ps
```

2.  Teste a aplicação na própria EC2:

``` bash
curl http://localhost:3000/api/health
```

3.  Confira se o `.env` da EC2 contém `APP_BIND_IP=0.0.0.0` e `APP_HOST_PORT=3000`.
4.  Confira se a regra TCP 3000 do Security Group permite seu IP.
5.  Confira o IPv4 público e os logs da aplicação.

### O que significa `command not found`?

Significa que o terminal não encontrou o programa indicado. Confira se o
programa está instalado e se você digitou o comando corretamente.

### O que significa `Permission denied`?

Significa que o usuário atual não tem permissão para realizar a ação ou
que o acesso SSH não foi autorizado. Leia a mensagem completa e confira
em qual máquina você está executando o comando.

#### Erro `ERR_CONNECTION_REFUSED` ao acessar a loja

Se o navegador apresentar `ERR_CONNECTION_REFUSED` ao acessar `http://IP_PUBLICO_DA_EC2:3000`, siga esta sequência de diagnóstico.

**1. Verifique se os contêineres estão em execução**

Dentro do terminal SSH da EC2, na pasta `lojatech`, execute:

```bash
sudo docker compose ps
```

Se algum serviço não estiver funcionando, consulte os logs:

```bash
sudo docker compose logs --tail=100 app
sudo docker compose logs --tail=100 db
```

**2. Confira o endereço de publicação da aplicação**

Abra o arquivo `.env` da EC2:

```bash
nano .env
```

Confira se contém:

```dotenv
APP_BIND_IP=0.0.0.0
APP_HOST_PORT=3000
```

O endereço `0.0.0.0` permite que a porta publicada pelo Docker escute nas interfaces de rede da instância. Isso não libera, por si só, o acesso pela internet: as regras de rede também precisam permitir a conexão.

Salve o arquivo e saia do editor. Se alterou alguma variável, recrie os serviços:

```bash
sudo docker compose up -d --force-recreate
```

**3. Teste a aplicação dentro da EC2**

```bash
curl http://127.0.0.1:3000/api/health
```

Se o teste falhar, investigue o estado dos contêineres e os logs antes de avançar.

**4. Confira a porta publicada pelo Docker**

```bash
sudo docker compose ps
```

A publicação esperada para este laboratório é semelhante a:

```text
0.0.0.0:3000->3000/tcp
```

**5. Confira o Security Group na AWS**

No console da AWS, abra a instância EC2, acesse a seção **Security**, clique no Security Group associado e confira as regras de entrada.

Deve existir uma regra permitindo **TCP 3000** com origem no seu IP atual (`My IP`). Não é necessário abrir a porta para todos os endereços da internet.

**6. Tente acessar novamente**

No navegador do seu computador, acesse:

```text
http://IP_PUBLICO_DA_EC2:3000
```

Substitua `IP_PUBLICO_DA_EC2` pelo IPv4 público atual da instância.

Se continuar sem funcionar, confira também o IPv4 público, a conectividade de rede da instância e os logs. Não exponha a porta `5432` do PostgreSQL como solução para esse problema.

> **Segurança:** este procedimento é destinado ao laboratório educacional, com dados fictícios e acesso HTTP. Para produção, utilize HTTPS e uma configuração de rede apropriada.


> Nunca tente resolver problemas expondo a porta 5432 do PostgreSQL à
> internet.

------------------------------------------------------------------------

## 12. Configurar domínio e HTTPS (etapa opcional)

**Só faça esta seção se a loja já estiver funcionando na EC2 pelo endereço
`http://IP_PUBLICO_DA_EC2:3000`.** Se você não quiser configurar domínio e
HTTPS agora, pode pular toda esta seção. A aplicação local e a publicação
básica na EC2 não precisam do Caddy.

Nesta etapa, vamos usar:

- **DuckDNS:** fornece um subdomínio gratuito para o laboratório.
- **Caddy:** recebe as conexões HTTP/HTTPS e encaminha as solicitações para
  a aplicação.
- **`Caddyfile`:** arquivo que informa ao Caddy qual domínio usar e para onde
  encaminhar as solicitações.

**Importante:** não vamos colocar o Caddy no `docker-compose.yml` principal.
Assim, quem estiver fazendo apenas o laboratório local não terá erro por
causa de um `Caddyfile` que ainda não existe. O arquivo `Caddyfile` é criado
na EC2 nesta etapa e não deve ser enviado ao GitHub.

### Passo 1 — Criar e configurar o domínio

1. Acesse [DuckDNS](https://www.duckdns.org/) e entre na sua conta.
2. Crie ou selecione um subdomínio disponível.
3. Configure o subdomínio para apontar para o IPv4 público atual da EC2.
4. Confirme que o domínio resolve para o IP da instância antes de continuar.

O domínio `lojatech.duckdns.org` é apenas um exemplo. Use o seu próprio
subdomínio nos passos seguintes. Não presuma que o nome de exemplo esteja
disponível.

O IP público pode mudar quando a EC2 é parada e iniciada novamente, caso
você não utilize um Elastic IP. Se isso acontecer, atualize o registro DNS.

### Passo 2 — Ajustar as regras do Security Group

No console da AWS, abra a instância EC2, selecione o Security Group associado
e configure estas regras de entrada:

| Tipo | Protocolo | Porta | Origem |
|---|---|---:|---|
| SSH | TCP | 22 | Seu IP (`My IP`) |
| HTTP | TCP | 80 | `0.0.0.0/0` |
| HTTPS | TCP | 443 | `0.0.0.0/0` |

Não abra a porta `5432` do PostgreSQL. Depois de confirmar que o HTTPS
funciona, removeremos a regra TCP 3000 criada para o teste inicial.

### Passo 3 — Configurar a porta da aplicação na EC2

Na sessão SSH da EC2, entre na pasta do projeto e abra o `.env`:

```bash
cd ~/lojatech
nano .env
```

Configure estas linhas:

```dotenv
APP_BIND_IP=127.0.0.1
APP_HOST_PORT=3000
```

Isso limita a porta 3000 ao próprio sistema operacional da EC2. O Caddy
encaminhará as solicitações para `app:3000` pela rede interna do Docker.
A porta 3000 não precisará ficar acessível diretamente pela internet após
o HTTPS funcionar.

Para salvar no `nano`, pressione `Ctrl+O`, depois `Enter` e, por fim,
`Ctrl+X`.

### Passo 4 — Criar o arquivo `Caddyfile`

Ainda na pasta `~/lojatech`, execute:

```bash
nano Caddyfile
```

Esse comando abre o editor. Se o arquivo ainda não existir, ele será criado
quando você salvar.

Cole o conteúdo abaixo, substituindo `SEU_SUBDOMINIO.duckdns.org` pelo
domínio que você criou no DuckDNS:

```caddyfile
SEU_SUBDOMINIO.duckdns.org {
    encode zstd gzip
    reverse_proxy app:3000
}
```

**Não deixe o texto `SEU_SUBDOMINIO.duckdns.org` no arquivo.** Troque-o pelo
seu domínio real. Por exemplo, se seu domínio for `minhaloja.duckdns.org`,
a primeira linha deve ser `minhaloja.duckdns.org {`.

Para salvar, pressione `Ctrl+O`, depois `Enter` e, por fim, `Ctrl+X`.

O `Caddyfile` é uma configuração local da EC2 nesta etapa opcional. Não
o adicione ao GitHub.

### Passo 5 — Adicionar o Caddy ao arquivo `docker-compose.yml`

Nesta etapa, vamos usar **somente o arquivo `docker-compose.yml`**. Não crie
um segundo arquivo Compose.

Abra o arquivo principal na EC2:

```bash
nano docker-compose.yml
```

Dentro dele, já existem os serviços `db` e `app`. Procure o começo do arquivo,
onde aparece `services:`, e localize o final da configuração do serviço `app`.
O serviço `app` termina antes da seção `networks:`.

**Cole o bloco do Caddy dentro de `services:`, no mesmo nível de `db:` e
`app:`.** Isso significa que `caddy:`, `db:` e `app:` devem começar alinhados
na mesma coluna. Não cole o bloco dentro de `app:` e não o coloque depois de
`networks:`.

O trecho abaixo ilustra como a estrutura deve ficar. Os comentários
representam configurações que já existem no arquivo; **não apague nem
substitua as configurações reais de `db` e `app` por estes comentários**.

```yaml
services:
  db:
    # mantenha aqui toda a configuração existente do banco

  app:
    # mantenha aqui toda a configuração existente da aplicação

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - appnet
    security_opt:
      - no-new-privileges:true

networks:
  appnet:
    driver: bridge

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

#### Atenção: preserve o final do arquivo

No seu `docker-compose.yml`, a seção `networks:` já existe. Não crie uma
segunda seção `networks:`. Mantenha a existente.

No final do arquivo, procure a seção `volumes:`. Ela já declara
`postgres_data:`. Acrescente `caddy_data:` e `caddy_config:` nessa mesma
seção, um abaixo do outro, como no exemplo acima. Não remova `postgres_data:`,
pois ele pode guardar os dados do banco.

Em resumo, faça apenas estas duas alterações no arquivo existente:

1. Adicione o bloco completo `caddy:` dentro de `services:`, depois da
   configuração de `app` e antes de `networks:`.
2. Na seção `volumes:` que já existe no final, mantenha `postgres_data:` e
   acrescente `caddy_data:` e `caddy_config:`.

Para salvar no `nano`, pressione `Ctrl+O`, depois `Enter` e, por fim,
`Ctrl+X`.

O arquivo `Caddyfile` deve estar na mesma pasta do `docker-compose.yml`.
Ele foi criado no passo anterior e não deve ser enviado ao GitHub.

### Passo 6 — Validar e iniciar a configuração

Antes de iniciar os serviços, valide o arquivo:

```bash
sudo docker compose config -q
```

Esse comando verifica se o `docker-compose.yml` está escrito corretamente.
Se terminar sem erro, inicie a aplicação e o Caddy:

```bash
sudo docker compose up -d --build
```

Confira se os serviços estão funcionando:

```bash
sudo docker compose ps
```

Valide a configuração do Caddy:

```bash
sudo docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
```

Para consultar os logs do Caddy:

```bash
sudo docker compose logs --tail=100 caddy
```

O Caddy poderá solicitar e renovar automaticamente o certificado TLS
quando o domínio apontar para a EC2 e as portas 80 e 443 estiverem acessíveis.
A emissão do certificado não é garantida até que DNS e regras de rede estejam
corretos.

### Passo 7 — Testar HTTPS e fechar a porta 3000

No navegador do seu computador, abra o domínio real que você configurou:

```text
https://SEU_SUBDOMINIO.duckdns.org
```

Substitua `SEU_SUBDOMINIO.duckdns.org` pelo seu domínio. Confirme que a
página carrega e que o navegador mostra um certificado válido.

Você também pode testar pelo terminal SSH da EC2:

```bash
curl -I https://SEU_SUBDOMINIO.duckdns.org
```

Depois de confirmar que o HTTPS funciona, remova a regra TCP 3000 do
Security Group. Mantenha SSH restrito ao seu IP e as portas 80 e 443
liberadas para o acesso público.

### Problemas comuns com HTTPS

- **O domínio não abre:** confirme que o DNS aponta para o IPv4 público atual.
- **A conexão expira ou é recusada:** confira o estado dos serviços, o
  Security Group e os logs do Caddy.
- **O certificado não é emitido:** confirme o domínio e o acesso externo às
  portas 80 e 443.
- **O proxy não encontra a aplicação:** confira se `app` e `caddy` estão na
  mesma rede Docker. O bloco do Caddy deve conectar o serviço à rede `appnet`.

Use estes comandos de diagnóstico:

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 caddy
sudo docker compose logs --tail=100 app
```

Não compartilhe `.env`, senhas, tokens do DuckDNS ou chaves privadas.

## 13. Encerrar o laboratório e evitar custos

### Passo 1 --- Parar os contêineres

Dentro da EC2, na pasta `lojatech`, escolha o comando conforme a configuração usada.

Se você **não configurou HTTPS**, execute:

```bash
sudo docker compose down
```

Se você **configurou HTTPS na seção 12**, execute com os dois arquivos:

```bash
sudo docker compose down
```

`down` para e remove os contêineres e a rede criados pelo Compose. Esse
comando não encerra a instância EC2 e não remove os volumes nomeados do banco
ou do Caddy, a menos que você acrescente a opção `-v`. Não use `-v` se quiser
preservar os dados.

### Passo 2 --- Encerrar a instância

Quando terminar a atividade:

1.  Abra o console AWS.
2.  Entre no serviço EC2.
3.  Selecione a instância criada para o laboratório.
4.  Escolha **Terminate instance** (Encerrar instância) se não precisar
    mais dela. Essa ação é irreversível para a instância e pode causar perda
    de dados que não tenham sido salvos em outro lugar.

Apenas parar uma instância não elimina necessariamente todos os custos.

### Passo 3 --- Conferir recursos restantes

Confira se sobraram recursos criados para a aula que não são mais
necessários, como volumes EBS, snapshots ou endereços Elastic IP.
Verifique antes de excluir para não apagar algo que deseja manter.

------------------------------------------------------------------------

## 14. Entender os arquivos do projeto

``` text
LojaTech/
├── db/
│   ├── init.sql
│   ├── create-app-user.sh
│   ├── create-app-user.sql
│   └── migrations/
│       ├── 001_admin_panel.sql
│       └── 002_order_management.sql
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   └── server.js
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── Caddyfile                 (criado somente se configurar HTTPS)
```

  -----------------------------------------------------------------------
  Arquivo/pasta                       Para que serve?
  ----------------------------------- -----------------------------------
  `db/`                               Contém scripts relacionados ao
                                      banco de dados.

  `db/init.sql`                       Cria a estrutura inicial e os dados
                                      de exemplo do banco.

  `db/migrations/001_admin_panel.sql` Adiciona estruturas usadas pelo painel
                                      administrativo. É aplicada pelo fluxo
                                      de inicialização do projeto em um banco
                                      recém-criado, conforme os scripts do DB.

  `public/`                           Contém os arquivos da interface
                                      web.

  `src/server.js`                     Código do servidor Node.js e das
                                      rotas da API.

  `.env.example`                      Modelo das variáveis de
                                      configuração.

  `.gitignore`                        Informa ao Git quais arquivos não
                                      devem ser incluídos no repositório.

  `Dockerfile`                        Explica como construir a imagem da
                                      aplicação.

  `docker-compose.yml`                Define como executar os serviços e
                                      conectá-los.

  `Caddyfile`                         Configuração do Caddy usada na etapa
                                      opcional de domínio e HTTPS. O serviço
                                      Caddy também precisa ser adicionado ao
                                      Docker Compose conforme a seção 12.

  `package.json`                      Lista informações, dependências e
                                      comandos do projeto.

  `README.md`                         Este guia.
  -----------------------------------------------------------------------


O arquivo `.env` é criado durante a configuração e não deve ser enviado
ao GitHub. O `Caddyfile` é criado manualmente na EC2 apenas se você fizer a etapa
opcional de HTTPS.
Eles não são necessários para baixar e executar a aplicação localmente.

## Gestão de pedidos no painel administrativo

O painel administrativo também permite acompanhar os pedidos registrados pela loja.
Depois de entrar em `/admin`, use **Gestão de pedidos** para:

- consultar número, data, cliente, quantidade de itens, valor e status;
- filtrar a lista pelo status;
- abrir os detalhes e consultar os produtos, quantidades e preços;
- atualizar o andamento para **Pendente**, **Em preparação**, **Enviado** ou **Entregue**;
- cancelar um pedido. Ao cancelar, o sistema devolve ao estoque as quantidades compradas, dentro da mesma transação do banco de dados.

Os status são operacionais; esta funcionalidade não confirma nem processa pagamentos. Pedidos antigos recebem o status `pending` (Pendente) ao aplicar a migração. Pedidos entregues ou cancelados não podem ser reabertos pela interface.

### Atualizar uma instalação que já existe

As migrações em `/docker-entrypoint-initdb.d` são executadas automaticamente somente quando o PostgreSQL inicializa um volume de dados vazio. Se a LojaTech já está rodando com um banco existente, aplique a nova migração **antes de usar a gestão de pedidos**. Na pasta do projeto, execute:

```bash
docker compose exec -T db sh -c 'psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_user="$APP_DB_USER" --file=/scripts/migrations/002_order_management.sql'
```

Esse comando adiciona a coluna de status, cria índices e ajusta as permissões do usuário da aplicação. Ele não apaga pedidos nem produtos. Em seguida, reconstrua e reinicie a aplicação:

```bash
docker compose up -d --build app
```

Se você usa o arquivo de composição de teste, acrescente `-f docker-compose.teste.yml` aos comandos `docker compose` acima. Faça backup do banco antes de executar alterações em uma instalação importante.

## Referências oficiais

-   Docker Engine no Ubuntu:
    <https://docs.docker.com/engine/install/ubuntu/>
-   Docker Compose: <https://docs.docker.com/compose/>
-   AWS EC2: <https://docs.aws.amazon.com/ec2/>
-   GitHub Docs: <https://docs.github.com/>

------------------------------------------------------------------------

**Parabéns por concluir o laboratório!** Você baixou um projeto, executou
uma aplicação com Docker e conectou os serviços. Se também concluiu a etapa
opcional de domínio e HTTPS, terá publicado a loja didática com acesso seguro
por domínio. Continue praticando e use apenas dados fictícios durante as
atividades.
