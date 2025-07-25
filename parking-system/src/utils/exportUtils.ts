import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatBrazilianCurrency, formatCurrencyBR } from './formatters';

// Interfaces para tipagem
interface ExportData {
  summary: {
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
    totalEntries: number;
    totalExits: number;
    currentlyParked: number;
    averageRevenue: number;
    vehicleTypes: {
      cars: number;
      motorcycles: number;
    };
    occupancyRate: number;
  };
  dailyData: Array<{
    date: string;
    entries: number;
    exits: number;
    revenue: number;
  }>;
  operations: Array<{
    id: string;
    type: string;
    plate: string;
    spot: string;
    date: string;
    time: string;
    fee: number;
    duration: number;
    timestamp: string;
  }>;
  vehicles: {
    parked: Array<{
      id: string;
      plate: string;
      type: string;
      model: string;
      color: string;
      ownerName: string;
      ownerPhone: string;
      spot: string;
      entryTime: string;
      status: string;
    }>;
    exited: Array<{
      id: string;
      plate: string;
      type: string;
      model: string;
      color: string;
      ownerName: string;
      ownerPhone: string;
      spot: string;
      entryTime: string;
      exitTime: string;
      duration: string;
      fee: string;
      status: string;
    }>;
  };
}

// Fetch export data from backend
export async function fetchExportData(startDate?: string, endDate?: string): Promise<ExportData> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';
    const response = await fetch(`${backendUrl}/reports/export?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching export data:', error);
    throw error;
  }
}

// Export to PDF
export async function exportToPDF(data: ExportData, filename: string = 'relatorio-estacionamento.pdf') {
  try {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Relatório de Estacionamento', 20, 20);
    
    // Summary section
    doc.setFontSize(14);
    doc.text('Resumo do Período', 20, 40);
    
    doc.setFontSize(10);
    let yPos = 50;
    
    doc.text(`Período: ${data.summary.periodStart} até ${data.summary.periodEnd}`, 20, yPos);
    yPos += 10;
    doc.text(`Receita Total: ${formatCurrencyBR(data.summary.totalRevenue)}`, 20, yPos);
    yPos += 10;
    doc.text(`Total de Entradas: ${data.summary.totalEntries}`, 20, yPos);
    yPos += 10;
    doc.text(`Total de Saídas: ${data.summary.totalExits}`, 20, yPos);
    yPos += 10;
    doc.text(`Atualmente Estacionados: ${data.summary.currentlyParked}`, 20, yPos);
    yPos += 10;
    doc.text(`Taxa de Ocupação: ${data.summary.occupancyRate.toFixed(1)}%`, 20, yPos);
    yPos += 10;
    doc.text(`Carros: ${data.summary.vehicleTypes.cars} | Motos: ${data.summary.vehicleTypes.motorcycles}`, 20, yPos);
    
    // Daily data section
    yPos += 20;
    doc.setFontSize(14);
    doc.text('Dados Diários', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(8);
    doc.text('Data', 20, yPos);
    doc.text('Entradas', 60, yPos);
    doc.text('Saídas', 100, yPos);
    doc.text('Receita', 140, yPos);
    yPos += 5;
    
    data.dailyData.forEach((day) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(day.date, 20, yPos);
      doc.text(day.entries.toString(), 60, yPos);
      doc.text(day.exits.toString(), 100, yPos);
      doc.text(formatCurrencyBR(day.revenue), 140, yPos);
      yPos += 5;
    });
    
    // Operations section
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Operações Recentes', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(8);
    doc.text('Tipo', 20, yPos);
    doc.text('Placa', 40, yPos);
    doc.text('Vaga', 70, yPos);
    doc.text('Data', 90, yPos);
    doc.text('Hora', 120, yPos);
    doc.text('Taxa', 150, yPos);
    yPos += 5;
    
    data.operations.slice(0, 30).forEach((op) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(op.type, 20, yPos);
      doc.text(op.plate, 40, yPos);
      doc.text(op.spot, 70, yPos);
      doc.text(op.date, 90, yPos);
      doc.text(op.time, 120, yPos);
      doc.text(formatCurrencyBR(op.fee), 150, yPos);
      yPos += 5;
    });
    
    // Save the PDF
    doc.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Export to Excel
export async function exportToExcel(data: ExportData, filename: string = 'relatorio-estacionamento.xlsx') {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Relatório de Estacionamento', ''],
      ['', ''],
      ['Período de:', data.summary.periodStart],
      ['Período até:', data.summary.periodEnd],
      ['', ''],
      ['Receita Total:', formatCurrencyBR(data.summary.totalRevenue)],
      ['Total de Entradas:', data.summary.totalEntries],
      ['Total de Saídas:', data.summary.totalExits],
      ['Atualmente Estacionados:', data.summary.currentlyParked],
      ['Taxa de Ocupação:', `${data.summary.occupancyRate.toFixed(1)}%`],
      ['', ''],
      ['Distribuição por Tipo:', ''],
      ['Carros:', data.summary.vehicleTypes.cars],
      ['Motos:', data.summary.vehicleTypes.motorcycles],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    
    // Daily data sheet
    const dailyHeaders = ['Data', 'Entradas', 'Saídas', 'Receita'];
    const dailyData = data.dailyData.map(day => [
      day.date,
      day.entries,
      day.exits,
      day.revenue
    ]);
    
    const dailySheet = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyData]);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Dados Diários');
    
    // Operations sheet
    const operationsHeaders = ['Tipo', 'Placa', 'Vaga', 'Data', 'Hora', 'Taxa', 'Duração'];
    const operationsData = data.operations.map(op => [
      op.type,
      op.plate,
      op.spot,
      op.date,
      op.time,
      op.fee,
      op.duration
    ]);
    
    const operationsSheet = XLSX.utils.aoa_to_sheet([operationsHeaders, ...operationsData]);
    XLSX.utils.book_append_sheet(workbook, operationsSheet, 'Operações');
    
    // Parked vehicles sheet
    const parkedHeaders = ['Placa', 'Tipo', 'Modelo', 'Cor', 'Proprietário', 'Telefone', 'Vaga', 'Entrada', 'Status'];
    const parkedData = data.vehicles.parked.map(vehicle => [
      vehicle.plate,
      vehicle.type,
      vehicle.model,
      vehicle.color,
      vehicle.ownerName,
      vehicle.ownerPhone,
      vehicle.spot,
      vehicle.entryTime,
      vehicle.status
    ]);
    
    const parkedSheet = XLSX.utils.aoa_to_sheet([parkedHeaders, ...parkedData]);
    XLSX.utils.book_append_sheet(workbook, parkedSheet, 'Veículos Estacionados');
    
    // Exited vehicles sheet
    const exitedHeaders = ['Placa', 'Tipo', 'Modelo', 'Cor', 'Proprietário', 'Telefone', 'Vaga', 'Entrada', 'Saída', 'Duração', 'Taxa', 'Status'];
    const exitedData = data.vehicles.exited.map(vehicle => [
      vehicle.plate,
      vehicle.type,
      vehicle.model,
      vehicle.color,
      vehicle.ownerName,
      vehicle.ownerPhone,
      vehicle.spot,
      vehicle.entryTime,
      vehicle.exitTime,
      vehicle.duration,
      vehicle.fee,
      vehicle.status
    ]);
    
    const exitedSheet = XLSX.utils.aoa_to_sheet([exitedHeaders, ...exitedData]);
    XLSX.utils.book_append_sheet(workbook, exitedSheet, 'Veículos que Saíram');
    
    // Save the Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
    
    return true;
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
}

// Export to CSV
export async function exportToCSV(data: ExportData, filename: string = 'relatorio-estacionamento.csv') {
  try {
    // Create CSV content
    let csvContent = 'Relatório de Estacionamento\n\n';
    
    // Summary section
    csvContent += 'RESUMO DO PERÍODO\n';
    csvContent += `Período de:,${data.summary.periodStart}\n`;
    csvContent += `Período até:,${data.summary.periodEnd}\n`;
    csvContent += `Receita Total:,${formatCurrencyBR(data.summary.totalRevenue)}\n`;
    csvContent += `Total de Entradas:,${data.summary.totalEntries}\n`;
    csvContent += `Total de Saídas:,${data.summary.totalExits}\n`;
    csvContent += `Atualmente Estacionados:,${data.summary.currentlyParked}\n`;
    csvContent += `Taxa de Ocupação:,${data.summary.occupancyRate.toFixed(1)}%\n`;
    csvContent += `Carros:,${data.summary.vehicleTypes.cars}\n`;
    csvContent += `Motos:,${data.summary.vehicleTypes.motorcycles}\n\n`;
    
    // Daily data section
    csvContent += 'DADOS DIÁRIOS\n';
    csvContent += 'Data,Entradas,Saídas,Receita\n';
    data.dailyData.forEach(day => {
      csvContent += `${day.date},${day.entries},${day.exits},${day.revenue}\n`;
    });
    csvContent += '\n';
    
    // Operations section
    csvContent += 'OPERAÇÕES\n';
    csvContent += 'Tipo,Placa,Vaga,Data,Hora,Taxa,Duração\n';
    data.operations.forEach(op => {
      csvContent += `${op.type},${op.plate},${op.spot},${op.date},${op.time},${op.fee},${op.duration}\n`;
    });
    csvContent += '\n';
    
    // Parked vehicles section
    csvContent += 'VEÍCULOS ESTACIONADOS\n';
    csvContent += 'Placa,Tipo,Modelo,Cor,Proprietário,Telefone,Vaga,Entrada,Status\n';
    data.vehicles.parked.forEach(vehicle => {
      csvContent += `${vehicle.plate},${vehicle.type},${vehicle.model},${vehicle.color},${vehicle.ownerName},${vehicle.ownerPhone},${vehicle.spot},${vehicle.entryTime},${vehicle.status}\n`;
    });
    csvContent += '\n';
    
    // Exited vehicles section
    csvContent += 'VEÍCULOS QUE SAÍRAM\n';
    csvContent += 'Placa,Tipo,Modelo,Cor,Proprietário,Telefone,Vaga,Entrada,Saída,Duração,Taxa,Status\n';
    data.vehicles.exited.forEach(vehicle => {
      csvContent += `${vehicle.plate},${vehicle.type},${vehicle.model},${vehicle.color},${vehicle.ownerName},${vehicle.ownerPhone},${vehicle.spot},${vehicle.entryTime},${vehicle.exitTime},${vehicle.duration},${vehicle.fee},${vehicle.status}\n`;
    });
    
    // Create and save CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
    
    return true;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
}

// Main export function
export async function exportReport(format: 'pdf' | 'excel' | 'csv', startDate?: string, endDate?: string) {
  try {
    const data = await fetchExportData(startDate, endDate);
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `relatorio-estacionamento-${today}`;
    
    switch (format) {
      case 'pdf':
        await exportToPDF(data, `${filename}.pdf`);
        break;
      case 'excel':
        await exportToExcel(data, `${filename}.xlsx`);
        break;
      case 'csv':
        await exportToCSV(data, `${filename}.csv`);
        break;
      default:
        throw new Error('Formato de exportação não suportado');
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
}