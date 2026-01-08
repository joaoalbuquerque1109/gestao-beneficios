export const getBusinessDaysInMonth = (year: number, month: number): number => {
  const date = new Date(year, month, 1);
  let days = 0;
  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++; // 0=Dom, 6=Sab
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getBusinessDaysBetween = (start: Date, end: Date): number => {
  let days = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
    curr.setDate(curr.getDate() + 1);
  }
  return days;
};

// Calcula a janela de faltas (Ex: 15 do mês anterior até 14 do atual)
export const getCalculationRange = (periodId: string, cutoffDay: number = 15) => {
  const [yearStr, monthStr] = periodId.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-12

  // Fim: Dia de corte do mês atual
  const end = new Date(year, month - 1, cutoffDay);
  
  // Início: Dia de corte do mês anterior
  // Tratamento para Janeiro (mês 1) virar Dezembro do ano anterior
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const start = new Date(prevYear, prevMonth - 1, cutoffDay);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};