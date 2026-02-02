# 🧪 Guia de Testes - Status com Regras

## Cenários de Teste

### **Teste 1: Criação de Status Simples**
```
1. Vá para Configurações > Status de Funcionários
2. Clique "Novo Status com Regras"
3. Preencha:
   - Nome: TEST_STATUS_01
   - Descrição: Status para teste
   - VA: ✓ Marcado
   - Cesta: ✓ Marcado
   - Exclusão: Sem Exclusão
4. Clique "Salvar"
5. ✅ Esperado: Mensagem "Status salvo com sucesso!"
6. ✅ Esperado: Status aparece na lista
7. ✅ Esperado: Imediatamente disponível em Funcionários
```

### **Teste 2: Exclusão Total**
```
1. Criar status:
   - Nome: TEST_INSS
   - Descrição: Teste INSS
   - VA: ✗ Desmarcado
   - Cesta: ✗ Desmarcado
   - Exclusão: TOTAL
2. Atribuir a um funcionário com VA = R$ 50 e Cesta = R$ 100
3. Processar período
4. ✅ Esperado: VA = R$ 0, Cesta = R$ 0
5. ✅ Esperado: No debug: exclusion_type = "TOTAL"
```

### **Teste 3: Exclusão Parcial**
```
1. Criar status:
   - Nome: TEST_PARTIAL
   - Descrição: Teste exclusão parcial
   - VA: ✓ Marcado
   - Cesta: ✓ Marcado
   - Exclusão: PARCIAL 50%
2. Atribuir a funcionário com VA = R$ 100, Cesta = R$ 100
3. Processar período
4. ✅ Esperado: VA = R$ 50, Cesta = R$ 50
5. ✅ Esperado: No debug: exclusion_percentage = 50
```

### **Teste 4: Status com Período**
```
1. Criar status:
   - Nome: TEST_VACATION
   - Descrição: Férias teste
   - VA: ✓ Marcado
   - Cesta: ✓ Marcado
   - Exclusão: Sem Exclusão
   - Data Início: 2026-02-01
   - Data Fim: 2026-02-10
2. Atribuir a funcionário
3. ✅ Esperado: Campos de data aparecem no formulário
4. ✅ Esperado: Data é validada (início <= fim)
```

### **Teste 5: Atualização de Status Existente**
```
1. Criar status simples
2. Clicar no ícone de editar (ao passar mouse)
3. Mudar: Exclusão de "Sem" para "PARCIAL 25%"
4. Clicar "Salvar"
5. ✅ Esperado: Mensagem de sucesso
6. ✅ Esperado: Badge muda para "🟠 25% Exclusão"
```

### **Teste 6: Validações**
```
A. Nome vazio:
   - Deixar em branco
   - Clicar Salvar
   - ✅ Esperado: Erro "Nome do status é obrigatório"

B. Porcentagem inválida:
   - Exclusão: PARCIAL
   - Porcentagem: -10
   - ✅ Esperado: Erro "Porcentagem deve estar entre 0 e 100"

C. Data invertida:
   - Data Início: 2026-02-10
   - Data Fim: 2026-02-01
   - ✅ Esperado: Erro "Data de início não pode ser maior que data de fim"

D. Porcentagem 0 em PARCIAL:
   - Exclusão: PARCIAL
   - Porcentagem: 0%
   - ✅ Esperado: Erro "Para exclusão parcial, defina > 0%"
```

### **Teste 7: Status Dinâmico em Funcionários**
```
1. Criar 3 novos status em Configurações
2. Vá para Funcionários
3. Clique em "Novo Funcionário"
4. No select de Status
5. ✅ Esperado: Status padrão + 3 novos status aparecem
6. Selecione um dos novos
7. ✅ Esperado: Pode salvar sem erro
```

### **Teste 8: Cálculo com Regras Aplicadas**
```
1. Criar status:
   - Nome: REGRA_TEST
   - VA: ✓
   - Cesta: ✓
   - Exclusão: PARCIAL 30%

2. Funcionário:
   - Salário: R$ 1000 (< teto)
   - Status: REGRA_TEST
   - Ausências: 2
   - Férias: 3 dias

3. Processar período

4. ✅ Esperado: 
   - VA não zerado (porque includesVA = true)
   - Cesta não zerada (porque includesBasket = true)
   - Ambos reduzidos em 30%
   - No debug.statusRulesApplied: vê as regras

5. Verificar JSON:
   {
     "statusRulesApplied": {
       "includesVA": true,
       "includesBasket": true,
       "exclusionType": "PARTIAL",
       "exclusionPercentage": 30
     }
   }
```

### **Teste 9: Múltiplos Funcionários com Status Diferentes**
```
1. Criar 4 status diferentes com exclusões variadas
2. Criar 4 funcionários, cada um com um status
3. Processar período
4. ✅ Esperado: 
   - Cada um tem cálculo diferente
   - Histórico audita mudanças
```

### **Teste 10: Editar Regras Não Afeta Histórico**
```
1. Criar status com VA = ✓
2. Atribuir a funcionário e processar período
3. Resultado 1 salvo com VA
4. Editar status para VA = ✗
5. Reprocessar período
6. Resultado 2 salvo sem VA
7. ✅ Esperado: Ambos os resultados estão corretos no histórico
```

---

## 📋 Checklist Final

- [ ] Migração SQL executada sem erros
- [ ] Componente StatusRulesModal renderiza corretamente
- [ ] Settings carrega status com ícones/badges
- [ ] Employee carrega status dinamicamente
- [ ] Modal valida todos os campos
- [ ] Status são salvos corretamente
- [ ] Cálculo aplica regras
- [ ] Debug mostra statusRulesApplied
- [ ] Sem erros no console
- [ ] Funciona em mobile
- [ ] Performance aceitável

---

## 🐛 Logs para Debug

Procure por esses logs no console para verificar se está funcionando:

```javascript
// Em browser console (F12)
// Verificar se statuses foram carregados
console.log(statusesData);

// Verificar se regras foram aplicadas
console.log(calculation.debug.statusRulesApplied);

// Verificar histórico
SELECT * FROM employee_status_history ORDER BY created_at DESC;
```

---

## 📊 Query de Verificação (Supabase SQL)

```sql
-- Ver todos os status com suas regras
SELECT 
  name,
  includes_va_calculation,
  includes_basket_calculation,
  exclusion_type,
  exclusion_percentage
FROM employee_statuses
WHERE status = 'ATIVO'
ORDER BY name;

-- Ver histórico de mudanças
SELECT 
  employee_id,
  old_status,
  new_status,
  created_by,
  created_at
FROM employee_status_history
ORDER BY created_at DESC
LIMIT 20;

-- Ver cálculos com regras aplicadas
SELECT 
  employee_name,
  va_value,
  basket_value,
  calculation_details->'statusRulesApplied' as regras_aplicadas
FROM period_results
WHERE calculation_details ? 'statusRulesApplied'
LIMIT 10;
```
