-- Migração: Adicionar tabela de regras de status de funcionários
-- Objetivo: Permitir configurar regras específicas para cada status (cálculo de benefícios, períodos, etc.)

-- 1. Adicionar novos campos à tabela employee_statuses (se ela existe)
-- Esta tabela provavelmente foi criada anteriormente
-- Verificamos se a tabela existe e adicionamos os novos campos

ALTER TABLE IF EXISTS employee_statuses 
ADD COLUMN IF NOT EXISTS includes_va_calculation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS includes_basket_calculation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS exclusion_type VARCHAR(10) DEFAULT NULL, -- 'TOTAL', 'PARTIAL', null para normal
ADD COLUMN IF NOT EXISTS exclusion_percentage DECIMAL(5,2) DEFAULT 0, -- Se exclusão parcial, qual %
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Adicionar campos à tabela employees para rastrear quando mudou o status com regras
ALTER TABLE IF EXISTS employees
ADD COLUMN IF NOT EXISTS status_change_date DATE DEFAULT NULL;

-- 3. Criar tabela de histórico de mudanças de status (para auditoria)
CREATE TABLE IF NOT EXISTS employee_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  status_start_date DATE,
  status_end_date DATE,
  reason TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_employee_status_history_employee_id 
ON employee_status_history(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_status_history_created_at 
ON employee_status_history(created_at);

-- 5. Atualizar os status existentes com valores padrão baseados em lógica comum
-- Status que normalmente excluem do cálculo (parcial ou total):
UPDATE employee_statuses 
SET 
  includes_va_calculation = false,
  includes_basket_calculation = false,
  exclusion_type = 'TOTAL'
WHERE name IN ('DEMITIDO', 'INATIVO', 'AVISO PREVIO TRABALHADO', 'AVISO PRÉVIO TRABALHADO');

-- Status de afastamento (INSS, doença) - excluem parcialmente
UPDATE employee_statuses 
SET 
  includes_va_calculation = false,
  includes_basket_calculation = true,
  exclusion_type = 'PARTIAL',
  exclusion_percentage = 50
WHERE name IN ('AFASTADO INSS', 'AFASTADO DOENCA', 'AFASTADO DOENÇA');

-- Status temporários (Férias, maternidade) - mantêm benefícios
UPDATE employee_statuses 
SET 
  includes_va_calculation = true,
  includes_basket_calculation = true,
  exclusion_type = NULL,
  exclusion_percentage = 0
WHERE name IN ('FERIAS', 'MATERNIDADE', 'MENOR APRENDIZ');

-- Status ativo (padrão)
UPDATE employee_statuses 
SET 
  includes_va_calculation = true,
  includes_basket_calculation = true,
  exclusion_type = NULL,
  exclusion_percentage = 0
WHERE name = 'ATIVO';

-- 6. Criar view para facilitar queries de status ativos com regras
CREATE OR REPLACE VIEW active_employee_statuses_with_rules AS
SELECT 
  id,
  name,
  status,
  includes_va_calculation,
  includes_basket_calculation,
  exclusion_type,
  exclusion_percentage,
  description
FROM employee_statuses
WHERE status = 'ATIVO'
ORDER BY name;
