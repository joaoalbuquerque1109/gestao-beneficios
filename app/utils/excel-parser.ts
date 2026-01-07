/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export interface ParsedAbsence {
  employeeId: string;
  date: string;
  reason: string;
}

export const parseAbsences = async (file: File): Promise<ParsedAbsence[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  const absences: ParsedAbsence[] = [];

  jsonData.forEach((row) => {
    // Tenta ler matrícula de várias colunas possíveis
    const rawId = row['Matrícula'] || row['Matricula'] || row['ID'];
    
    // Normaliza ID (remove zeros a esquerda se for apenas números, etc)
    // Aqui assumimos string direta para simplificar
    const employeeId = String(rawId).trim(); 

    // Tenta ler a data (Excel serial number ou String)
    let dateStr = '';
    const rawDate = row['Data da Falta'] || row['Data'] || row['Dia'];

    if (typeof rawDate === 'number') {
      // Converte número serial do Excel para JS Date
      const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      dateStr = dateObj.toISOString().split('T')[0];
    } else if (typeof rawDate === 'string') {
        // Tenta converter DD/MM/YYYY para YYYY-MM-DD
        if (rawDate.includes('/')) {
            const [d, m, y] = rawDate.split('/');
            dateStr = `${y}-${m}-${d}`;
        } else {
            dateStr = rawDate;
        }
    }

    if (employeeId && dateStr) {
      absences.push({
        employeeId,
        date: dateStr,
        reason: row['Motivo'] || 'Falta Importada'
      });
    }
  });

  return absences;
};