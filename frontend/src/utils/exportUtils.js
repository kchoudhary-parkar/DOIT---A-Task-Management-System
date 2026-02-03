import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

// [KEEP ALL PDF CODE AS IS - Starting from addPDFHeader through exportToPDF]
const addPDFHeader = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
 
  doc.setFillColor(0, 82, 204);
  doc.rect(0, 0, pageWidth, 60, 'F');

  const logoUrl = 'https://raw.githubusercontent.com/kchoudhary-parkar/task_management_system/refs/heads/main/frontend/src/doit.png';
  
  const logoX = 15;
  const logoY = 12;
  const logoWidth = 36;
  const logoHeight = 36;

  try {
    doc.addImage(logoUrl, 'ICO', logoX, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.warn('Failed to load logo:', err);
    doc.setFillColor(255, 255, 255);
    doc.circle(30, 30, 15, 'F');
    doc.setFillColor(0, 82, 204);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('D', 25, 36);
  }

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DOIT Dashboard Report', 62, 30);
};
 
const addPDFFooter = (doc, page, total) => {
  const height = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Page ${page} of ${total}`, 14, height - 10);
};
 
const addSectionHeader = (doc, title, y) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 245, 255);
  doc.rect(14, y - 8, width - 28, 12, 'F');
 
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 82, 204);
  doc.text(title, 18, y);
 
  return y + 15;
};
 
const addProgressBar = (doc, label, value, max, y, color) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const barWidth = pageWidth - 60;
  const percent = max > 0 ? value / max : 0;
 
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(label, 20, y);
  doc.text(`${value}/${max}`, pageWidth - 30, y, { align: 'right' });
 
  doc.setFillColor(229, 231, 235);
  doc.rect(20, y + 4, barWidth, 6, 'F');
 
  if (percent > 0) {
    doc.setFillColor(...color);
    doc.rect(20, y + 4, barWidth * percent, 6, 'F');
  }
 
  return y + 15;
};
 
const drawStyledTable = (doc, headers, rows, y) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 28) / headers.length;
 
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, 18 + i * colWidth, y));
  y += 8;
 
  doc.setFont('helvetica', 'normal');
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 18 + i * colWidth, y);
    });
    y += 8;
  });
 
  return y + 5;
};

const generateChartImage = (type, labels, datasets, options = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 600;
  canvas.height = options.height || 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (options.title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, canvas.width / 2, 30);
  }
  const chartArea = {
    x: 60,
    y: options.title ? 60 : 40,
    width: canvas.width - 160,
    height: canvas.height - (options.title ? 120 : 100)
  };
  if (type === 'pie' || type === 'doughnut') {
    drawPieChart(ctx, canvas.width / 2 - 80, chartArea.y + chartArea.height / 2, Math.min(chartArea.width, chartArea.height) / 2 - 20, labels, datasets[0].data, datasets[0].backgroundColor, type === 'doughnut');
    drawLegend(ctx, canvas.width - 140, chartArea.y + 20, labels, datasets[0].backgroundColor, datasets[0].data);
  } else if (type === 'bar') {
    if (options.indexAxis === 'y') {
      drawHorizontalBarChart(ctx, chartArea, labels, datasets, options.scales?.x?.stacked);
    } else {
      drawVerticalBarChart(ctx, chartArea, labels, datasets, options.scales?.x?.stacked);
    }
  } else if (type === 'line') {
    drawLineChart(ctx, chartArea, labels, datasets);
  }
  return canvas.toDataURL('image/png');
};

const drawPieChart = (ctx, centerX, centerY, radius, labels, data, colors, isDonut = false) => {
  const total = data.reduce((sum, val) => sum + val, 0);
  if (total === 0) return;
  let startAngle = -Math.PI / 2;
  const innerRadius = isDonut ? radius * 0.5 : 0;
  data.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    ctx.fillStyle = colors[index];
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    if (isDonut) {
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    } else {
      ctx.lineTo(centerX, centerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    const midAngle = startAngle + sliceAngle / 2;
    const labelRadius = isDonut ? (radius + innerRadius) / 2 : radius * 0.7;
    const labelX = centerX + Math.cos(midAngle) * labelRadius;
    const labelY = centerY + Math.sin(midAngle) * labelRadius;
    const percentage = ((value / total) * 100).toFixed(0);
    if (percentage > 5) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(percentage + '%', labelX, labelY);
    }
    startAngle = endAngle;
  });
  if (isDonut) {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 5);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Total', centerX, centerY + 15);
  }
};

const drawLegend = (ctx, x, y, labels, colors, data) => {
  const total = data.reduce((sum, val) => sum + val, 0);
  labels.forEach((label, i) => {
    const itemY = y + i * 30;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, itemY, 15, 15);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, itemY, 15, 15);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 20, itemY + 11);
    const percentage = total > 0 ? ((data[i] / total) * 100).toFixed(0) : 0;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${data[i]} (${percentage}%)`, x + 20, itemY + 23);
  });
};

const drawHorizontalBarChart = (ctx, area, labels, datasets, stacked = false) => {
  const barHeight = 30;
  const spacing = 15;
  const maxValue = stacked 
    ? Math.max(...labels.map((_, i) => datasets.reduce((sum, ds) => sum + (ds.data[i] || 0), 0)))
    : Math.max(...datasets.flatMap(ds => ds.data));
  labels.forEach((label, i) => {
    const y = area.y + i * (barHeight + spacing);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(label.length > 20 ? label.substring(0, 17) + '...' : label, area.x - 10, y + barHeight / 2 + 4);
    let xOffset = area.x;
    datasets.forEach(dataset => {
      const value = dataset.data[i] || 0;
      const barWidth = (value / maxValue) * area.width;
      ctx.fillStyle = dataset.backgroundColor;
      ctx.fillRect(xOffset, y, barWidth, barHeight);
      if (barWidth > 30) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(value.toString(), xOffset + 5, y + barHeight / 2 + 4);
      }
      if (stacked) {
        xOffset += barWidth;
      }
    });
  });
  if (datasets.length > 1) {
    let legendX = area.x;
    datasets.forEach(dataset => {
      ctx.fillStyle = dataset.backgroundColor;
      ctx.fillRect(legendX, area.y + area.height + 20, 15, 15);
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label, legendX + 20, area.y + area.height + 31);
      legendX += ctx.measureText(dataset.label).width + 50;
    });
  }
};

