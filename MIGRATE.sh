#!/bin/bash
# Script para executar a migração no Supabase
# Instruções: 
# 1. Acesse https://app.supabase.com
# 2. Selecione seu projeto
# 3. Vá para SQL Editor
# 4. Copie todo o conteúdo do arquivo migrations/add_employee_status_rules.sql
# 5. Cole no SQL Editor do Supabase e execute

# Alternativamente, você pode usar o Supabase CLI:
# npx supabase migration add add_employee_status_rules
# npx supabase db push

echo "Para aplicar a migração:"
echo ""
echo "OPÇÃO 1: Via Supabase Dashboard"
echo "1. Acesse https://app.supabase.com"
echo "2. Selecione seu projeto"
echo "3. Vá para SQL Editor"
echo "4. Abra o arquivo: migrations/add_employee_status_rules.sql"
echo "5. Copie TODO o conteúdo"
echo "6. Cole no editor SQL e execute"
echo ""
echo "OPÇÃO 2: Via Supabase CLI (se instalado)"
echo "npx supabase migration add add_employee_status_rules"
echo "npx supabase db push"
echo ""
echo "A migração adiciona:"
echo "✓ Novos campos à tabela employee_statuses"
echo "✓ Suporte para regras de cálculo de benefícios"
echo "✓ Tabela de histórico de mudanças de status"
echo "✓ View para facilitar queries"
