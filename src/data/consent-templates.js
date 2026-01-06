/**
 * Templates pré-definidos de consentimento LGPD
 * Baseados em TEMPLATES_LGPD_CONSENTIMENTO.md
 *
 * Cada template contém todos os campos necessários para compliance legal
 */

export const CONSENT_TEMPLATES = {
  DATA_PROCESSING: {
    formIntroText:
      'Para prestar nossos serviços, precisamos processar seus dados pessoais básicos (nome, CPF, telefone, email, endereço) e dados de atendimento (histórico de consultas, agendamentos, avaliações). Este processamento é necessário para gerenciar sua relação conosco e prestar os serviços solicitados.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA PROCESSAMENTO DE DADOS PESSOAIS**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), solicitamos seu consentimento para o processamento de seus dados pessoais.

**1. DADOS PESSOAIS QUE SERÃO PROCESSADOS:**

**Dados de Identificação:**
- Nome completo
- CPF/RG ou documento de identidade
- Data de nascimento
- Nacionalidade

**Dados de Contato:**
- Telefone (fixo e/ou celular)
- Endereço de e-mail
- Endereço residencial completo (logradouro, número, complemento, CEP, cidade, estado)

**Dados de Relacionamento:**
- Histórico de agendamentos e atendimentos
- Histórico de serviços utilizados
- Avaliações e feedbacks prestados
- Origem da indicação (como conheceu nosso estabelecimento)
- Status de cliente frequente

**Dados de Uso do Sistema:**
- Registro de acessos e interações
- Preferências de comunicação
- Dados de navegação e uso da plataforma

**2. FINALIDADES DO PROCESSAMENTO:**

Os dados serão processados exclusivamente para as seguintes finalidades:
- Cadastro e identificação do cliente em nosso sistema
- Gestão de agendamentos e atendimentos
- Prestação de serviços solicitados
- Comunicação sobre agendamentos, confirmações e lembretes
- Gestão de relacionamento com o cliente
- Melhoria da qualidade dos serviços prestados
- Cumprimento de obrigações legais e regulatórias
- Prevenção de fraudes e segurança

**3. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, V** - Execução de contrato ou procedimentos preliminares
- **Art. 7º, VI** - Exercício regular de direitos em processo judicial, arbitral ou administrativo
- **Art. 7º, IX** - Proteção da vida ou da incolumidade física do titular ou de terceiro

**4. PRAZO DE RETENÇÃO:**

Seus dados serão mantidos:
- **Dados cadastrais**: Enquanto mantiver relação comercial conosco e por até 5 (cinco) anos após o término da relação, para cumprimento de obrigações legais
- **Dados de atendimento**: Conforme exigências legais do setor de saúde (mínimo 20 anos para prontuários médicos, quando aplicável)
- **Dados de comunicação**: Por até 3 (três) anos após a última interação

**5. COMPARTILHAMENTO DE DADOS:**

Seus dados poderão ser compartilhados apenas com:
- Prestadores de serviços que atuam como operadores de dados (hospedagem, segurança, suporte técnico), sob contrato de confidencialidade
- Autoridades públicas, quando exigido por lei ou ordem judicial
- Não compartilhamos seus dados com terceiros para fins comerciais sem seu consentimento específico

**6. SEUS DIREITOS (LGPD Art. 18º):**

Você tem direito a:
- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade
- Portabilidade dos dados
- Eliminação dos dados tratados com base no consentimento
- Informação sobre compartilhamento
- Revogação do consentimento

**7. COMO EXERCER SEUS DIREITOS:**

Para exercer qualquer um de seus direitos, entre em contato conosco através de:
- E-mail: {commerceEmail}
- Telefone: {commercePhone}
- Presencialmente: {commerceAddress}

**8. REVOGAÇÃO DO CONSENTIMENTO:**

Você pode revogar este consentimento a qualquer momento, através dos canais acima mencionados. A revogação não afetará a legalidade do processamento realizado anteriormente com base no consentimento.

**9. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização do processamento de dados pode impedir:
- O cadastro em nosso sistema
- A realização de agendamentos
- A prestação de serviços
- A comunicação sobre seus atendimentos

**10. SEGURANÇA DOS DADOS:**

Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, perda, destruição ou alteração, em conformidade com a LGPD.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `**DADOS DE IDENTIFICAÇÃO:**
- Nome completo
- CPF/RG ou documento de identidade
- Data de nascimento
- Nacionalidade

**DADOS DE CONTATO:**
- Telefone (fixo e/ou celular)
- Endereço de e-mail
- Endereço residencial completo (logradouro, número, complemento, CEP, cidade, estado)

**DADOS DE RELACIONAMENTO:**
- Histórico de agendamentos e atendimentos
- Histórico de serviços utilizados
- Avaliações e feedbacks prestados
- Origem da indicação
- Status de cliente frequente

**DADOS DE USO DO SISTEMA:**
- Registro de acessos e interações
- Preferências de comunicação
- Dados de navegação e uso da plataforma`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 7º, V - Execução de contrato ou procedimentos preliminares\nLGPD Art. 7º, VI - Exercício regular de direitos em processo judicial, arbitral ou administrativo\nLGPD Art. 7º, IX - Proteção da vida ou da incolumidade física do titular ou de terceiro',
    retentionPeriod:
      '- Dados cadastrais: Enquanto mantiver relação comercial e por até 5 anos após o término\n- Dados de atendimento: Conforme exigências legais do setor (mínimo 20 anos para prontuários médicos, quando aplicável)\n- Dados de comunicação: Por até 3 anos após a última interação',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar este consentimento, entre em contato através de:\n- E-mail: {commerceEmail}\n- Telefone: {commercePhone}\n- Presencialmente: {commerceAddress}\n\nA revogação não afetará a legalidade do processamento realizado anteriormente.',
  },

  DATA_SHARING: {
    formIntroText:
      'Para prestar nossos serviços de forma completa, podemos precisar compartilhar seus dados pessoais básicos com prestadores de serviços terceirizados (como sistemas de pagamento, plataformas de comunicação) que atuam como nossos parceiros operacionais, sempre sob contrato de confidencialidade e apenas para finalidades específicas relacionadas ao serviço.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA COMPARTILHAMENTO DE DADOS PESSOAIS**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), solicitamos seu consentimento para o compartilhamento de seus dados pessoais com terceiros.

**1. DADOS QUE SERÃO COMPARTILHADOS:**

**Dados Básicos:**
- Nome completo
- CPF/RG
- Telefone
- E-mail
- Endereço (quando necessário para entrega ou cobrança)

**2. COM QUEM COMPARTILHAMOS:**

**Operadores de Dados (Prestadores de Serviços):**
- Plataformas de pagamento e processamento de transações
- Serviços de hospedagem e infraestrutura de TI
- Sistemas de comunicação (SMS, e-mail, WhatsApp)
- Serviços de análise e business intelligence
- Prestadores de serviços de segurança da informação

**3. FINALIDADES DO COMPARTILHAMENTO:**

Os dados serão compartilhados exclusivamente para:
- Processamento de pagamentos e transações financeiras
- Envio de comunicações (confirmações, lembretes, notificações)
- Prestação de serviços técnicos e de infraestrutura
- Melhoria e otimização dos serviços prestados
- Cumprimento de obrigações legais e regulatórias

**4. GARANTIAS DE SEGURANÇA:**

Todos os terceiros com quem compartilhamos dados:
- Atuam como operadores de dados, sob contrato específico
- Estão obrigados a manter confidencialidade
- Implementam medidas de segurança adequadas
- Processam dados apenas para as finalidades acordadas
- Não podem compartilhar dados com outros terceiros sem nossa autorização

**5. BASE LEGAL (LGPD Art. 7º):**

Este compartilhamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, V** - Execução de contrato ou procedimentos preliminares

**6. PRAZO DE RETENÇÃO:**

Os dados compartilhados serão mantidos pelos terceiros apenas pelo tempo necessário para cumprir as finalidades acordadas, sendo posteriormente eliminados ou devolvidos, conforme contrato.

**7. SEUS DIREITOS:**

Você tem direito a:
- Ser informado sobre quais dados foram compartilhados e com quem
- Solicitar informações sobre as medidas de segurança adotadas pelos terceiros
- Revogar o consentimento a qualquer momento
- Solicitar a interrupção do compartilhamento (respeitando obrigações contratuais)

**8. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização do compartilhamento pode impedir:
- O processamento de pagamentos online
- O envio de comunicações automatizadas
- A utilização de alguns serviços que dependem de integração com terceiros

**9. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento. A revogação não afetará compartilhamentos já realizados para cumprimento de obrigações contratuais em andamento.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Nome completo
- CPF/RG
- Telefone
- E-mail
- Endereço (quando necessário)`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 7º, V - Execução de contrato ou procedimentos preliminares',
    retentionPeriod:
      'Os dados serão mantidos pelos terceiros apenas pelo tempo necessário para cumprir as finalidades acordadas, sendo posteriormente eliminados ou devolvidos.',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar, entre em contato através dos canais oficiais. A revogação não afetará compartilhamentos já realizados para cumprimento de obrigações contratuais em andamento.',
  },

  MARKETING: {
    formIntroText:
      'Gostaríamos de enviar comunicações promocionais, ofertas especiais, novidades sobre nossos serviços e conteúdos de interesse via e-mail, WhatsApp ou SMS. Você pode optar por receber ou não essas comunicações e pode cancelar a qualquer momento.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA MARKETING E COMUNICAÇÕES PROMOCIONAIS**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o Código de Defesa do Consumidor, solicitamos seu consentimento para envio de comunicações de marketing.

**1. DADOS UTILIZADOS:**

- Nome completo
- E-mail
- Telefone (celular)
- Histórico de serviços utilizados (para personalização)

**2. TIPOS DE COMUNICAÇÃO:**

- Ofertas promocionais e descontos especiais
- Novidades sobre serviços e produtos
- Conteúdos educacionais e informativos
- Pesquisas de satisfação e feedback
- Lembretes de agendamentos e cuidados
- Eventos e campanhas especiais

**3. CANAIS DE COMUNICAÇÃO:**

- E-mail
- WhatsApp
- SMS
- Notificações push (quando aplicável)

**4. FREQUÊNCIA:**

As comunicações serão enviadas de forma moderada, respeitando sua privacidade. Você pode ajustar as preferências de frequência a qualquer momento.

**5. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, II** - Cumprimento de obrigação legal ou regulatória pelo controlador

**6. PERSONALIZAÇÃO:**

Utilizamos seus dados de histórico de serviços para personalizar as comunicações, oferecendo conteúdo mais relevante e de seu interesse.

**7. SEUS DIREITOS:**

Você tem direito a:
- Optar por receber ou não comunicações de marketing
- Escolher os canais de comunicação preferidos
- Cancelar o recebimento a qualquer momento
- Solicitar exclusão de listas de marketing

**8. COMO CANCELAR:**

Para cancelar o recebimento de comunicações de marketing:
- Clique no link de descadastro presente em cada e-mail
- Envie "SAIR" via WhatsApp
- Entre em contato conosco através dos canais oficiais
- Acesse suas preferências em sua conta

**9. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização não impedirá:
- O recebimento de comunicações essenciais sobre seus agendamentos e atendimentos
- A prestação de serviços

Apenas impedirá o recebimento de comunicações promocionais e de marketing.

**10. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento, sem qualquer custo ou ônus. O cancelamento será processado em até 5 dias úteis.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Nome completo
- E-mail
- Telefone (celular)
- Histórico de serviços utilizados (para personalização)`,
    legalBasis: 'LGPD Art. 7º, I - Consentimento do titular',
    retentionPeriod:
      'Enquanto mantiver relação comercial e por até 2 anos após a última interação, ou até revogação do consentimento.',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para cancelar: clique no link de descadastro nos e-mails, envie "SAIR" via WhatsApp, ou entre em contato pelos canais oficiais. Cancelamento processado em até 5 dias úteis.',
  },

  RESEARCH: {
    formIntroText:
      'Podemos utilizar seus dados de atendimento de forma anonimizada e agregada para fins de pesquisa científica, estudos estatísticos e melhoria dos serviços de saúde. Seus dados pessoais identificáveis não serão utilizados sem seu consentimento específico.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA PESQUISA CIENTÍFICA**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e Resolução CNS 510/2016, solicitamos seu consentimento para utilização de dados em pesquisas científicas.

**1. DADOS UTILIZADOS:**

**Dados Anonimizados e Agregados:**
- Dados demográficos (idade, gênero, região) - sem identificação pessoal
- Padrões de atendimento e serviços utilizados
- Resultados de tratamentos (de forma agregada)
- Dados epidemiológicos

**Dados Identificáveis (apenas com consentimento específico):**
- Dados de prontuário médico (quando necessário para pesquisa específica)
- Histórico completo de atendimentos

**2. FINALIDADES DA PESQUISA:**

- Estudos científicos e pesquisas acadêmicas
- Pesquisas epidemiológicas
- Estudos de efetividade de tratamentos
- Melhoria da qualidade dos serviços de saúde
- Publicações científicas (com dados anonimizados)

**3. ANONIMIZAÇÃO:**

Quando possível, os dados serão:
- Anonimizados (remoção de identificadores pessoais)
- Agregados (apresentados em conjunto, sem identificação individual)
- Pseudonimizados (quando necessário manter rastreabilidade controlada)

**4. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, IV** - Estudos por órgão de pesquisa (quando aplicável)

**5. GARANTIAS:**

- Dados serão utilizados apenas para fins de pesquisa científica
- Pesquisas serão conduzidas por profissionais qualificados
- Resultados serão publicados de forma anonimizada
- Não haverá uso comercial dos dados sem novo consentimento
- Dados identificáveis serão utilizados apenas quando estritamente necessário

**6. COMITÊ DE ÉTICA:**

Pesquisas que envolvam dados identificáveis serão submetidas a Comitê de Ética em Pesquisa (CEP) e aprovadas antes da coleta de dados.

**7. SEUS DIREITOS:**

Você tem direito a:
- Ser informado sobre pesquisas específicas que utilizem seus dados
- Revogar o consentimento a qualquer momento
- Solicitar exclusão de dados de pesquisas futuras
- Acesso aos resultados de pesquisas (quando aplicável)

**8. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização não afetará:
- A prestação de serviços de saúde
- Seu atendimento individual

Apenas impedirá a utilização de seus dados em pesquisas científicas.

**9. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento. Dados já utilizados em pesquisas concluídas não poderão ser retirados, mas não serão utilizados em novas pesquisas.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Dados demográficos anonimizados (idade, gênero, região)
- Padrões de atendimento agregados
- Resultados de tratamentos (agregados)
- Dados de prontuário (apenas com consentimento específico para pesquisa)`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 7º, IV - Estudos por órgão de pesquisa',
    retentionPeriod:
      'Dados anonimizados: indefinidamente para fins de pesquisa\nDados identificáveis: conforme aprovação do Comitê de Ética em Pesquisa',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar, entre em contato pelos canais oficiais. Dados já utilizados em pesquisas concluídas não poderão ser retirados, mas não serão utilizados em novas pesquisas.',
  },

  THIRD_PARTY: {
    formIntroText:
      'Para prestação de alguns serviços, podemos precisar compartilhar seus dados com terceiros específicos (como laboratórios, clínicas parceiras, planos de saúde, seguradoras) que participam diretamente do seu atendimento ou tratamento. Este compartilhamento será feito apenas quando necessário e com sua autorização prévia.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA COMPARTILHAMENTO COM TERCEIROS**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), solicitamos seu consentimento para compartilhamento de dados com terceiros específicos.

**1. DADOS COMPARTILHADOS:**

**Dados Básicos:**
- Nome completo
- CPF/RG
- Data de nascimento
- Telefone e e-mail
- Endereço

**Dados de Saúde (quando aplicável):**
- Histórico de atendimentos
- Resultados de exames
- Diagnósticos
- Tratamentos realizados
- Informações de plano de saúde

**2. TERCEIROS COM QUEM COMPARTILHAMOS:**

**Prestadores de Serviços de Saúde:**
- Laboratórios de análises clínicas
- Clínicas e profissionais parceiros
- Centros de diagnóstico por imagem
- Farmácias (para prescrições)

**Planos de Saúde e Seguradoras:**
- Planos de saúde (para autorização de procedimentos)
- Seguradoras (quando aplicável)
- Operadoras de saúde

**Autoridades e Órgãos Reguladores:**
- Quando exigido por lei ou ordem judicial
- Órgãos de fiscalização sanitária
- Conselhos profissionais

**3. FINALIDADES DO COMPARTILHAMENTO:**

- Autorização e cobertura de procedimentos por planos de saúde
- Realização de exames complementares em laboratórios parceiros
- Continuidade de tratamento com profissionais parceiros
- Cumprimento de obrigações contratuais com planos de saúde
- Cumprimento de obrigações legais e regulatórias

**4. BASE LEGAL (LGPD Art. 7º):**

Este compartilhamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, V** - Execução de contrato ou procedimentos preliminares
- **Art. 7º, VI** - Exercício regular de direitos em processo judicial, arbitral ou administrativo
- **Art. 7º, IX** - Proteção da vida ou da incolumidade física do titular ou de terceiro

**5. GARANTIAS:**

- Compartilhamento apenas para finalidades específicas e necessárias
- Terceiros são obrigados a manter confidencialidade
- Dados serão compartilhados apenas pelo tempo necessário
- Você será informado sobre cada compartilhamento específico (quando aplicável)

**6. SEUS DIREITOS:**

Você tem direito a:
- Ser informado sobre quais dados foram compartilhados e com quem
- Solicitar cópia dos dados compartilhados
- Revogar o consentimento (respeitando obrigações contratuais em andamento)
- Solicitar informações sobre medidas de segurança dos terceiros

**7. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização pode impedir:
- Autorização de procedimentos por planos de saúde
- Realização de exames em laboratórios parceiros
- Continuidade de tratamento com profissionais parceiros
- Alguns serviços que dependem de integração com terceiros

**8. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento. A revogação não afetará compartilhamentos já realizados para cumprimento de obrigações contratuais ou legais em andamento.

**9. SEGURANÇA:**

Todos os terceiros são obrigados a implementar medidas de segurança adequadas para proteção dos dados compartilhados.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Dados básicos (nome, CPF, contato, endereço)
- Dados de saúde (histórico, exames, diagnósticos, tratamentos)
- Informações de plano de saúde`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 7º, V - Execução de contrato\nLGPD Art. 7º, VI - Exercício regular de direitos\nLGPD Art. 7º, IX - Proteção da vida ou incolumidade física',
    retentionPeriod:
      'Conforme necessidade do tratamento e obrigações legais. Dados de saúde: mínimo 20 anos (conforme legislação de prontuários médicos).',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar, entre em contato pelos canais oficiais. A revogação não afetará compartilhamentos já realizados para cumprimento de obrigações contratuais ou legais em andamento.',
  },

  DATA_EXPORT: {
    formIntroText:
      'Você tem direito de solicitar uma cópia de todos os seus dados pessoais em formato estruturado e de uso comum (portabilidade de dados). Podemos exportar seus dados para você a qualquer momento, mediante solicitação.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA EXPORTAÇÃO DE DADOS (PORTABILIDADE)**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018, Art. 18º, V), você tem direito à portabilidade de seus dados pessoais.

**1. DADOS QUE PODEM SER EXPORTADOS:**

**Dados Cadastrais:**
- Nome completo, CPF/RG, data de nascimento
- Contatos (telefone, e-mail, endereço)
- Dados de cadastro e preferências

**Dados de Atendimento:**
- Histórico completo de agendamentos
- Histórico de atendimentos realizados
- Serviços utilizados
- Avaliações e feedbacks

**Dados de Saúde (quando aplicável):**
- Prontuário médico completo
- Resultados de exames
- Histórico de tratamentos
- Prescrições médicas

**2. FORMATO DA EXPORTAÇÃO:**

Os dados serão fornecidos em formato:
- Estruturado (JSON, CSV ou XML)
- De uso comum
- Legível por máquina
- Compatível com outros sistemas

**3. FINALIDADE DA EXPORTAÇÃO:**

- Exercício do direito de portabilidade (LGPD Art. 18º, V)
- Migração de dados para outro prestador de serviços
- Backup pessoal dos dados
- Análise pessoal dos dados

**4. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 18º, V** - Direito à portabilidade dos dados

**5. PROCESSO DE EXPORTAÇÃO:**

1. Solicitação através dos canais oficiais
2. Verificação de identidade (para segurança)
3. Preparação dos dados (até 15 dias úteis)
4. Entrega através de link seguro ou presencialmente
5. Link válido por 7 dias

**6. SEGURANÇA:**

- Dados serão criptografados durante a exportação
- Link de download será enviado apenas para e-mail cadastrado
- Link expira em 7 dias por segurança
- Você é responsável pela segurança dos dados após o download

**7. LIMITAÇÕES:**

Não serão exportados:
- Dados de terceiros (sem autorização)
- Dados anonimizados ou agregados
- Dados protegidos por sigilo profissional (quando aplicável)
- Dados que possam comprometer direitos de terceiros

**8. CUSTOS:**

A primeira exportação é gratuita. Exportações adicionais podem ter custo administrativo, conforme legislação.

**9. SEUS DIREITOS:**

Você tem direito a:
- Solicitar exportação a qualquer momento
- Receber dados em formato estruturado
- Solicitar correção de dados antes da exportação
- Receber orientação sobre o uso dos dados exportados

**10. REVOGAÇÃO:**

Este consentimento é para facilitar o processo de exportação. Você pode solicitar exportação mesmo sem este consentimento prévio, conforme seu direito legal.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Dados cadastrais completos
- Histórico de agendamentos e atendimentos
- Dados de saúde (prontuário, exames, tratamentos)
- Avaliações e feedbacks`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 18º, V - Direito à portabilidade dos dados',
    retentionPeriod:
      'Dados exportados ficam disponíveis para download por 7 dias. Após isso, nova solicitação será necessária.',
    privacyPolicyLink: '',
    revocationInstructions:
      'Não se aplica - este é um direito legal. Você pode solicitar exportação a qualquer momento, mesmo sem consentimento prévio.',
  },

  TELEMEDICINE: {
    formIntroText:
      'Para realização de consultas por telemedicina, precisamos processar seus dados pessoais e de saúde, incluindo áudio e vídeo da consulta. Estes dados são essenciais para prestação do serviço e serão armazenados com segurança conforme exigências legais.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA TELEMEDICINA**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e Resolução CFM nº 2.227/2018, solicitamos seu consentimento para realização de consultas por telemedicina.

**1. DADOS PROCESSADOS:**

**Dados Pessoais:**
- Nome completo, CPF/RG
- Data de nascimento
- Telefone e e-mail
- Endereço

**Dados de Saúde:**
- Histórico médico e queixas
- Sintomas relatados
- Exames físicos realizados durante a consulta
- Diagnósticos
- Prescrições e orientações

**Dados de Áudio e Vídeo:**
- Gravação de áudio da consulta (quando aplicável)
- Gravação de vídeo da consulta (quando aplicável)
- Screenshots ou imagens compartilhadas durante a consulta

**2. FINALIDADES:**

- Realização de consultas médicas à distância
- Diagnóstico e tratamento
- Prescrição de medicamentos e exames
- Orientação médica
- Continuidade de tratamento
- Manutenção de prontuário médico eletrônico
- Cumprimento de obrigações legais e regulatórias

**3. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, V** - Execução de contrato ou procedimentos preliminares
- **Art. 7º, IX** - Proteção da vida ou da incolumidade física do titular ou de terceiro

**4. GRAVAÇÃO DE CONSULTAS:**

**Quando há gravação:**
- Para fins de documentação médica
- Para qualidade e segurança do atendimento
- Para fins de ensino (apenas com consentimento específico adicional)

**Garantias:**
- Gravações são armazenadas com segurança
- Acesso restrito apenas a profissionais autorizados
- Gravações são mantidas conforme prazo legal de prontuários (mínimo 20 anos)
- Você será informado previamente sobre gravação

**5. SEGURANÇA E CONFIDENCIALIDADE:**

- Consultas são realizadas em ambiente seguro e criptografado
- Dados são armazenados em servidores seguros
- Acesso restrito apenas a profissionais autorizados
- Sigilo médico é mantido conforme Código de Ética Médica

**6. LIMITAÇÕES DA TELEMEDICINA:**

- Algumas condições podem exigir atendimento presencial
- Emergências devem ser atendidas presencialmente
- Exames físicos complexos podem não ser possíveis à distância
- O profissional pode indicar necessidade de consulta presencial

**7. PRAZO DE RETENÇÃO:**

- Dados de consulta: Mínimo 20 anos (conforme legislação de prontuários médicos)
- Gravações: Conforme necessidade clínica e obrigações legais
- Dados cadastrais: Enquanto mantiver relação comercial

**8. COMPARTILHAMENTO:**

Dados de telemedicina podem ser compartilhados com:
- Outros profissionais de saúde envolvidos no seu tratamento (com seu conhecimento)
- Planos de saúde (para autorização de procedimentos)
- Laboratórios e clínicas (para realização de exames)
- Autoridades (quando exigido por lei)

**9. SEUS DIREITOS:**

Você tem direito a:
- Acesso aos dados da consulta
- Cópia do prontuário da consulta
- Solicitar não gravação (quando possível)
- Revogar consentimento (respeitando continuidade do tratamento)

**10. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização pode impedir:
- Realização de consultas por telemedicina
- Continuidade de tratamento à distância
- Alguns serviços que dependem de telemedicina

**11. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento. A revogação não afetará consultas já realizadas ou obrigações legais de manutenção de prontuários.

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Dados pessoais (nome, CPF, contato, endereço)
- Dados de saúde (histórico, sintomas, diagnósticos, prescrições)
- Gravações de áudio e vídeo da consulta (quando aplicável)
- Imagens e documentos compartilhados durante a consulta`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular\nLGPD Art. 7º, V - Execução de contrato\nLGPD Art. 7º, IX - Proteção da vida ou incolumidade física\nResolução CFM nº 2.227/2018 - Telemedicina',
    retentionPeriod: `- Dados de consulta: Mínimo 20 anos (legislação de prontuários médicos)
- Gravações: Conforme necessidade clínica e obrigações legais`,
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar, entre em contato pelos canais oficiais. A revogação não afetará consultas já realizadas ou obrigações legais de manutenção de prontuários.',
  },

  BIOMETRIC: {
    formIntroText:
      'Para maior segurança e agilidade no atendimento, podemos coletar e processar seus dados biométricos (impressão digital, reconhecimento facial, voz) para identificação e autenticação. Estes dados são altamente sensíveis e serão tratados com máxima segurança.',
    fullTerms: `**TERMO DE CONSENTIMENTO PARA PROCESSAMENTO DE DADOS BIOMÉTRICOS**

De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), solicitamos seu consentimento para coleta e processamento de dados biométricos.

**⚠️ ATENÇÃO: Dados biométricos são dados pessoais sensíveis (LGPD Art. 5º, II) e requerem proteção especial.**

**1. DADOS BIOMÉTRICOS COLETADOS:**

**Tipos de Dados:**
- Impressão digital
- Reconhecimento facial (fotografia ou biometria facial)
- Reconhecimento de voz
- Outros dados biométricos (quando aplicável)

**2. FINALIDADES:**

- Identificação e autenticação do paciente
- Prevenção de fraudes e segurança
- Agilidade no processo de atendimento
- Controle de acesso a áreas restritas
- Verificação de identidade em procedimentos sensíveis

**3. BASE LEGAL (LGPD Art. 7º):**

Este processamento baseia-se em:
- **Art. 7º, I** - Consentimento do titular (este termo)
- **Art. 7º, IX** - Proteção da vida ou da incolumidade física do titular ou de terceiro

**⚠️ IMPORTANTE:** Dados biométricos são dados sensíveis e requerem consentimento específico e destacado (LGPD Art. 8º, §1º).

**4. FORMA DE COLETA:**

- Coleta presencial, em ambiente controlado
- Utilização de equipamentos seguros e certificados
- Coleta realizada por profissionais autorizados
- Dados são criptografados imediatamente após coleta

**5. ARMAZENAMENTO E SEGURANÇA:**

**Medidas de Segurança:**
- Dados são armazenados de forma criptografada
- Acesso restrito apenas a profissionais autorizados
- Dados não são compartilhados com terceiros sem autorização específica
- Utilização de hash biométrico (quando possível) em vez de dados brutos
- Backup seguro e criptografado

**6. PRAZO DE RETENÇÃO:**

- Dados biométricos serão mantidos enquanto mantiver relação comercial
- Após término da relação, dados serão eliminados, exceto quando exigido por lei
- Em caso de obrigação legal, dados serão mantidos pelo prazo mínimo exigido

**7. COMPARTILHAMENTO:**

Dados biométricos **NÃO serão compartilhados** com terceiros, exceto:
- Quando exigido por lei ou ordem judicial
- Com autoridades competentes em investigações legais
- Com seu consentimento específico e expresso para cada compartilhamento

**8. SEUS DIREITOS:**

Você tem direito a:
- Ser informado sobre quais dados biométricos foram coletados
- Acesso aos dados biométricos armazenados
- Solicitar eliminação dos dados (respeitando obrigações legais)
- Revogar o consentimento a qualquer momento
- Ser informado sobre medidas de segurança adotadas

**9. CONSEQUÊNCIAS DA NÃO AUTORIZAÇÃO:**

A não autorização pode:
- Impedir utilização de sistemas de identificação biométrica
- Exigir identificação por outros meios (documentos)
- Aumentar tempo de atendimento em alguns processos

**10. REVOGAÇÃO:**

Você pode revogar este consentimento a qualquer momento. Após revogação:
- Novos dados biométricos não serão coletados
- Dados já coletados serão eliminados (respeitando obrigações legais)
- Identificação passará a ser feita por outros meios

**11. SEGURANÇA ADICIONAL:**

- Dados biométricos são tratados com nível máximo de segurança
- Qualquer incidente de segurança será comunicado conforme LGPD
- Você será informado sobre qualquer uso não autorizado

**⚠️ DECLARAÇÃO IMPORTANTE:**

Ao aceitar este termo, você declara:
- Ter sido informado sobre a natureza sensível dos dados biométricos
- Compreender as finalidades do processamento
- Concordar com a coleta e processamento conforme descrito
- Estar ciente de seus direitos e como exercê-los

Ao aceitar este termo, você declara ter lido, compreendido e concordado com todas as condições acima descritas.`,
    dataDescription: `- Impressão digital
- Reconhecimento facial (fotografia ou biometria facial)
- Reconhecimento de voz
- Outros dados biométricos (quando aplicável)`,
    legalBasis:
      'LGPD Art. 7º, I - Consentimento do titular (específico e destacado)\nLGPD Art. 7º, IX - Proteção da vida ou incolumidade física\nLGPD Art. 5º, II - Dados sensíveis (requer proteção especial)',
    retentionPeriod:
      'Enquanto mantiver relação comercial. Após término, dados serão eliminados, exceto quando exigido por lei (prazo mínimo legal).',
    privacyPolicyLink: '',
    revocationInstructions:
      'Para revogar, entre em contato pelos canais oficiais. Após revogação, novos dados não serão coletados e dados existentes serão eliminados (respeitando obrigações legais).',
  },
};

