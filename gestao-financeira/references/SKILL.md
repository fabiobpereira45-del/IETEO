---
name: n8n-whatsapp-courses
description: |
  Especialista completo em n8n para automação de mensagens WhatsApp em plataformas de cursos educacionais. Use esta skill SEMPRE que o usuário pedir: fluxos n8n para WhatsApp, automação de mensagens para alunos e professores, workflows de matrícula, notificações de provas, alertas de pagamento, integração WhatsApp com sistemas educacionais, criação de nodes n8n, configuração de webhooks n8n, triggers automáticos para eventos de curso, chatbot educacional n8n, ou qualquer automação n8n envolvendo comunicação com estudantes. Acione também para: "fluxo n8n", "workflow automation", "bot whatsapp curso", "notificação automática alunos", "integração evolution API", "n8n + whatsapp", ou qualquer combinação de n8n com educação ou mensageria.
---

# N8N Expert: Automação WhatsApp para Cursos Educacionais

## Visão Geral da Skill

Esta skill transforma qualquer IA em um especialista n8n capaz de implementar do zero fluxos completos de mensagens WhatsApp para cursos — cobrindo matrícula, provas, pagamentos, comunicação professor-aluno e muito mais.

**Antes de começar qualquer implementação**, leia:
- Este SKILL.md inteiro
- `references/n8n-core.md` — conceitos fundamentais do n8n
- `references/whatsapp-nodes.md` — nodes e APIs WhatsApp suportados
- `references/course-flows.md` — fluxos prontos para eventos de cursos

---

## 1. ARQUITETURA DO PROJETO

### Stack Recomendada

```
n8n (self-hosted ou cloud)
  ├── Trigger: Webhook / Schedule / Event
  ├── Router: Switch node (comandos/eventos)
  ├── Processamento: Function / Code nodes
  ├── Banco de dados: PostgreSQL ou Airtable
  ├── WhatsApp: Evolution API (recomendado) ou Twilio
  └── Notificações: Email (opcional) + WhatsApp
```

### Integrações WhatsApp Disponíveis no n8n

| Integração | Tipo | Custo | Recomendação |
|---|---|---|---|
| **Evolution API** | Self-hosted | Gratuito | ✅ Melhor para PT-BR |
| **Twilio** | Cloud | Pago por msg | ✅ Alta confiabilidade |
| **Z-API** | Cloud | Pago | ✅ Fácil setup |
| **WPPConnect** | Self-hosted | Gratuito | Técnico |
| **Meta Cloud API** | Cloud | Pago | Oficial |

> **Padrão desta skill**: Evolution API (gratuita, self-hosted, suporte a grupos e listas)

---

## 2. CONFIGURAÇÃO INICIAL DO N8N

### 2.1 Variáveis de Ambiente Obrigatórias

```env
# .env do n8n
N8N_HOST=seu-dominio.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://seu-dominio.com/
N8N_ENCRYPTION_KEY=chave-aleatoria-32chars

# Evolution API
EVOLUTION_API_URL=http://evolution:8080
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=nome-instancia

# Banco de dados
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=senha-segura
```

### 2.2 docker-compose.yml Completo

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=${WEBHOOK_URL}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data

  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=${EVOLUTION_API_URL}
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://n8n:${DB_PASSWORD}@postgres/evolution
    depends_on:
      - postgres

volumes:
  n8n_data:
  pg_data:
```

---

## 3. ESTRUTURA DE DADOS

### 3.1 Tabelas Necessárias (PostgreSQL)

```sql
-- Alunos
CREATE TABLE alunos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) UNIQUE NOT NULL,  -- formato: 5511999999999
  email VARCHAR(255),
  curso_id INTEGER,
  status VARCHAR(50) DEFAULT 'ativo',   -- ativo, inativo, suspenso
  data_matricula TIMESTAMP DEFAULT NOW(),
  data_vencimento DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Professores
CREATE TABLE professores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  curso_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cursos
CREATE TABLE cursos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  duracao_meses INTEGER,
  valor_mensalidade DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Matrículas
