# EcoConnect Hub

Prompt para Lovable: Plataforma de Cadastro de Catadores de Materiais Recicláveis
Objetivo Geral
Construir uma plataforma web intuitiva e responsiva para o cadastro e gerenciamento de catadores de materiais recicláveis, visando criar um banco de dados acessível para organizações e empresas interessadas em suas atividades. O sistema deve facilitar a coleta de informações essenciais dos catadores e permitir a gestão eficiente desses dados por administradores.

Usuários e Papéis
	1.	Catador (Usuário Final):
	◦	Pode se cadastrar na plataforma, fornecendo seus dados pessoais e profissionais.
	◦	Pode visualizar e editar seu próprio perfil.
	◦	Não tem acesso aos dados de outros catadores ou à área administrativa.
	2.	Administrador/Atendente (Gestor da Plataforma):
	◦	Pode cadastrar novos catadores na plataforma (em nome do catador).
	◦	Pode visualizar, editar e excluir cadastros de catadores.
	◦	Pode filtrar catadores por diversos critérios (localização, tipo de material, etc.).
	◦	Pode exportar os dados dos catadores em formato CSV.
	◦	Gerencia as configurações gerais da plataforma.

Modelo de Dados (Entidades e Atributos)
1. Catador
	•	`id`: ID único (gerado automaticamente)
	•	`nome_completo`: Nome completo do catador (texto, obrigatório)
	•	`nome_cooperativa_associacao_grupo`: Nome da Cooperativa/Associação/Grupo (texto, opcional)
	•	`genero`: (Feminino, Masculino, LGBTQIA+, Prefere não responder) (seleção única, obrigatório)
	•	`autodeclaracao_racial`: (texto, obrigatório)
	•	`escolaridade`: (texto, obrigatório)
	•	`email`: E-mail (texto, formato validado, opcional, com opção “não tem”)
	•	`telefone`: Número Telefone (texto, formato validado, opcional, com opção “não tem”)
	•	`endereco_completo`: Endereço residencial completo (logradouro, número, complemento, bairro, município) (texto, obrigatório)
	•	`comprovante_residencia_url`: URL para foto de comprovante de residência (upload de arquivo, opcional, com opção “não tem”)
	•	`cpf`: CPF (texto, formato validado, obrigatório)
	•	`cpf_foto_url`: URL para foto do CPF (frente e verso) (upload de arquivo, opcional, com opção “não tem”)
	•	`rg_cin`: RG / CIN (texto, obrigatório)
	•	`rg_cin_foto_url`: URL para foto do RG / CIN (frente e verso) (upload de arquivo, opcional, com opção “não tem”)
	•	`titulo_eleitor`: Título de Eleitor (texto, opcional)
	•	`titulo_eleitor_foto_url`: URL para foto do Título de Eleitor (upload de arquivo, opcional, com opção “não tem”)
	•	`ctps`: CTPS (texto, opcional)
	•	`ctps_foto_url`: URL para foto da CTPS (upload de arquivo, opcional, com opção “não tem”)
	•	`nis`: NIS (texto, opcional)
	•	`nis_foto_url`: URL para foto do NIS (upload de arquivo, opcional, com opção “não tem”)
	•	`renda_media_mensal`: Renda média mensal (número decimal, obrigatório)
	•	`contribui_inss`: Booleano (sim/não, obrigatório)
	•	`inscrito_cadunico`: Booleano (sim/não, obrigatório)
	•	`possui_bolsa_familia`: Booleano (sim/não, obrigatório)
	•	`conta_bancaria_digital`: Conta bancária digital (App Caixa Tem) (texto, opcional)
	•	`cadastro_gov_br`: Booleano (sim/não, obrigatório)
	•	`nivel_cadastro_gov_br`: (Bronze, Prata, Ouro) (seleção única, condicional a `cadastro_gov_br` ser sim, opcional)
	•	`materiais_coletados`: Lista de materiais (ex: Papel, Plástico, Metal, Vidro, Eletrônicos) (múltipla escolha, obrigatório)
	•	`possui_carroca`: Booleano (sim/não)
	•	`tipo_carroca`: (Manual/Motorizada) (texto, condicional, se `possui_carroca` for sim)
	•	`area_atuacao`: Descrição da área geográfica de atuação (texto, opcional)
	•	`status`: (Pendente, Ativo, Inativo) (texto, padrão: Pendente)
	•	`data_cadastro`: Data e hora do cadastro (gerado automaticamente)

Telas da Aplicação
1. Página Inicial (Home)
	•	Breve descrição da plataforma e sua missão.
	•	Botão de “Cadastre-se” para catadores.
	•	Botão de “Login” para administradores/atendentes.

2. Cadastro de Catador (Formulário Multi-step Detalhado)
	•	Passo 1: Identificação Básica: Nome completo, Nome da Cooperativa/Associação/Grupo (se aplicável), Gênero, Autodeclaração racial, Escolaridade.
	•	Passo 2: Contato e Endereço: E-mail (com opção “não tem”), Telefone (com opção “não tem”), Endereço residencial completo, Upload de Foto de comprovante de residência (com opção “não tem”).
	•	Passo 3: Documentação: CPF, Upload de Foto do CPF (frente e verso), RG / CIN, Upload de Foto do RG / CIN (frente e verso), Título de Eleitor, Upload de Foto do Título de Eleitor, CTPS, Upload de Foto da CTPS, NIS, Upload de Foto do NIS (todos com opção “não tem” para uploads).
	•	Passo 4: Informações Socioeconômicas: Renda média mensal, Contribui com o INSS? (SIM / NÃO), Inscrito(a) no CadÚnico? (SIM / NÃO), Possui Bolsa Família? (SIM / NÃO), Conta bancária digital (App Caixa Tem), Cadastro no gov.br? (SIM / NÃO), Nível do cadastro gov.br (Bronze, Prata, Ouro - condicional).
	•	Passo 5: Dados Profissionais (Coleta): Materiais Coletados (múltipla escolha), Possui Carroça? (SIM / NÃO), Tipo de Carroça (Manual/Motorizada - condicional), Área de Atuação.
	•	Passo 6: Revisão e Confirmação: Resumo de todos os dados inseridos, botão de “Finalizar Cadastro”.
	•	Mensagem de sucesso após o cadastro.