/**
 * Templates pré-configurados (presets) que agrupam múltiplos tipos
 */
export const CONSENT_PRESETS = {
  BASIC: {
    name: 'Básico',
    description: 'Consentimentos essenciais para operação básica',
    consentTypes: ['DATA_PROCESSING', 'DATA_SHARING'],
  },
  MARKETING: {
    name: 'Marketing',
    description: 'Consentimentos para marketing e comunicações',
    consentTypes: ['MARKETING', 'DATA_SHARING'],
  },
  HEALTH_COMPLETE: {
    name: 'Saúde Completo',
    description: 'Todos os consentimentos relacionados a saúde',
    consentTypes: [
      'DATA_PROCESSING',
      'DATA_SHARING',
      'THIRD_PARTY',
      'TELEMEDICINE',
      'BIOMETRIC',
      'RESEARCH',
    ],
  },
  COMPLETE: {
    name: 'Completo',
    description: 'Todos os tipos de consentimento',
    consentTypes: [
      'DATA_PROCESSING',
      'DATA_SHARING',
      'MARKETING',
      'RESEARCH',
      'THIRD_PARTY',
      'DATA_EXPORT',
      'TELEMEDICINE',
      'BIOMETRIC',
    ],
  },
};

/**
 * Função helper para substituir variáveis dinâmicas nos templates
 * @param {string} template - Template com variáveis
 * @param {object} variables - Objeto com valores das variáveis
 * @returns {string} - Template com variáveis substituídas
 */