const drawVerticalBarChart = (ctx, area, labels, datasets) => {
  const barWidth = (area.width / labels.length) - 10;
  const maxValue = Math.max(...datasets.flatMap(ds => ds.data));
  labels.forEach((label, i) => {
    const x = area.x + i * (area.width / labels.length);
    datasets.forEach((dataset, dsIndex) => {
      const value = dataset.data[i] || 0;
      const barHeight = (value / maxValue) * area.height;
      const barX = x + dsIndex * (barWidth / datasets.length);
      const barY = area.y + area.height - barHeight;
      ctx.fillStyle = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : dataset.backgroundColor;
      ctx.fillRect(barX, barY, barWidth / datasets.length, barHeight);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value + (dataset.label === 'Completion %' ? '%' : ''), barX + (barWidth / datasets.length) / 2, barY - 5);
    });
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + barWidth / 2, area.y + area.height + 15);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(label.length > 15 ? label.substring(0, 12) + '...' : label, 0, 0);
    ctx.restore();
  });
};

const drawLineChart = (ctx, area, labels, datasets) => {
  const maxValue = Math.max(...datasets.flatMap(ds => ds.data));
  const stepX = area.width / (labels.length - 1);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = area.y + (area.height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.width, y);
    ctx.stroke();
  }
  datasets.forEach(dataset => {
    ctx.strokeStyle = dataset.borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    dataset.data.forEach((value, i) => {
      const x = area.x + i * stepX;
      const y = area.y + area.height - (value / maxValue) * area.height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    dataset.data.forEach((value, i) => {
      const x = area.x + i * stepX;
      const y = area.y + area.height - (value / maxValue) * area.height;
      ctx.fillStyle = dataset.borderColor;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    if (dataset.fill) {
      ctx.fillStyle = dataset.backgroundColor;
      ctx.beginPath();
      dataset.data.forEach((value, i) => {
        const x = area.x + i * stepX;
        const y = area.y + area.height - (value / maxValue) * area.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(area.x + area.width, area.y + area.height);
      ctx.lineTo(area.x, area.y + area.height);
      ctx.closePath();
      ctx.fill();
    }
  });
  labels.forEach((label, i) => {
    const x = area.x + i * stepX;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, area.y + area.height + 20);
  });
};

export const exportToPDF = async (analytics, userName) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    addPDFHeader(doc);
    let y = 80;

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated for: ${userName}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(12);
    doc.text(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 25;

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Total Tasks: ${analytics?.task_stats?.total || 0}`, 20, y);
    doc.text(`In Progress: ${analytics?.task_stats?.in_progress || 0}`, 20, y + 8);
    doc.text(`Pending: ${analytics?.task_stats?.pending || 0}`, 20, y + 16);
    doc.text(`Overdue: ${analytics?.task_stats?.overdue || 0}`, 20, y + 24);
    y += 45;

    y = addSectionHeader(doc, 'Task Progress Overview', y);
    y = addProgressBar(doc, 'In Progress', analytics.task_stats?.in_progress || 0, analytics.task_stats?.total || 0, y, [59, 130, 246]);
    y = addProgressBar(doc, 'Pending', analytics.task_stats?.pending || 0, analytics.task_stats?.total || 0, y, [245, 158, 11]);
    y = addProgressBar(doc, 'Overdue', analytics.task_stats?.overdue || 0, analytics.task_stats?.total || 0, y, [239, 68, 68]);

    if (analytics.status_distribution) {
      y += 10;
      y = addSectionHeader(doc, 'Status Distribution', y);

      const statusData = Object.entries(analytics.status_distribution).map(([status, count]) => {
        const percentage = analytics.task_stats?.total > 0 ? `${((count / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%';
        return [status, count, percentage];
      });

      y = drawStyledTable(doc, ['Status', 'Count', 'Percentage'], statusData, y);
    }

    doc.addPage();
    addPDFHeader(doc);
    y = 75;
    
    if (analytics.status_distribution) {
      y = addSectionHeader(doc, 'Task Status Distribution Chart', y);
      const statusColors = {
        'To Do': '#94a3b8',
        'In Progress': '#3b82f6',
        'Testing': '#f59e0b',
        'Dev Complete': '#8b5cf6',
        'Done': '#10b981',
        'Closed': '#6366f1'
      };
      const statusEntries = Object.entries(analytics.status_distribution).filter(([, value]) => value > 0);
      const chartImg = generateChartImage(
        'pie',
        statusEntries.map(([name]) => name),
        [{
          data: statusEntries.map(([, value]) => value),
          backgroundColor: statusEntries.map(([name]) => statusColors[name] || '#94a3b8')
        }],
        { title: 'Task Status Distribution', width: 500, height: 280 }
      );
      doc.addImage(chartImg, 'PNG', 15, y, 180, 100);
      y += 110;
    }

    if (analytics.priority_distribution) {
      y = addSectionHeader(doc, 'Task Priority Distribution Chart', y);
      const priorityColors = {
        'High': '#ef4444',
        'Medium': '#f59e0b',
        'Low': '#94a3b8'
      };
      const priorityEntries = Object.entries(analytics.priority_distribution).filter(([, value]) => value > 0);
      const priorityChartImg = generateChartImage(
        'pie',
        priorityEntries.map(([name]) => name),
        [{
          data: priorityEntries.map(([, value]) => value),
          backgroundColor: priorityEntries.map(([name]) => priorityColors[name] || '#94a3b8')
        }],
        { title: 'Task Priority Distribution', width: 500, height: 280 }
      );
      doc.addImage(priorityChartImg, 'PNG', 15, y, 180, 100);
    }

    if (analytics.project_progress?.length > 0) {
      doc.addPage();
      addPDFHeader(doc);
      y = 75;

      y = addSectionHeader(doc, 'Project Progress Overview', y);
      
      const projectNames = analytics.project_progress.map(p => p.project_name || 'Unknown');
      const completedTasks = analytics.project_progress.map(p => p.completed_tasks || 0);
      const totalTasks = analytics.project_progress.map(p => p.total_tasks || 0);
      
      const barChartImg = generateChartImage(
        'bar',
        projectNames,
        [
          {
            label: 'Completed',
            data: completedTasks,
            backgroundColor: '#10b981'
          },
          {
            label: 'Total',
            data: totalTasks,
            backgroundColor: '#94a3b8'
          }
        ],
        { 
          title: 'Project Progress: Total vs Completed Tasks', 
          width: 600, 
          height: 350,
          indexAxis: 'x'
        }
      );
      doc.addImage(barChartImg, 'PNG', 10, y, 190, 110);
      y += 125;

      y = addSectionHeader(doc, 'Project Statistics Details', y);
      const projectData = analytics.project_progress.slice(0, 10).map(project => [
        project.project_name || 'Unknown',
        project.total_tasks || 0,
        project.completed_tasks || 0,
        `${project.progress_percentage || 0}%`
      ]);
      y = drawStyledTable(doc, ['Project', 'Total', 'Completed', 'Progress'], projectData, y);
    }

    if (analytics.upcoming_deadlines?.length > 0) {
      doc.addPage();
      addPDFHeader(doc);
      y = 75;

      y = addSectionHeader(doc, 'Upcoming Deadlines', y);

      const deadlineData = analytics.upcoming_deadlines.slice(0, 15).map(task => {
        const dueDate = new Date(task.due_date);
        const daysText = task.days_until < 0 ? `Overdue ${Math.abs(task.days_until)}d` : `${task.days_until}d`;
        return [
          task.title.substring(0, 30),
          task.project_name.substring(0, 20),
          dueDate.toLocaleDateString(),
          daysText
        ];
      });

      y = drawStyledTable(doc, ['Task', 'Project', 'Due Date', 'Days'], deadlineData, y);
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPDFFooter(doc, i, totalPages);
    }

    doc.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

// ==================== ENHANCED EXCEL EXPORT WITH EXCELJS ====================
export const exportToExcel = async (analytics, report, userName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = userName;
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // ==================== EXECUTIVE SUMMARY ====================
    const summarySheet = workbook.addWorksheet('Executive Summary', {
      pageSetup: { paperSize: 9, orientation: 'portrait' }
    });

    // Title Section
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'DOIT DASHBOARD REPORT';
    titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:D2');
    const subtitleCell = summarySheet.getCell('A2');
    subtitleCell.value = `Generated for: ${userName} | Date: ${currentDate}`;
    subtitleCell.font = { name: 'Calibri', size: 11, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
    summarySheet.getRow(2).height = 20;

    summarySheet.addRow([]);

    // Key Performance Indicators
    summarySheet.addRow(['KEY PERFORMANCE INDICATORS']).font = { bold: true, size: 14 };
    summarySheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } };
    
    const kpiHeaders = summarySheet.addRow(['Metric', 'Value', 'Status', 'Trend']);
    kpiHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
    kpiHeaders.alignment = { horizontal: 'center', vertical: 'middle' };

    const completionRate = analytics.task_stats?.total > 0 
      ? ((analytics.task_stats.closed / analytics.task_stats.total) * 100).toFixed(1)
      : '0.0';
    
    const kpiData = [
      ['Completion Rate', `${completionRate}%`, parseFloat(completionRate) >= 70 ? 'Good' : 'Needs Improvement', parseFloat(completionRate) >= 70 ? '↑' : '↓'],
      ['Total Tasks', analytics.task_stats?.total || 0, 'Active', '→'],
      ['In Progress', analytics.task_stats?.in_progress || 0, 'Active', '→'],
      ['Overdue', analytics.task_stats?.overdue || 0, (analytics.task_stats?.overdue || 0) === 0 ? 'Excellent' : 'Review Required', (analytics.task_stats?.overdue || 0) === 0 ? '✓' : '!']
    ];

    kpiData.forEach((row, idx) => {
      const excelRow = summarySheet.addRow(row);
      excelRow.getCell(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: row[2].includes('Good') || row[2].includes('Excellent') ? 'FFD4EDDA' : row[2].includes('Review') ? 'FFF8D7DA' : 'FFFFEAA7' }
      };
      if (idx % 2 === 0) {
        excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });

    summarySheet.addRow([]);

    // Status Distribution Chart
    if (analytics.status_distribution) {
      summarySheet.addRow(['TASK STATUS DISTRIBUTION']).font = { bold: true, size: 14 };
      summarySheet.getCell(`A${summarySheet.lastRow.number}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } };

      const statusHeaders = summarySheet.addRow(['Status', 'Count', 'Percentage']);
      statusHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      statusHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };

      const statusOrder = ['To Do', 'In Progress', 'Testing', 'Dev Complete', 'Done', 'Closed'];
      const total = Object.values(analytics.status_distribution).reduce((sum, count) => sum + count, 0);
      
      const chartStartRow = summarySheet.lastRow.number + 1;
      statusOrder.forEach((status, idx) => {
        const count = analytics.status_distribution[status] || 0;
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        const row = summarySheet.addRow([status, count, parseFloat(percentage)]);
        
        if (idx % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        }
        
        // Format percentage cell
        row.getCell(3).numFmt = '0.0"%"';
      });

      // Add Bar Chart for Status Distribution
      const chartEndRow = summarySheet.lastRow.number;
      const statusChart = summarySheet.addImage(
        workbook.addImage({
          base64: generateChartImage(
            'bar',
            statusOrder,
            [{
              label: 'Tasks',
              data: statusOrder.map(s => analytics.status_distribution[s] || 0),
              backgroundColor: '#3b82f6'
            }],
            { title: 'Status Distribution', width: 600, height: 300 }
          ),
          extension: 'png'
        }),
        {
          tl: { col: 4.5, row: chartStartRow - 1 },
          ext: { width: 400, height: 250 }
        }
      );
    }

    // Priority Distribution with Pie Chart
    summarySheet.addRow([]);
    summarySheet.addRow(['PRIORITY DISTRIBUTION']).font = { bold: true, size: 14 };
    summarySheet.getCell(`A${summarySheet.lastRow.number}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } };

    const priorityHeaders = summarySheet.addRow(['Priority', 'Count', 'Percentage']);
    priorityHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    priorityHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };

    const priorities = ['High', 'Medium', 'Low'];
    const priorityChartStart = summarySheet.lastRow.number + 1;
    
    priorities.forEach((priority, idx) => {
      const count = analytics.priority_distribution?.[priority] || 0;
      const percentage = analytics.task_stats?.total > 0
        ? ((count / analytics.task_stats.total) * 100).toFixed(1)
        : '0.0';
      const row = summarySheet.addRow([priority, count, parseFloat(percentage)]);
      
      row.getCell(3).numFmt = '0.0"%"';
      
      if (idx % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });

    // Add Pie Chart for Priority Distribution
    summarySheet.addImage(
      workbook.addImage({
        base64: generateChartImage(
          'pie',
          priorities,
          [{
            data: priorities.map(p => analytics.priority_distribution?.[p] || 0),
            backgroundColor: ['#ef4444', '#f59e0b', '#94a3b8']
          }],
          { title: 'Priority Distribution', width: 500, height: 300 }
        ),
        extension: 'png'
      }),
      {
        tl: { col: 4.5, row: priorityChartStart - 1 },
        ext: { width: 350, height: 230 }
      }
    );

    // Column widths
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 18;
    summarySheet.getColumn(3).width = 22;
    summarySheet.getColumn(4).width = 12;

    // ==================== PROJECT PROGRESS ====================
    if (analytics.project_progress && analytics.project_progress.length > 0) {
      const projectSheet = workbook.addWorksheet('Project Progress');

      // Title
      projectSheet.mergeCells('A1:G1');
      const projTitleCell = projectSheet.getCell('A1');
      projTitleCell.value = 'PROJECT PROGRESS DASHBOARD';
      projTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      projTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
      projTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      projectSheet.getRow(1).height = 28;

      projectSheet.addRow([]);

      // Summary Statistics
      const avgProgress = analytics.project_progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / analytics.project_progress.length;
      const excellentProjects = analytics.project_progress.filter(p => (p.progress_percentage || 0) >= 80).length;
      const atRiskProjects = analytics.project_progress.filter(p => (p.progress_percentage || 0) < 40).length;

      projectSheet.addRow(['PROJECT OVERVIEW']).font = { bold: true, size: 12 };
      projectSheet.addRow(['Total Projects', analytics.project_progress.length]);
      projectSheet.addRow(['Average Progress', `${avgProgress.toFixed(1)}%`]);
      projectSheet.addRow(['Excellent Projects (≥80%)', excellentProjects]);
      projectSheet.addRow(['At Risk Projects (<40%)', atRiskProjects]);
      projectSheet.addRow([]);

      // Data Table
      const projHeaders = projectSheet.addRow(['Project Name', 'Total Tasks', 'Completed', 'In Progress', 'Pending', 'Progress %', 'Health Status']);
      projHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      projHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
      projHeaders.alignment = { horizontal: 'center', vertical: 'middle' };

      const sortedProjects = [...analytics.project_progress].sort((a, b) => 
        (b.progress_percentage || 0) - (a.progress_percentage || 0)
      );

      const dataStartRow = projectSheet.lastRow.number + 1;
      
      sortedProjects.forEach((proj, idx) => {
        const progress = proj.progress_percentage || 0;
        let health = 'On Track';
        let healthColor = 'FFFFEAA7';
        
        if (progress >= 80) {
          health = 'Excellent';
          healthColor = 'FFD4EDDA';
        } else if (progress >= 60) {
          health = 'Good';
          healthColor = 'FFD1ECF1';
        } else if (progress >= 40) {
          health = 'On Track';
          healthColor = 'FFFFEAA7';
        } else if (progress >= 20) {
          health = 'At Risk';
          healthColor = 'FFF8D7DA';
        } else {
          health = 'Needs Attention';
          healthColor = 'FFF5C6CB';
        }

        const row = projectSheet.addRow([
          proj.project_name || 'Unnamed Project',
          proj.total_tasks || 0,
          proj.completed_tasks || 0,
          proj.in_progress_tasks || 0,
          proj.pending_tasks || 0,
          progress / 100,
          health
        ]);

        // Format progress as percentage
        row.getCell(6).numFmt = '0.0%';
        
        // Color code health status
        row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: healthColor } };
        row.getCell(7).font = { bold: true };
        
        if (idx % 2 === 0) {
          [1, 2, 3, 4, 5].forEach(col => {
            row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          });
        }
      });

      const dataEndRow = projectSheet.lastRow.number;

      // Add horizontal bar chart
      projectSheet.addImage(
        workbook.addImage({
          base64: generateChartImage(
            'bar',
            sortedProjects.slice(0, 10).map(p => p.project_name.substring(0, 20)),
            [
              {
                label: 'Completed',
                data: sortedProjects.slice(0, 10).map(p => p.completed_tasks || 0),
                backgroundColor: '#10b981'
              },
              {
                label: 'Total',
                data: sortedProjects.slice(0, 10).map(p => p.total_tasks || 0),
                backgroundColor: '#94a3b8'
              }
            ],
            { 
              title: 'Top 10 Projects Progress', 
              width: 700, 
              height: 400,
              indexAxis: 'y'
            }
          ),
          extension: 'png'
        }),
        {
          tl: { col: 0, row: dataEndRow + 2 },
          ext: { width: 650, height: 380 }
        }
      );

      // Column widths
      projectSheet.getColumn(1).width = 35;
      projectSheet.getColumn(2).width = 13;
      projectSheet.getColumn(3).width = 13;
      projectSheet.getColumn(4).width = 13;
      projectSheet.getColumn(5).width = 13;
      projectSheet.getColumn(6).width = 13;
      projectSheet.getColumn(7).width = 20;
    }

    // ==================== UPCOMING DEADLINES ====================
    if (analytics.upcoming_deadlines && analytics.upcoming_deadlines.length > 0) {
      const deadlineSheet = workbook.addWorksheet('Deadlines');

      // Title
      deadlineSheet.mergeCells('A1:H1');
      const deadTitleCell = deadlineSheet.getCell('A1');
      deadTitleCell.value = 'UPCOMING DEADLINES & URGENCY ANALYSIS';
      deadTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      deadTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
      deadTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      deadlineSheet.getRow(1).height = 28;

      deadlineSheet.addRow([]);

      // Summary
      const overdueCount = analytics.upcoming_deadlines.filter(t => t.days_until < 0).length;
      const criticalCount = analytics.upcoming_deadlines.filter(t => t.days_until >= 0 && t.days_until <= 3).length;

      deadlineSheet.addRow(['DEADLINE SUMMARY']).font = { bold: true, size: 12 };
      deadlineSheet.addRow(['Total Tasks with Deadlines', analytics.upcoming_deadlines.length]);
      deadlineSheet.addRow(['Overdue Tasks', overdueCount]);
      deadlineSheet.addRow(['Critical (≤3 days)', criticalCount]);
      deadlineSheet.addRow([]);

      // Data Table
      const deadHeaders = deadlineSheet.addRow(['Ticket ID', 'Task Title', 'Priority', 'Status', 'Due Date', 'Days Until', 'Project', 'Urgency']);
      deadHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      deadHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
      deadHeaders.alignment = { horizontal: 'center', vertical: 'middle' };

      const sortedDeadlines = [...analytics.upcoming_deadlines].sort((a, b) => a.days_until - b.days_until);

      sortedDeadlines.forEach((task, idx) => {
        const daysUntil = task.days_until;
        let urgency = 'Low';
        let urgencyColor = 'FFD4EDDA';

        if (daysUntil < 0) {
          urgency = 'OVERDUE';
          urgencyColor = 'FFF5C6CB';
        } else if (daysUntil <= 3) {
          urgency = 'Critical';
          urgencyColor = 'FFF8D7DA';
        } else if (daysUntil <= 7) {
          urgency = 'High';
          urgencyColor = 'FFFFEAA7';
        } else if (daysUntil <= 14) {
          urgency = 'Medium';
          urgencyColor = 'FFD1ECF1';
        }

        const daysText = daysUntil < 0 
          ? `${Math.abs(daysUntil)} days overdue` 
          : `${daysUntil} days`;

        const row = deadlineSheet.addRow([
          task.ticket_id || 'N/A',
          task.title || 'Untitled',
          task.priority || 'Medium',
          task.status || 'To Do',
          task.due_date ? new Date(task.due_date) : 'No deadline',
          daysText,
          task.project_name || 'N/A',
          urgency
        ]);

        // Format date
        if (task.due_date) {
          row.getCell(5).numFmt = 'mmm dd, yyyy';
        }

        // Color code urgency
        row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: urgencyColor } };
        row.getCell(8).font = { bold: true };

        if (idx % 2 === 0) {
          [1, 2, 3, 4, 5, 6, 7].forEach(col => {
            row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          });
        }
      });

      // Column widths
      deadlineSheet.getColumn(1).width = 12;
      deadlineSheet.getColumn(2).width = 45;
      deadlineSheet.getColumn(3).width = 12;
      deadlineSheet.getColumn(4).width = 16;
      deadlineSheet.getColumn(5).width = 16;
      deadlineSheet.getColumn(6).width = 20;
      deadlineSheet.getColumn(7).width = 28;
      deadlineSheet.getColumn(8).width = 14;
    }

    // ==================== MY TASKS ====================
    if (report && report.my_tasks && report.my_tasks.length > 0) {
      const tasksSheet = workbook.addWorksheet('My Tasks');

      tasksSheet.mergeCells('A1:H1');
      const taskTitleCell = tasksSheet.getCell('A1');
      taskTitleCell.value = 'MY TASKS - DETAILED REPORT';
      taskTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      taskTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };
      taskTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      tasksSheet.getRow(1).height = 28;

      tasksSheet.addRow([]);
      tasksSheet.addRow(['Total Assigned Tasks', report.my_tasks.length]).font = { bold: true };
      tasksSheet.addRow([]);

      const taskHeaders = tasksSheet.addRow(['Ticket ID', 'Title', 'Status', 'Priority', 'Due Date', 'Project', 'Assigned Date', 'Age (Days)']);
      taskHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      taskHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052CC' } };

      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
      const sortedTasks = [...report.my_tasks].sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        
        const dateA = a.due_date ? new Date(a.due_date) : new Date('2099-12-31');
        const dateB = b.due_date ? new Date(b.due_date) : new Date('2099-12-31');
        return dateA - dateB;
      });

      sortedTasks.forEach((task, idx) => {
        const createdDate = task.created_at ? new Date(task.created_at) : new Date();
        const ageDays = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

        const row = tasksSheet.addRow([
          task.ticket_id || 'N/A',
          task.title || 'Untitled',
          task.status || 'To Do',
          task.priority || 'Medium',
          task.due_date ? new Date(task.due_date) : null,
          task.project_name || 'N/A',
          task.created_at ? new Date(task.created_at) : null,
          ageDays
        ]);

        if (task.due_date) row.getCell(5).numFmt = 'mmm dd, yyyy';
        if (task.created_at) row.getCell(7).numFmt = 'mmm dd, yyyy';

        // Color code priority
        const priorityCell = row.getCell(4);
        if (task.priority === 'High') {
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
          priorityCell.font = { bold: true, color: { argb: 'FFDC3545' } };
        } else if (task.priority === 'Medium') {
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAA7' } };
        }

        if (idx % 2 === 0) {
          [1, 2, 3, 5, 6, 7, 8].forEach(col => {
            row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          });
        }
      });

      tasksSheet.getColumn(1).width = 12;
      tasksSheet.getColumn(2).width = 45;
      tasksSheet.getColumn(3).width = 16;
      tasksSheet.getColumn(4).width = 12;
      tasksSheet.getColumn(5).width = 16;
      tasksSheet.getColumn(6).width = 28;
      tasksSheet.getColumn(7).width = 16;
      tasksSheet.getColumn(8).width = 12;
    }

    // Save workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DOIT-Dashboard-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw new Error('Failed to generate Excel: ' + error.message);
  }
};