3. Login (Administrador/Atendente e Catador)
	•	Campos para e-mail/CPF e senha.
	•	Link para “Esqueceu a senha?”.

4. Dashboard do Catador
	•	Exibe todos os dados do catador cadastrado.
	•	Botão para “Editar Perfil”.

5. Dashboard do Administrador/Atendente
	•	Visão Geral: Número total de catadores, catadores ativos/pendentes.
	•	Lista de Catadores: Tabela paginada com Nome, CPF, Gênero, Escolaridade, Renda Média, Materiais, Status.
	•	Filtros Avançados: Por Status, Materiais Coletados, Nome da Cooperativa/Associação/Grupo, Gênero, Escolaridade, Contribui INSS, CadÚnico, Bolsa Família, Cadastro Gov.br, Nível Gov.br, Palavra-chave (Nome/CPF/RG).
	•	Ações por Catador: Visualizar Detalhes, Editar, Alterar Status (Ativo/Inativo), Excluir.
	•	Botão para “Exportar Dados (CSV)”.
	•	Botão para “Novo Cadastro (Assistido)” que leva ao formulário multi-step.

6. Detalhes do Catador (Administrador/Atendente)
	•	Exibe todos os dados de um catador específico, incluindo links para os documentos de upload.
	•	Botões para “Editar”, “Alterar Status”, “Excluir”.

Fluxos de Trabalho (Workflows)
	1.	Cadastro de Catador (Auto-serviço): Catador acessa a página inicial -> Clica em “Cadastre-se” -> Preenche o formulário multi-step -> Finaliza o cadastro -> Recebe mensagem de sucesso.
	2.	Cadastro de Catador (Assistido): Administrador/Atendente faz login -> Acessa a área de “Novo Cadastro” -> Preenche o formulário multi-step em nome do catador -> Finaliza o cadastro -> Catador é adicionado ao banco de dados.
	3.	Login de Administrador/Atendente: Administrador/Atendente acessa a página inicial -> Clica em “Login” -> Insere credenciais -> Acessa o Dashboard do Administrador.
	4.	Gerenciamento de Catadores: Administrador/Atendente acessa o Dashboard -> Utiliza filtros para encontrar catadores -> Clica em “Visualizar Detalhes” -> Realiza ações (Editar, Alterar Status, Excluir).
	5.	Exportação de Dados: Administrador/Atendente acessa o Dashboard -> Aplica filtros (opcional) -> Clica em “Exportar Dados (CSV)” -> Recebe um arquivo CSV com os dados filtrados.

Regras e Validações
	•	Todos os campos obrigatórios devem ser preenchidos.
	•	Validação de formato para CPF, RG, Telefone e Email.
	•	CPF deve ser único no sistema.
	•	Apenas administradores podem acessar as telas de gerenciamento.
	•	Catadores só podem visualizar e editar seus próprios dados.
	•	Confirmação antes de excluir um cadastro.

Especificações de Design
	•	Estilo: Clean, moderno, profissional e focado na usabilidade.
	•	Cores: Paleta de cores que remeta à sustentabilidade (tons de verde, azul, cinza neutro).
	•	Tipografia: Fonte sans-serif legível e moderna.
	•	Componentes: Uso de cards para exibição de informações, formulários bem espaçados, botões claros e intuitivos.
	•	Responsividade: Design totalmente responsivo para desktop, tablet e mobile.
	•	Acessibilidade: Considerar navegação por teclado e rótulos ARIA para elementos interativos.

Especificações Técnicas (Padrões Lovable)
	•	Frontend: React com TypeScript.
	•	Backend: Node.js com Express.
	•	Banco de Dados: PostgreSQL (via Supabase ou similar, para facilitar a integração).
	•	Estilização: Tailwind CSS para um design responsivo e consistente.
	•	Autenticação: Baseada em e-mail/CPF e senha com tokens JWT.
	•	Armazenamento de Arquivos: Integração para upload de documentos (ex: S3 ou similar).

Testes de Aceitação
	•	Cadastro de Catador: Um catador preenche todos os campos obrigatórios e finaliza o cadastro com sucesso. Seus dados aparecem no Dashboard do Administrador com status “Pendente”.
	•	Login de Catador: Um catador cadastrado consegue fazer login e visualizar seu perfil.
	•	Login de Administrador: Um administrador consegue fazer login e acessar o Dashboard do Administrador.
	•	Filtro de Catadores: O administrador filtra catadores por “Materiais Coletados: Plástico” e apenas catadores que coletam plástico são exibidos.
	•	Edição de Catador: O administrador edita o telefone de um catador e a alteração é salva e refletida no perfil.
	•	Exportação CSV: O administrador clica em “Exportar Dados (CSV)” e um arquivo CSV contendo os dados dos catadores (respeitando os filtros aplicados) é baixado.
	•	Validação de CPF: Ao tentar cadastrar um catador com um CPF já existente, o sistema deve exibir uma mensagem de erro.
	•	Responsividade: A página de cadastro e o dashboard do administrador devem ser totalmente funcionais e bem formatados em dispositivos móveis e desktops.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://coletor-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/551529a8-1929-4adf-9dc7-1cb72758c1e5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
