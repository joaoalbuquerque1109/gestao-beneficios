/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export interface ParsedAbsence {
  employeeId: string;
  date: string;
  reason: string;
  type?: string;
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

    // 2. Data Base (Data de Início)
    let baseDate: Date | null = null;
    const rawDate = row['Data da Falta'] || row['Data'] || row['Dia'];

    if (typeof rawDate === 'number') {
      // Conversão de data Excel
      baseDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/')) {
            const [d, m, y] = rawDate.split('/');
            // Cria data UTC para evitar problemas de fuso horário na conversão
            baseDate = new Date(Number(y), Number(m) - 1, Number(d));
        } else {
            baseDate = new Date(rawDate);
        }
    }

    // 3. Quantidade de Dias (NOVO)
    // Procura por colunas: Quantidade, Qtd, Dias
    const rawQty = row['Quantidade de faltas'] || row['Quantidade'] || row['Qtd'] || row['Dias'] || 1;
    const quantity = Math.max(1, parseInt(String(rawQty), 10)); // Garante pelo menos 1 dia

    // 4. Tipo e Motivo
    const rawType = row['Tipo'] || row['Classificação'] || row['Classificacao'] || row['Type'] || '';
    const reason = row['Motivo'] || 'Falta Importada';

    // 5. Geração das linhas (Loop pela quantidade)
    if (employeeId && baseDate && !isNaN(baseDate.getTime())) {
      for (let i = 0; i < quantity; i++) {
        // Cria uma cópia da data para não alterar a original e soma os dias
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        
        // Formata YYYY-MM-DD
        const dateStr = currentDate.toISOString().split('T')[0];

        absences.push({
          employeeId,
          date: dateStr,
          reason: quantity > 1 ? `${reason} (${i + 1}/${quantity})` : reason, // Ex: Atestado (1/3)
          type: rawType 
        });
      }
    }
  });

  return absences;
};