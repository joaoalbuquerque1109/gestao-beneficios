/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBusinessDaysBetween } from '@/utils/date-helpers';

interface CalcParams {
  employee: any;
  absencesCount: number;
  workingDays: number;
  dailyValueVA: number; // R$ 15.00
  basketValue: number;  // R$ 142.05
  basketLimit: number;  // R$ 1780.00
  periodId: string;
}

export const calculateBenefit = (params: CalcParams) => {
  const { employee, absencesCount, workingDays, dailyValueVA, basketValue, basketLimit, periodId } = params;
  
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

  // 2. Cálculo VA (Dias Úteis - Faltas)
  const vaPotential = effectiveDays * dailyValueVA;
  const vaDiscount = absencesCount * dailyValueVA;
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
    // 1 falta = 25% desc, 2 faltas = 50% desc, 3+ faltas = 100% desc (perde tudo)
    let penalty = 0;
    if (absencesCount === 1) penalty = 0.25;
    else if (absencesCount === 2) penalty = 0.50;
    else if (absencesCount >= 3) penalty = 1.00;

    basketFinal = Math.max(0, baseValue * (1 - penalty));
  }

  return {
    daysWorked: effectiveDays,
    vaValue: vaFinal,
    basketValue: basketFinal,
    total: vaFinal + basketFinal
  };
};