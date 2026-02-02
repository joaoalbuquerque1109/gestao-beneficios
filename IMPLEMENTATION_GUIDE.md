# 📋 Implementação: Painel de Status de Funcionário com Regras Específicas

## 🎯 Resumo das Melhorias

Este documento descreve a implementação dos seguintes recursos:

### **Problema 3: Status Dinâmicos em Funcionários**
✅ **Resolvido**: Novos status criados em **Configurações > Status** agora aparecem imediatamente na aba **Funcionários** para cadastro/alteração.

### **Problema 4: Criação de Status com Regras**
✅ **Implementado**: Novo sistema de regras de status permite:
- ✓ Definir se o status entra ou não no cálculo do VA
- ✓ Definir se o status entra ou não no cálculo da Cesta Básica
- ✓ Escolher exclusão **Total**, **Parcial** (com %), ou sem exclusão
- ✓ Configurar período de validade (início e fim) para o status

---

## 📁 Arquivos Modificados/Criados

### 1. **Migração do Banco de Dados**
**Arquivo:** `/migrations/add_employee_status_rules.sql`

Adiciona novos campos à tabela `employee_statuses`:
```sql
- includes_va_calculation (BOOLEAN) - Incluir no cálculo do VA
- includes_basket_calculation (BOOLEAN) - Incluir no cálculo da Cesta
- exclusion_type (VARCHAR) - 'TOTAL', 'PARTIAL', NULL
- exclusion_percentage (DECIMAL) - Porcentagem de exclusão
- start_date (DATE) - Data inicial de validade
- end_date (DATE) - Data final de validade
- description (TEXT) - Descrição do status
```

Também cria:
- Tabela `employee_status_history` para auditoria
- View `active_employee_statuses_with_rules`

### 2. **Novo Componente Modal**
**Arquivo:** `/components/StatusRulesModal.tsx`

Modal interativo para criar/editar status com regras:
- Interface visual para configurar todas as regras
- Validação em tempo real
- Resumo das configurações antes de salvar
- Feedback visual com cores indicando tipos de exclusão

### 3. **Atualização de Settings**
**Arquivo:** `/app/(admin)/settings/settings-client.tsx`

Mudanças:
- Novo botão "Novo Status com Regras" que abre o modal
- Exibição de badges mostrando tipo de exclusão (🔴 TOTAL / 🟠 PARCIAL)
- Botão de editar para status existentes
- Integração com o novo modal

**Arquivo:** `/app/actions/settings.ts`

Novas funções:
- `saveEmployeeStatus()` - Salva/atualiza status com regras
- `getEmployeeStatusesWithRules()` - Busca status ativos com regras

### 4. **Atualização de Funcionários**
**Arquivo:** `/app/(admin)/employees/page.tsx`

- Busca dinamicamente todos os status (agora com regras)
- Passa os status para o componente cliente

**Arquivo:** `/app/(admin)/employees/employee-client.tsx`

Mudanças:
- Select de status agora é dinâmico (carrega de `statuses` prop)
- Fallback para status padrão se não houver dados
- `STATUS_TEMPORARIOS` agora detecta dinamicamente status com datas

### 5. **Lógica de Cálculo Atualizada**
**Arquivo:** `/services/benefit-calculation.ts`

Nova assinatura da função:
```typescript
interface CalcParams {
  // ... campos anteriores ...
  statusRules?: any; // ← NOVO
}
```

Lógica adicionada:
- Verifica `includes_va_calculation` antes de calcular VA
- Verifica `includes_basket_calculation` antes de calcular Cesta
- Aplica exclusão **TOTAL** (zera tudo)
- Aplica exclusão **PARCIAL** (reduz em X%)
- Retorna `statusRulesApplied` no debug para rastreabilidade

**Arquivo:** `/app/actions/calculation.ts`

Atualização:
- Busca as regras de status do banco
- Cria mapa de `statusRulesMap` para lookup eficiente
- Passa `statusRules` para `calculateBenefit()`

---

## 🚀 Como Usar

### **Passo 1: Aplicar a Migração no Banco**

1. Acesse seu projeto no Supabase: https://app.supabase.com
2. Vá para **SQL Editor**
3. Copie TODO o conteúdo do arquivo: `/migrations/add_employee_status_rules.sql`
4. Cole no editor SQL
5. Execute (clique em ► ou Ctrl+Enter)

**Alternativa (via CLI):**
```bash
npx supabase migration add add_employee_status_rules
npx supabase db push
```

### **Passo 2: Criar/Editar Status com Regras**

1. Vá para **Configurações** > **Status de Funcionários**
2. Clique no novo botão **"Novo Status com Regras"**
3. Preencha as informações:
   - **Nome**: ex "AFASTADO INSS"
   - **Descrição**: ex "Funcionário afastado por motivo de saúde"
   - **Vale Alimentação**: ✓ se deve incluir no cálculo
   - **Cesta Básica**: ✓ se deve incluir no cálculo
   - **Tipo de Exclusão**: Sem Exclusão / Total / Parcial
   - **Porcentagem** (se Parcial): 50% reduz benefícios em 50%
   - **Período**: Opcionalmente defina data inicial/final

### **Passo 3: Usar Status em Funcionários**

1. Vá para **Funcionários**
2. Crie/edite um funcionário
3. O select de **Status** agora mostra todos os status criados dinamicamente
4. Selecione o status com regras
5. Se for status com datas (FERIAS, MATERNIDADE, etc.), aparecem campos para data início/fim

### **Passo 4: Benefícios são Calculados Automaticamente**

Quando você processa um período em **Cálculo**:
- O sistema verifica as regras do status de cada funcionário
- Aplica as exclusões configuradas
- Exibe no debug quais regras foram aplicadas

