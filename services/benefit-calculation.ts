/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBusinessDaysBetween } from '@/utils/date-helpers';

interface CalcParams {
  employee: any;
  unjustifiedAbsences: number; 
  justifiedAbsences: number;   
  vacationDays: number;        
  workingDays: number;         
  dailyValueVA: number;
  basketValue: number;
  basketLimit: number;
  periodId: string;
  adjustmentsTotal: number;
}

export const calculateBenefit = (params: CalcParams) => {
  const { 
    employee, 
    unjustifiedAbsences, 
    justifiedAbsences, 
    vacationDays,
    workingDays, 
    dailyValueVA, 
    basketValue, 
    basketLimit, 
    periodId,
    adjustmentsTotal
  } = params;
  
  // Se for Aviso Prévio Trabalhado, zera todos os benefícios
  if (employee.status === 'AVISO PREVIO TRABALHADO' && employee.status === 'AVISO PRÉVIO TRABALHADO') {
    return {
        daysWorked: 0,
        vaValue: 0,
        basketValue: 0,
        total: 0 + adjustmentsTotal,
        debug: {
            message: "Funcionário em Aviso Prévio Trabalhado - Benefícios zerados."
        }
    };
  }
  // ----------------------------------

  // 1. Regra de Admissão Proporcional (Baseada em dias úteis para o VA)
  let effectiveDays = workingDays;

  if (employee.admission_date) {
    const [pYear, pMonth] = periodId.split('-').map(Number);
    const admDate = new Date(employee.admission_date);
    
    if (admDate.getFullYear() === pYear && (admDate.getMonth() + 1) === pMonth) {
      const endOfMonth = new Date(pYear, pMonth, 0);
      const days = getBusinessDaysBetween(admDate, endOfMonth);
      effectiveDays = Math.min(days, workingDays);
    }
  }

  // 2. Cálculo VA (Mantém lógica de Dias Úteis - Tolerância 0)
  const totalAbsencesForVA = unjustifiedAbsences + vacationDays + justifiedAbsences;
  const vaPotential = effectiveDays * dailyValueVA;
  const vaDiscount = totalAbsencesForVA * dailyValueVA;
  const vaFinal = Math.max(0, vaPotential - vaDiscount);

  // 3. Cálculo Cesta Básica (Base Comercial 30 Dias)
  let basketFinal = 0;
  let basketDaysToPay = 0;
  let discountableJustified = 0;

  if (Number(employee.salary) <= basketLimit) {
    
    // --- CONVERSÃO PARA BASE 30 ---
    const COMMERCIAL_MONTH = 30;
    
    // Se o funcionário trabalhou o mês todo (dias úteis), ele tem direito a 30 dias comerciais.
    // Se foi admissão parcial, fazemos a regra de três.
    let employeeBaseDays = COMMERCIAL_MONTH;
    if (effectiveDays < workingDays && workingDays > 0) {
        employeeBaseDays = (effectiveDays / workingDays) * COMMERCIAL_MONTH;
    }

    // Regra da Tolerância de 5 dias (Cliff Effect)
    if (justifiedAbsences > 5) {
        discountableJustified = justifiedAbsences;
    }

    // Total de dias a descontar (na base 30)
    // Assumimos que cada dia de atestado/férias representa 1 dia comercial
    const daysLost = vacationDays + discountableJustified;
    
    // Dias efetivos a receber (Ex: 30 - 6 = 24)
    basketDaysToPay = Math.max(0, employeeBaseDays - daysLost);
    
    // Cálculo do Valor: (Valor Cheio / 30) * Dias a Pagar
    // Ex: (142.05 / 30) * 24 = 113.64
    const baseValue = (basketValue / COMMERCIAL_MONTH) * basketDaysToPay;

    // Penalidade por Faltas Injustificadas
    let penalty = 0;
    if (unjustifiedAbsences === 1) penalty = 0.25;
    else if (unjustifiedAbsences === 2) penalty = 0.50;
    else if (unjustifiedAbsences >= 3) penalty = 1.00;

    basketFinal = Math.max(0, baseValue * (1 - penalty));
  }

  const totalFinal = vaFinal + basketFinal + adjustmentsTotal;

  return {
    daysWorked: effectiveDays,
    vaValue: vaFinal,
    basketValue: basketFinal,
    total: totalFinal, 
    debug: { 
        totalAbsencesForVA, 
        unjustifiedAbsences, 
        justifiedAbsences, 
        discountableJustified, 
        vacationDays,
        adjustmentsTotal,
        basketDaysToPay // Campo atualizado para debug (base 30)
    }
  };
};