/**
 * Enhanced CSV Export with Professional Formatting
 */
export const exportToCSV = (analytics, userName) => {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US');
    
    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    let csv = '';
    
    // =======================================================================
    // HEADER SECTION
    // =======================================================================
    csv += '=======================================================================\n';
    csv += '                     DOIT DASHBOARD REPORT\n';
    csv += '                   Task Management Analytics\n';
    csv += '=======================================================================\n';
    csv += `Generated for: ${escapeCSV(userName)}\n`;
    csv += `Report Date: ${currentDate}\n`;
    csv += `Report Time: ${currentTime}\n`;
    csv += `Report Type: Comprehensive CSV Export\n`;
    csv += '=======================================================================\n\n';
    
    // -----------------------------------------------------------------------
    // EXECUTIVE SUMMARY
    // -----------------------------------------------------------------------
    csv += '+---------------------------------------------------------------------+\n';
    csv += '|                       EXECUTIVE SUMMARY                             |\n';
    csv += '+---------------------------------------------------------------------+\n\n';
    
    // Key Performance Indicators
    csv += '>>> KEY PERFORMANCE INDICATORS\n';
    csv += 'Metric,Value,Status\n';
    
    const totalTasks = analytics.task_stats?.total || 0;
    const completionRate = totalTasks > 0 
      ? ((analytics.task_stats.closed / totalTasks) * 100).toFixed(1)
      : '0.0';
    const completionStatus = parseFloat(completionRate) >= 70 ? 'Good' : 'Needs Improvement';
    
    csv += `Completion Rate,${completionRate}%,${completionStatus}\n`;
    
    const overdueCount = analytics.task_stats?.overdue || 0;
    const onTimeRate = totalTasks > 0 
      ? (((totalTasks - overdueCount) / totalTasks) * 100).toFixed(1)
      : '100.0';
    const onTimeStatus = overdueCount === 0 ? 'Excellent' : 'Review Required';
    
    csv += `On-Time Delivery,${onTimeRate}%,${onTimeStatus}\n`;
    
    const activeTasks = (analytics.task_stats?.pending || 0) + (analytics.task_stats?.in_progress || 0);
    csv += `Active Tasks,${activeTasks},${activeTasks} tasks in progress\n`;
    csv += `Overdue Tasks,${overdueCount},${overdueCount > 0 ? 'Requires Attention' : 'All on track'}\n`;
    csv += '\n';
    
    // -----------------------------------------------------------------------
    // TASK STATISTICS
    // -----------------------------------------------------------------------
    csv += '+---------------------------------------------------------------------+\n';
    csv += '|                       TASK STATISTICS                               |\n';
    csv += '+---------------------------------------------------------------------+\n\n';
    
    csv += 'Metric,Count,Percentage,Trend\n';
    csv += `Total Tasks,${totalTasks},100%,Baseline\n`;
    csv += `Pending Tasks,${analytics.task_stats?.pending || 0},${totalTasks > 0 ? ((analytics.task_stats.pending / totalTasks) * 100).toFixed(1) : 0}%,Awaiting Start\n`;
    csv += `In Progress,${analytics.task_stats?.in_progress || 0},${totalTasks > 0 ? ((analytics.task_stats.in_progress / totalTasks) * 100).toFixed(1) : 0}%,Active Work\n`;
    csv += `Overdue Tasks,${overdueCount},${totalTasks > 0 ? ((overdueCount / totalTasks) * 100).toFixed(1) : 0}%,${overdueCount > 0 ? 'Critical' : 'None'}\n`;
    csv += '\n';
    
    // -----------------------------------------------------------------------
    // STATUS DISTRIBUTION (Workflow Order)
    // -----------------------------------------------------------------------
    if (analytics.status_distribution) {
      csv += '+---------------------------------------------------------------------+\n';
      csv += '|                    STATUS DISTRIBUTION                              |\n';
      csv += '|                  (6-Stage Workflow Analysis)                        |\n';
      csv += '+---------------------------------------------------------------------+\n\n';
      
      csv += 'Status,Count,Percentage,Stage,Trend\n';
      
      const statusTotal = Object.values(analytics.status_distribution).reduce((sum, count) => sum + count, 0);
      const statusOrder = [
        { name: 'To Do', stage: '1', trend: 'Pending' },
        { name: 'In Progress', stage: '2', trend: 'Active' },
        { name: 'Testing', stage: '3', trend: 'Active' },
        { name: 'Dev Complete', stage: '4', trend: 'Active' },
        { name: 'Done', stage: '5', trend: 'Complete' },
        { name: 'Closed', stage: '6', trend: 'Complete' }
      ];
      
      statusOrder.forEach(({ name, stage, trend }) => {
        const count = analytics.status_distribution[name] || 0;
        const percentage = statusTotal > 0 ? ((count / statusTotal) * 100).toFixed(1) : '0.0';
        csv += `${name},${count},${percentage}%,Stage ${stage},${trend}\n`;
      });
      
      const activeCount = (analytics.status_distribution['In Progress'] || 0) + 
                          (analytics.status_distribution['Testing'] || 0);
      const completedCount = (analytics.status_distribution['Done'] || 0) + 
                             (analytics.status_distribution['Closed'] || 0);
      
      csv += '\n>>> STATUS INSIGHTS\n';
      csv += 'Insight,Value\n';
      csv += `Total Tasks,${statusTotal}\n`;
      csv += `Active Tasks (In Progress + Testing),${activeCount}\n`;
      csv += `Completed Tasks (Done + Closed),${completedCount}\n`;
      csv += `Workflow Completion Rate,${statusTotal > 0 ? ((completedCount / statusTotal) * 100).toFixed(1) : '0.0'}%\n`;
      csv += '\n';
    }
    
    // -----------------------------------------------------------------------
    // PRIORITY DISTRIBUTION
    // -----------------------------------------------------------------------
    csv += '+---------------------------------------------------------------------+\n';
    csv += '|                    PRIORITY DISTRIBUTION                            |\n';
    csv += '+---------------------------------------------------------------------+\n\n';
    
    csv += 'Priority,Count,Percentage,Risk Level\n';
    const highCount = analytics.priority_distribution?.High || 0;
    const mediumCount = analytics.priority_distribution?.Medium || 0;
    const lowCount = analytics.priority_distribution?.Low || 0;
    
    csv += `High,${highCount},${totalTasks > 0 ? ((highCount / totalTasks) * 100).toFixed(1) : 0}%,Critical\n`;
    csv += `Medium,${mediumCount},${totalTasks > 0 ? ((mediumCount / totalTasks) * 100).toFixed(1) : 0}%,Standard\n`;
    csv += `Low,${lowCount},${totalTasks > 0 ? ((lowCount / totalTasks) * 100).toFixed(1) : 0}%,Normal\n`;
    csv += '\n';
    
    // -----------------------------------------------------------------------
    // PROJECT STATISTICS
    // -----------------------------------------------------------------------
    csv += '+---------------------------------------------------------------------+\n';
    csv += '|                     PROJECT STATISTICS                              |\n';
    csv += '+---------------------------------------------------------------------+\n\n';
    
    csv += 'Metric,Count\n';
    csv += `Total Projects,${analytics.project_stats?.total || 0}\n`;
    csv += `Owned Projects,${analytics.project_stats?.owned || 0}\n`;
    csv += `Member Projects,${analytics.project_stats?.member_of || 0}\n`;
    csv += '\n';
    
    // -----------------------------------------------------------------------
    // PROJECT PROGRESS DETAILS
    // -----------------------------------------------------------------------
    if (analytics.project_progress && analytics.project_progress.length > 0) {
      csv += '+---------------------------------------------------------------------+\n';
      csv += '|                     PROJECT PROGRESS                                |\n';
      csv += '+---------------------------------------------------------------------+\n\n';
      
      // Summary first
      const avgProgress = analytics.project_progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / analytics.project_progress.length;
      const excellentProjects = analytics.project_progress.filter(p => (p.progress_percentage || 0) >= 80).length;
      const atRiskProjects = analytics.project_progress.filter(p => (p.progress_percentage || 0) < 40).length;
      
      csv += '>>> PROJECT OVERVIEW\n';
      csv += 'Metric,Value\n';
      csv += `Total Projects,${analytics.project_progress.length}\n`;
      csv += `Average Progress,${avgProgress.toFixed(1)}%\n`;
      csv += `Excellent Projects (≥80%),${excellentProjects}\n`;
      csv += `At Risk Projects (<40%),${atRiskProjects}\n`;
      csv += '\n';
      
      csv += '>>> DETAILED PROJECT BREAKDOWN\n';
      csv += 'Project Name,Total Tasks,Completed,In Progress,Pending,Progress %,Health Status\n';
      
      // Sort by progress (highest first)
      const sortedProjects = [...analytics.project_progress].sort((a, b) => 
        (b.progress_percentage || 0) - (a.progress_percentage || 0)
      );
      
      sortedProjects.forEach(proj => {
        const progress = proj.progress_percentage || 0;
        let health = 'On Track';
        if (progress >= 80) health = 'Excellent';
        else if (progress >= 60) health = 'Good';
        else if (progress >= 40) health = 'On Track';
        else if (progress >= 20) health = 'At Risk';
        else health = 'Needs Attention';
        
        csv += `${escapeCSV(proj.project_name)},${proj.total_tasks || 0},${proj.completed_tasks || 0},${proj.in_progress_tasks || 0},${proj.pending_tasks || 0},${progress}%,${health}\n`;
      });
      
      // Totals
      const totalProjectTasks = sortedProjects.reduce((sum, p) => sum + (p.total_tasks || 0), 0);
      const totalCompleted = sortedProjects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);
      const totalInProgress = sortedProjects.reduce((sum, p) => sum + (p.in_progress_tasks || 0), 0);
      const totalPending = sortedProjects.reduce((sum, p) => sum + (p.pending_tasks || 0), 0);
      const overallProgress = totalProjectTasks > 0 ? ((totalCompleted / totalProjectTasks) * 100).toFixed(1) : '0.0';
      
      csv += `\n>>> COMBINED TOTALS\n`;
      csv += `All Projects,${totalProjectTasks},${totalCompleted},${totalInProgress},${totalPending},${overallProgress}%,Overall\n`;
      csv += '\n';
    }
    
    // -----------------------------------------------------------------------
    // UPCOMING DEADLINES & URGENCY ANALYSIS
    // -----------------------------------------------------------------------
    if (analytics.upcoming_deadlines && analytics.upcoming_deadlines.length > 0) {
      csv += '+---------------------------------------------------------------------+\n';
      csv += '|                  UPCOMING DEADLINES & URGENCY                       |\n';
      csv += '+---------------------------------------------------------------------+\n\n';
      
      // Summary
      const overdueDeadlines = analytics.upcoming_deadlines.filter(t => t.days_until < 0).length;
      const criticalDeadlines = analytics.upcoming_deadlines.filter(t => t.days_until >= 0 && t.days_until <= 3).length;
      const highDeadlines = analytics.upcoming_deadlines.filter(t => t.days_until > 3 && t.days_until <= 7).length;
      
      csv += '>>> DEADLINE SUMMARY\n';
      csv += 'Category,Count\n';
      csv += `Total Tasks with Deadlines,${analytics.upcoming_deadlines.length}\n`;
      csv += `Overdue (Past Due),${overdueDeadlines}\n`;
      csv += `Critical (≤3 days),${criticalDeadlines}\n`;
      csv += `High Priority (4-7 days),${highDeadlines}\n`;
      csv += '\n';
      
      csv += '>>> DEADLINE DETAILS (Sorted by Urgency)\n';
      csv += 'Ticket ID,Task Title,Priority,Status,Due Date,Days Until,Project,Urgency Level\n';
      
      // Sort by urgency
      const sortedDeadlines = [...analytics.upcoming_deadlines].sort((a, b) => a.days_until - b.days_until);
      
      sortedDeadlines.forEach(task => {
        const daysUntil = task.days_until;
        let urgency = 'Low';
        if (daysUntil < 0) urgency = 'OVERDUE';
        else if (daysUntil <= 3) urgency = 'Critical';
        else if (daysUntil <= 7) urgency = 'High';
        else if (daysUntil <= 14) urgency = 'Medium';
        
        const daysText = daysUntil < 0 
          ? `${Math.abs(daysUntil)} days overdue` 
          : `${daysUntil} days`;
        
        const dueDate = new Date(task.due_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        csv += `${task.ticket_id || 'N/A'},${escapeCSV(task.title)},${task.priority || 'Medium'},${task.status || 'To Do'},${dueDate},${daysText},${escapeCSV(task.project_name)},${urgency}\n`;
      });
      csv += '\n';
    }
    
    // -----------------------------------------------------------------------
    // INSIGHTS & RECOMMENDATIONS
    // -----------------------------------------------------------------------
    csv += '+---------------------------------------------------------------------+\n';
    csv += '|                 INSIGHTS & RECOMMENDATIONS                          |\n';
    csv += '+---------------------------------------------------------------------+\n\n';
    
    csv += 'Category,Insight,Recommendation,Priority\n';
    
    const completionRatePct = parseFloat(completionRate);
    
    if (completionRatePct < 50) {
      csv += `Task Completion,${escapeCSV(`Completion rate is ${completionRate}% (below 50% target)`)},${escapeCSV('Focus on completing pending tasks. Review task priorities and remove blockers.')},High\n`;
    } else if (completionRatePct < 70) {
      csv += `Task Completion,${escapeCSV(`Completion rate is ${completionRate}% (below 70% target)`)},${escapeCSV('Good progress but room for improvement. Review workflow efficiency.')},Medium\n`;
    } else {
      csv += `Task Completion,${escapeCSV(`Completion rate is ${completionRate}% (excellent)`)},${escapeCSV('Maintain current pace and monitor for bottlenecks.')},Low\n`;
    }
    
    if (overdueCount > 0) {
      const urgency = overdueCount > 5 ? 'Critical' : overdueCount > 2 ? 'High' : 'Medium';
      csv += `Overdue Tasks,${escapeCSV(`${overdueCount} task(s) overdue`)},${escapeCSV('Prioritize overdue tasks immediately. Review resource allocation.')},${urgency}\n`;
    }
    
    const highPriorityPct = totalTasks > 0 ? (highCount / totalTasks) * 100 : 0;
    if (highPriorityPct > 40) {
      csv += `Priority Distribution,${escapeCSV(`${highCount} high-priority tasks (${highPriorityPct.toFixed(1)}%)`)},${escapeCSV('Too many high-priority tasks. Review and re-evaluate priorities.')},Medium\n`;
    }
    
    const inProgressCount = analytics.task_stats?.in_progress || 0;
    const inProgressPct = totalTasks > 0 ? (inProgressCount / totalTasks) * 100 : 0;
    if (inProgressPct > 50) {
      csv += `Work In Progress,${escapeCSV(`${inProgressCount} tasks in progress (${inProgressPct.toFixed(1)}%)`)},${escapeCSV('Consider limiting WIP to improve focus and completion rate.')},Medium\n`;
    }
    
    if (completionRatePct >= 70 && overdueCount === 0) {
      csv += `Performance,${escapeCSV('Excellent task management performance')},${escapeCSV('Continue current practices. Regular monitoring recommended.')},Info\n`;
    }
    
    csv += '\n';
    
    // =======================================================================
    // FOOTER SECTION
    // =======================================================================
    csv += '=======================================================================\n';
    csv += '                         REPORT METADATA\n';
    csv += '=======================================================================\n';
    csv += `Generated By: ${escapeCSV(userName)}\n`;
    csv += `Generation Date: ${currentDate}\n`;
    csv += `Generation Time: ${currentTime}\n`;
    csv += `Report Format: CSV (Comma-Separated Values)\n`;
    csv += `Total Data Points: ${totalTasks} tasks across ${analytics.project_stats?.total || 0} projects\n`;
    csv += `Report Version: 1.0\n`;
    csv += `System: DOIT Task Management System\n`;
    csv += '=======================================================================\n';
    csv += 'End of Report\n';
    csv += '=======================================================================\n';
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `DOIT-Dashboard-Report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('CSV Export Error:', error);
    throw new Error('Failed to generate CSV: ' + error.message);
  }
}