export const replaceTemplateVariables = (template, variables = {}) => {
  if (!template) return '';

  let result = template;
  const defaultVars = {
    clientName: variables.clientName || '[Nome do Cliente]',
    commerceName: variables.commerceName || '[Nome do Estabelecimento]',
    commerceAddress: variables.commerceAddress || '[Endereço]',
    commercePhone: variables.commercePhone || '[Telefone]',
    commerceEmail: variables.commerceEmail || '[E-mail]',
    privacyPolicyLink: variables.privacyPolicyLink || '[Link da Política de Privacidade]',
  };

  Object.keys(defaultVars).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, defaultVars[key]);
  });

  return result;
};

/**
 * Função para obter template por tipo de consentimento
 * @param {string} consentType - Tipo de consentimento
 * @param {object} variables - Variáveis para substituir
 * @returns {object} - Template completo com variáveis substituídas
 */
export const getTemplateByType = (consentType, variables = {}) => {
  const template = CONSENT_TEMPLATES[consentType];
  if (!template) return null;

  return {
    formIntroText: replaceTemplateVariables(template.formIntroText, variables),
    fullTerms: replaceTemplateVariables(template.fullTerms, variables),
    dataDescription: replaceTemplateVariables(template.dataDescription, variables),
    legalBasis: replaceTemplateVariables(template.legalBasis, variables),
    retentionPeriod: replaceTemplateVariables(template.retentionPeriod, variables),
    privacyPolicyLink: variables.privacyPolicyLink || template.privacyPolicyLink || '',
    revocationInstructions: replaceTemplateVariables(template.revocationInstructions, variables),
    whatsapp: replaceTemplateVariables(template.whatsapp || template.formIntroText, variables),
  };
};


