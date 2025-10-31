## Contribuição
Leia nosso [ICLA](docs/legal/ICLA.md) antes de contribuir.

# Mesapra2: Conectando Pessoas para Experiências Gastronômicas Compartilhadas ✨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
## 📜 Sobre o Projeto

[cite_start]Mesapra2 é uma aplicação inovadora de *social dining* projetada para facilitar a criação, descoberta e participação em eventos gastronômicos[cite: 4078]. Seja para conhecer novas pessoas com interesses em comum, organizar encontros com amigos ou promover estabelecimentos, o Mesapra2 oferece uma plataforma completa e segura, focada em criar conexões significativas através da culinária.

Este repositório contém o código-fonte do frontend da aplicação Mesapra2, construído com tecnologias web modernas.

## 🚀 Funcionalidades Principais

* **Criação e Gestão de Eventos:**
    * [cite_start]Diferentes tipos de eventos para Usuários Comuns, Premium e Parceiros (Padrão, Particular, Crusher, Institucional)[cite: 4089, 4121, 4124, 4127].
    * [cite_start]Ciclo de vida completo do evento (Aberto, Confirmado, Em Andamento, Finalizado, Concluído, Cancelado)[cite: 4081, 4082, 4083, 4084, 4085, 4086].
    * [cite_start]Gestão de candidaturas/inscrições com aprovação manual ou direta[cite: 4094].
* **Descoberta de Eventos:**
    * [cite_start]Feed de eventos com filtros baseados em hashtags e localização[cite: 4093, 4119].
    * [cite_start]Sistema de hashtags para categorizar interesses e eventos[cite: 4142, 4147, 4151, 4153].
* **Perfis de Usuário Detalhados:**
    * [cite_start]Perfil com fotos, biografia, hashtags de interesse e links sociais[cite: 4130].
    * [cite_start]**Sistema de Reputação Dupla:** [cite: 4132]
        * [cite_start]*Ranking de Experiência:* Avaliação da qualidade como anfitrião/convidado[cite: 4133].
        * [cite_start]*Ranking de Confiabilidade:* Mede o compromisso e a pontualidade (reduzido por "No-Shows")[cite: 4135, 4136].
* **Interação Social:**
    * [cite_start]Sistema de chat integrado ativado sob condições específicas (evento confirmado, presente enviado, "cutucada" entre premiums)[cite: 4095, 4096, 4097, 4098].
    * [cite_start]Funcionalidade "Crusher" com envio de presentes para iniciar conversas[cite: 4097, 4145].
* **Segurança e Confiança:**
    * [cite_start]Verificação de presença via QR Code ou senha[cite: 4102].
    * [cite_start]Políticas claras de cancelamento e punição por não comparecimento ("No-Show")[cite: 4106, 4109].
    * [cite_start]Opção de pagamento para evitar penalidade no ranking de confiabilidade[cite: 4111].
    * [cite_start]Política de reincidência com suspensão e reativação mediante taxa[cite: 4113, 4114, 4115].
* [cite_start]**Avaliação Pós-Evento:** Sistema de avaliação mútua obrigatória para participantes presentes[cite: 4104].
* [cite_start]**Níveis de Acesso e Planos:** Funcionalidades distintas para Usuários Comuns, Premium e Partners (Padrão e Premium)[cite: 4120, 4138, 4140].

## 🛠️ Tecnologias Utilizadas

* [cite_start]**Frontend:** React [cite: 2087]
* [cite_start]**Build Tool:** Vite 
* [cite_start]**Estilização:** Tailwind CSS (inferido de `tailwind.config.js`, `postcss.config.js`) 
* [cite_start]**Componentes UI:** shadcn/ui (ou similar, inferido de `components.json`, `src/components/ui/`) [cite: 2079, 4055]
* [cite_start]**Backend & Banco de Dados:** Supabase (inferido de `supabaseClient.js`, `@supabase/supabase-js` em dependências) [cite: 4059, 2084]
* [cite_start]**Linguagem:** JavaScript (JSX)  [cite_start]e TypeScript (em alguns serviços) 

## ⚙️ Começando (Getting Started)

Siga estas instruções para configurar e executar o projeto localmente.

### Pré-requisitos

* Node.js (versão recomendada: 18 ou superior)
* npm ou yarn

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/mesapra2/mezza.git](https://github.com/mesapra2/mezza.git)
    ```
2.  **Navegue até o diretório do projeto:**
    ```bash
    cd mezza
    ```
3.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    # yarn install
    ```
4.  **Configure as Variáveis de Ambiente:**
    * Renomeie o arquivo `.env.example` (se existir) para `.env` ou crie um arquivo `.env` na raiz do projeto.
    * [cite_start]Adicione as chaves de API necessárias, especialmente as do Supabase (URL e Anon Key), conforme indicado nos arquivos `.env.development` e `.env.production` mencionados.
    ```env
    VITE_SUPABASE_URL=SUA_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
    # Adicione outras variáveis conforme necessário
    ```

## 🚀 Uso

* **Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    # ou
    # yarn dev
    ```
    Abra [http://localhost:5173](http://localhost:5173) (ou a porta indicada no terminal) no seu navegador.

* **Build de Produção:**
    ```bash
    npm run build
    # ou
    # yarn build
    ```
    Os arquivos otimizados estarão na pasta `dist/`.

* **Pré-visualizar Build:**
    ```bash
    npm run preview
    # ou
    # yarn preview
    ```





## 🤝 Contribuindo

Contribuições são bem-vindas! Se você deseja contribuir, por favor:

1.  Faça um Fork do projeto.
2.  Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`).
3.  Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`).
4.  Faça o Push para a branch (`git push origin feature/NovaFeature`).
5.  Abra um Pull Request.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📫 Contato

*Nome do Desenvolvedor/Equipe* - oi@mesapra2.com

Link do Projeto: [https://github.com/mesapra2/mezza](https://github.com/mesapra2/mezza)




    Inicia um servidor local para visualizar a build de produção.

## 📁 Estrutura do Projeto
