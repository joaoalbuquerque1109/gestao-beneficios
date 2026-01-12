/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBusinessDaysBetween } from '@/utils/date-helpers';

interface CalcParams {
  employee: any;
  unjustifiedAbsences: number; // Faltas Injustificadas (Afetam Cesta e VA)
  justifiedAbsences: number;   // Férias, Atestados, INSS (Afetam apenas VA)
  workingDays: number;
  dailyValueVA: number;
  basketValue: number;
  basketLimit: number;
  periodId: string;
}

export const calculateBenefit = (params: CalcParams) => {
  const { 
    employee, 
    unjustifiedAbsences, 
    justifiedAbsences, 
    workingDays, 
    dailyValueVA, 
    basketValue, 
    basketLimit, 
    periodId 
  } = params;
  
  // 1. Regra de Admissão Proporcional
  let effectiveDays = workingDays;
  let isNewAdmission = false;

  if (employee.admission_date) {
    const [pYear, pMonth] = periodId.split('-').map(Number);
    const admDate = new Date(employee.admission_date);
    // Se admitido no mesmo mês/ano da competência
    if (admDate.getFullYear() === pYear && (admDate.getMonth() + 1) === pMonth) {
      isNewAdmission = true;
      const endOfMonth = new Date(pYear, pMonth, 0);
      const days = getBusinessDaysBetween(admDate, endOfMonth);
      effectiveDays = Math.min(days, workingDays);
    }
  }

  // 2. Cálculo VA (Dias Úteis - Faltas Totais)
  // O VA deve ser descontado por QUALQUER dia não trabalhado (Injustificado ou Justificado/Férias)
  const totalAbsences = unjustifiedAbsences + justifiedAbsences;
  
  const vaPotential = effectiveDays * dailyValueVA;
  const vaDiscount = totalAbsences * dailyValueVA;
  const vaFinal = Math.max(0, vaPotential - vaDiscount);

  // 3. Cálculo Cesta (Regra do Teto e Escalonamento de Faltas)
  let basketFinal = 0;
  
  if (Number(employee.salary) <= basketLimit) {
    let baseValue = basketValue;
    
    // Proporcional se for admissão
    if (isNewAdmission && workingDays > 0) {
        baseValue = (basketValue / workingDays) * effectiveDays;
    }

    // Regra de Penalidade por Faltas
    // Apenas faltas INJUSTIFICADAS aplicam penalidade na cesta
    // 1 falta = 25% desc, 2 faltas = 50% desc, 3+ faltas = 100% desc
    let penalty = 0;
    if (unjustifiedAbsences === 1) penalty = 0.25;
    else if (unjustifiedAbsences === 2) penalty = 0.50;
    else if (unjustifiedAbsences >= 3) penalty = 1.00;

    basketFinal = Math.max(0, baseValue * (1 - penalty));
  }

  return {
    daysWorked: effectiveDays,
    vaValue: vaFinal,
    basketValue: basketFinal,
    total: vaFinal + basketFinal,
    debug: { totalAbsences, unjustifiedAbsences, penaltyApplied: unjustifiedAbsences >= 1 }
  };
};