CREATE TABLE matriculas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER REFERENCES alunos(id),
  curso_id INTEGER REFERENCES cursos(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  status VARCHAR(50) DEFAULT 'ativa',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE pagamentos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER REFERENCES alunos(id),
  valor DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente',  -- pendente, pago, atrasado, cancelado
  dias_atraso INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provas
CREATE TABLE provas (
  id SERIAL PRIMARY KEY,
  curso_id INTEGER REFERENCES cursos(id),
  nome VARCHAR(255),
  data_prova TIMESTAMP NOT NULL,
  local VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Log de mensagens enviadas
CREATE TABLE mensagens_log (
  id SERIAL PRIMARY KEY,
  telefone VARCHAR(20),
  tipo VARCHAR(100),
  conteudo TEXT,
  status VARCHAR(50),
  enviado_em TIMESTAMP DEFAULT NOW()
);
```

---

## 4. NODES N8N — REFERÊNCIA RÁPIDA

### Nodes Essenciais para este Projeto

| Node | Função | Quando Usar |
|---|---|---|
| **Webhook** | Recebe eventos externos | Entrada de dados do sistema do curso |
| **Schedule Trigger** | Dispara por horário | Lembretes diários, cobranças |
| **Switch** | Roteamento por condição | Separar comandos (matrícula/prova/etc) |
| **HTTP Request** | Chama APIs externas | Evolution API, sistemas externos |
| **Postgres** | Banco de dados | Consultar/salvar alunos e eventos |
| **Code** | JavaScript custom | Formatar mensagens, lógica complexa |
| **IF** | Condição binária | Verificar se pagamento está atrasado |
| **Set** | Define variáveis | Preparar dados para envio |
| **Merge** | Unir fluxos | Consolidar dados de múltiplas fontes |
| **Loop Over Items** | Iteração | Enviar para lista de alunos |
| **Wait** | Pausar fluxo | Delay entre mensagens |
| **Error Trigger** | Captura erros | Alertar falhas por WhatsApp |

### Configuração do Node HTTP Request (Evolution API)

```json
{
  "method": "POST",
  "url": "{{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $env.EVOLUTION_INSTANCE }}",
  "authentication": "genericCredentialType",
  "headers": {
    "apikey": "{{ $env.EVOLUTION_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "number": "{{ $json.telefone }}",
    "text": "{{ $json.mensagem }}"
  }
}
```

---

## 5. FLUXOS PRONTOS — EVENTOS DE CURSO

> Para JSON completo exportável de cada fluxo, veja `references/course-flows.md`

### 5.1 FLUXO: MATRÍCULA CONFIRMADA

**Trigger**: Webhook POST de sistema de matrículas  
**Ação**: Enviar boas-vindas ao aluno + notificar professor

```
Webhook → Set (formatar dados) → Postgres (salvar aluno)
       → HTTP Request (WhatsApp aluno - boas-vindas)
       → HTTP Request (WhatsApp professor - novo aluno)
       → Postgres (log mensagem)
```

**Mensagem Aluno:**
```
🎓 *Bem-vindo(a) ao curso, {{nome}}!*

Sua matrícula foi confirmada com sucesso! 🎉

📚 *Curso:* {{curso}}
📅 *Início:* {{data_inicio}}
👨🏫 *Professor:* {{professor}}

Seu próximo vencimento é em *{{data_vencimento}}*.

Qualquer dúvida, responda esta mensagem!
```

**Mensagem Professor:**
```
👋 *Novo aluno matriculado!*

*Nome:* {{nome_aluno}}
*Telefone:* {{telefone}}
*Curso:* {{curso}}
*Data de início:* {{data_inicio}}
```

---

### 5.2 FLUXO: LEMBRETE DE PROVA

**Trigger**: Schedule (diário às 08:00)  
**Ação**: Verificar provas nos próximos 3 dias → avisar alunos e professor

```
Schedule → Postgres (buscar provas próximas 3 dias)
        → Loop alunos do curso
        → HTTP Request (WhatsApp cada aluno)
        → HTTP Request (WhatsApp professor - resumo)
```

**Mensagem Aluno:**
```
📝 *Lembrete de Prova!*

Olá, *{{nome}}*! 

Você tem uma prova em breve:

📋 *{{nome_prova}}*
📅 *Data:* {{data_prova}}
🕐 *Horário:* {{horario}}
📍 *Local:* {{local}}

{{#if observacoes}}
⚠️ *Observações:* {{observacoes}}
{{/if}}

Boa sorte nos estudos! 💪
```

---

### 5.3 FLUXO: ATRASO NO PAGAMENTO

**Trigger**: Schedule (diário às 09:00)  
**Ação**: Verificar pagamentos atrasados → escalar mensagens por dias de atraso

```
Schedule → Postgres (buscar pagamentos atrasados)
        → Switch (dias de atraso: 1-3 / 4-7 / 8-15 / +15)
        → IF (status ativo) → HTTP Request (WhatsApp aluno)
        → Postgres (atualizar dias_atraso + log)
```

**Mensagem 1-3 dias (tom suave):**
```
Olá, *{{nome}}*! 👋

Identificamos que seu pagamento de *R$ {{valor}}* 
com vencimento em *{{data_vencimento}}* está em aberto.

Se já realizou o pagamento, desconsidere esta mensagem. 😊

Caso precise de ajuda, estamos à disposição!
```

**Mensagem 4-7 dias (tom médio):**
```
```
⚠️ *Aviso de Pagamento em Atraso*

Olá, *{{nome}}*!

Seu pagamento está *{{dias_atraso}} dias* em atraso.

💰 *Valor:* R$ {{valor}}
📅 *Vencimento original:* {{data_vencimento}}

Por favor, regularize sua situação para não 
interromper seu acesso ao curso.

*Chave PIX:* {{chave_pix}}
```

**Mensagem +15 dias (tom urgente):**
```
🚨 *ATENÇÃO — Acesso em Risco*

*{{nome}}*, seu pagamento está {{dias_atraso}} dias atrasado.

Valor: *R$ {{valor}}*

Seu acesso ao curso pode ser suspenso em 48h.

Entre em contato AGORA para negociar:
📞 {{telefone_financeiro}}

Ou pague via PIX: {{chave_pix}}
```

---

### 5.4 FLUXO: CHATBOT DE COMANDOS

**Trigger**: Webhook (Evolution API webhook de mensagens recebidas)  
**Ação**: Responder comandos enviados via WhatsApp

```
Webhook → Code (extrair comando e telefone)
       → Switch (detectar comando)
            ├── "MATRICULA" → verificar status matrícula
            ├── "PROVA" → próxima prova do aluno
            ├── "BOLETO" → gerar/enviar segunda via
            ├── "HORARIO" → grade do curso
            ├── "PROFESSOR" → contato do professor
            └── default → menu de ajuda
```

**Código de extração de comando (Code node):**
```javascript
const mensagem = $input.first().json.data.message.conversation || '';
const telefone = $input.first().json.data.key.remoteJid.replace('@s.whatsapp.net', '');
const comando = mensagem.trim().toUpperCase().split(' ')[0];

return [{
  json: {
    telefone,
    comando,
    mensagem_original: mensagem,
    timestamp: new Date().toISOString()
  }
}];
```

**Menu de ajuda (comando não reconhecido):**
```
🎓 *Central do Aluno — Menu*

Olá! Como posso te ajudar?

Digite um dos comandos abaixo:

📋 *MATRICULA* — Ver status da matrícula
📝 *PROVA* — Próxima prova agendada  
💰 *BOLETO* — Segunda via de pagamento
⏰ *HORARIO* — Grade de horários do curso
👨🏫 *PROFESSOR* — Contato do seu professor
❓ *AJUDA* — Ver este menu novamente
```

---

### 5.5 FLUXO: AUSÊNCIA DO ALUNO

**Trigger**: Webhook (sistema de presença) ou Schedule  
**Ação**: Notificar aluno com 2+ faltas consecutivas + alertar professor

```
Webhook/Schedule → Postgres (buscar faltas)
               → IF (faltas >= 2) → HTTP Request (WhatsApp aluno)
               → IF (faltas >= 4) → HTTP Request (WhatsApp professor)
               → Postgres (log)
```

---

### 5.6 FLUXO: COMUNICADO GERAL (BROADCAST)

**Trigger**: Webhook (admin envia comunicado)  
**Ação**: Disparar mensagem para todos alunos de um curso

```
Webhook → Postgres (buscar todos alunos ativos do curso)
       → Loop Over Items
            → Wait (500ms entre msgs - anti-spam)
            → HTTP Request (WhatsApp cada aluno)
       → HTTP Request (confirmar para admin)
```

> ⚠️ **Anti-spam obrigatório**: sempre usar Wait node de 500ms–2s entre mensagens em massa

---

## 6. BOAS PRÁTICAS DE IMPLEMENTAÇÃO

### 6.1 Tratamento de Erros

```
Todo fluxo deve ter:
  ├── Try/Catch via "Continue on Error" nos nodes HTTP
  ├── Error Trigger workflow separado
  └── Log de erros no Postgres (mensagens_log com status='erro')
```

**Workflow de Erro (separado):**
```
Error Trigger → Set (formatar erro) → HTTP Request (WhatsApp admin)
             → Postgres (log erro)
```

### 6.2 Formatação de Telefones

```javascript
// Code node — padronizar telefone para Evolution API
function formatarTelefone(tel) {
  // Remove tudo que não for número
  const nums = tel.replace(/\D/g, '');
  
  // Adiciona 55 (Brasil) se necessário
  if (nums.length === 11) return `55${nums}`;
  if (nums.length === 13) return nums;
  
  throw new Error(`Telefone inválido: ${tel}`);
}

return $input.all().map(item => ({
  json: {
    ...item.json,
    telefone: formatarTelefone(item.json.telefone)
  }
}));
```

### 6.3 Credenciais no n8n

Nunca hardcode credenciais. Use sempre:
- **Credentials Store** do n8n para API keys
- **Environment Variables** para URLs e configurações
- Referência: `{{ $env.NOME_VARIAVEL }}` nos nodes

### 6.4 Limites e Rate Limits

| API | Limite | Solução |
|---|---|---|
| Evolution API (self-hosted) | ~60 msgs/min | Wait node 1s |
| Z-API | 20 msgs/min | Wait node 3s |
| Twilio WhatsApp | 80 msgs/seg | Sem preocupação |
| Meta Cloud API | 1000 msg/dia (teste) | Produção ilimitado |

---

## 7. CHECKLIST DE ENTREGA

Ao gerar qualquer fluxo n8n, sempre entregue:

- [ ] JSON exportável do workflow (importar direto no n8n)
- [ ] Variáveis de ambiente necessárias listadas
- [ ] Queries SQL necessárias
- [ ] Instruções de configuração do webhook
- [ ] Templates de mensagens WhatsApp
- [ ] Instruções de teste do fluxo

---

## 8. REFERÊNCIAS ADICIONAIS

Leia os arquivos de referência conforme necessário:

- **`references/n8n-core.md`** — Conceitos avançados: subworkflows, credenciais, execuções, debugging
- **`references/whatsapp-nodes.md`** — Configuração detalhada Evolution API, Twilio, Z-API, Meta API
- **`references/course-flows.md`** — JSONs completos exportáveis de cada fluxo para importar direto no n8n

---

## 9. FLUXO DE TRABALHO AO RECEBER UM PEDIDO

Quando o usuário pedir um fluxo n8n:

1. **Identificar** qual evento/gatilho está sendo pedido
2. **Consultar** `references/course-flows.md` para verificar se há template pronto
3. **Adaptar** o template aos dados específicos do usuário (nomes de campos, API usada)
4. **Gerar** o JSON exportável do workflow
5. **Entregar** com: JSON + SQL + .env vars + instruções de setup
6. **Oferecer** variações (ex: "quer adicionar envio para o professor também?")
