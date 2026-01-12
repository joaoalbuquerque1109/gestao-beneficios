/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export interface ParsedAbsence {
  employeeId: string;
  date: string;
  reason: string;
  type?: string; // Novo campo opcional
}

export const parseAbsences = async (file: File): Promise<ParsedAbsence[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  const absences: ParsedAbsence[] = [];

  jsonData.forEach((row) => {
    // 1. Matrícula
    const rawId = row['Matrícula'] || row['Matricula'] || row['ID'];
    const employeeId = String(rawId || '').trim(); 

    // 2. Data
    let dateStr = '';
    const rawDate = row['Data da Falta'] || row['Data'] || row['Dia'];

    if (typeof rawDate === 'number') {
      const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      dateStr = dateObj.toISOString().split('T')[0];
    } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/')) {
            const [d, m, y] = rawDate.split('/');
            dateStr = `${y}-${m}-${d}`;
        } else {
            dateStr = rawDate;
        }
    }

    // 3. Tipo da Falta (Crucial para o cálculo)
    // Procura por colunas: Tipo, Classificação, Type
    const rawType = row['Tipo'] || row['Classificação'] || row['Classificacao'] || row['Type'] || '';

    if (employeeId && dateStr) {
      absences.push({
        employeeId,
        date: dateStr,
        reason: row['Motivo'] || 'Falta Importada',
        type: rawType // Passa o valor para ser processado no backend
      });
    }
  });

  return absences;
};