---

## 📊 Exemplos de Configuração

### **Exemplo 1: AFASTADO INSS (Exclusão Parcial 50%)**
```
Nome: AFASTADO INSS
Descrição: Funcionário afastado por saúde (INSS)
VA: ✗ (não inclui)
Cesta: ✓ (inclui mas reduzido)
Exclusão: PARCIAL 50%
Resultado: Cesta reduzida em 50%, VA = R$ 0
```

### **Exemplo 2: AVISO PRÉVIO TRABALHADO (Exclusão Total)**
```
Nome: AVISO PREVIO TRABALHADO
Descrição: Funcionário em período de aviso prévio
VA: ✗ (não inclui)
Cesta: ✗ (não inclui)
Exclusão: TOTAL
Resultado: VA = R$ 0, Cesta = R$ 0, Total = R$ 0
```

### **Exemplo 3: FÉRIAS (Normal com Período)**
```
Nome: FERIAS
Descrição: Funcionário em período de férias
VA: ✓ (mantém completo)
Cesta: ✓ (mantém completo)
Exclusão: NENHUMA
Período: Sim (defina data início e fim)
Resultado: Benefícios completos durante as férias
```

### **Exemplo 4: MENOR APRENDIZ (Exclusão Parcial 100%)**
```
Nome: MENOR APRENDIZ
Descrição: Menor aprendiz em treinamento
VA: ✓ (mas reduzido)
Cesta: ✓ (mas reduzido)
Exclusão: PARCIAL 100%
Resultado: VA = R$ 0, Cesta = R$ 0 (100% = total)
```

---

## 🔍 Estrutura de Dados

### **Tabela: employee_statuses** (Atualizada)
```typescript
{
  id: string;                          // ex: "AFASTADO_INSS"
  name: string;                        // ex: "AFASTADO INSS"
  status: "ATIVO" | "INATIVO";         // ativo ou desativado
  description?: string;                // descrição da regra
  includes_va_calculation: boolean;    // incluir no VA?
  includes_basket_calculation: boolean;// incluir na Cesta?
  exclusion_type?: "TOTAL" | "PARTIAL";// tipo de exclusão
  exclusion_percentage?: number;       // 0-100% de redução
  start_date?: date;                   // data inicial (opcional)
  end_date?: date;                     // data final (opcional)
  created_at: timestamp;
  updated_at: timestamp;
}
```

### **Tabela: employee_status_history** (Nova)
```typescript
{
  id: uuid;
  employee_id: uuid;                   // referência ao funcionário
  old_status: string;                  // status anterior
  new_status: string;                  // novo status
  status_start_date?: date;            // início do novo status
  status_end_date?: date;              // fim do novo status
  reason?: string;                     // motivo da mudança
  created_by: string;                  // usuário que fez mudança
  created_at: timestamp;               // quando foi mudado
}
```

---

## 🧪 Testes Recomendados

### **Teste 1: Status Dinâmico**
- [ ] Criar novo status em Configurações
- [ ] Verificar se aparece imediatamente em Funcionários
- [ ] Editar status e confirmar mudanças

### **Teste 2: Exclusão Total**
- [ ] Criar status com exclusão TOTAL
- [ ] Atribuir a um funcionário
- [ ] Processar período e verificar se VA e Cesta são R$ 0

### **Teste 3: Exclusão Parcial**
- [ ] Criar status com exclusão PARCIAL 50%
- [ ] Atribuir a um funcionário
- [ ] Processar período e verificar se benefícios foram reduzidos em 50%

### **Teste 4: Período de Validade**
- [ ] Criar status com datas (ex: 01/01 a 31/01)
- [ ] Atribuir a funcionário
- [ ] Verificar se data início/fim aparecem quando selecionado

### **Teste 5: Histórico de Auditoria**
- [ ] Mudar status de um funcionário
- [ ] Verificar em `employee_status_history` se foi registrado

---

## 💡 Dicas Importantes

1. **Compatibilidade para trás**: O sistema verifica se `statusRules` existe antes de usar. Funcionários sem regras continuam funcionando normalmente.

2. **Performance**: As regras são carregadas uma única vez no início do processamento de período (lookup O(1) via Map).

3. **Validação**: O modal valida tudo antes de salvar (nomes vazios, porcentagens inválidas, datas invertidas).

4. **Fallback**: Se nenhum status for encontrado, o employee-client exibe status padrão (ATIVO, INATIVO, etc).

5. **Debug**: Cada cálculo agora inclui `statusRulesApplied` no objeto debug para rastreabilidade.

---

## 📝 Próximas Melhorias (Sugestões)

- [ ] Exportar relatório com regras de status aplicadas
- [ ] Duplicar status existente
- [ ] Template de status pré-configurados (INSS, Férias, etc)
- [ ] Webhook quando status expirar
- [ ] Dashboard de status mais usado

---

## 🆘 Troubleshooting

### **Status não aparece em Funcionários**
- [ ] Verifique se a migração foi executada corretamente
- [ ] Confirme se o status está com `status = 'ATIVO'`
- [ ] Recarregue a página (F5)

### **Cálculo não aplica exclusão**
- [ ] Verifique se `statusRules` foi salvo corretamente
- [ ] Confirme que o período foi reprocessado
- [ ] Veja o campo `debug.statusRulesApplied`

### **Erro ao salvar status**
- [ ] Confirme que o nome não tem caracteres especiais
- [ ] Se exclusão PARCIAL, verifique se % está entre 0-100
- [ ] Datas devem estar no formato YYYY-MM-DD

---

**Data da Implementação:** 1 de fevereiro de 2026  
**Status:** ✅ Pronto para uso  
**Versão:** 1.0
