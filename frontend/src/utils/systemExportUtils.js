import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ========================================
// PDF EXPORT UTILITIES
// ========================================

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
  doc.text('System Dashboard Report', 62, 30);
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

// Generate chart image from canvas
const generateChartImage = (type, labels, datasets, options = {}) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = options.width || 500;
  canvas.height = options.height || 300;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (type === 'pie') {
    const centerX = canvas.width / 2;
    const centerY = (canvas.height - 80) / 2;  // More space for legend
    const radius = Math.min(canvas.width, canvas.height - 100) / 3;
    
    const data = datasets[0].data;
    const colors = datasets[0].backgroundColor;
    const total = data.reduce((a, b) => a + b, 0);
    
    let currentAngle = -Math.PI / 2;
    
    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      currentAngle += sliceAngle;
    });

    // Legend - Multiple columns for better fit
    const legendStartY = canvas.height - 80;
    const legendItemsPerColumn = Math.ceil(labels.length / 2);
    const columnWidth = canvas.width / 2;
    
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    
    labels.forEach((label, index) => {
      const column = Math.floor(index / legendItemsPerColumn);
      const row = index % legendItemsPerColumn;
      const legendX = 20 + (column * columnWidth);
      const legendY = legendStartY + (row * 18);
      
      ctx.fillStyle = colors[index];
      ctx.fillRect(legendX, legendY, 12, 12);
      ctx.fillStyle = '#000000';
      ctx.fillText(`${label}: ${data[index]}`, legendX + 18, legendY + 10);
    });
  } else if (type === 'bar') {
    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    const maxValue = Math.max(...datasets.flatMap(d => d.data));
    const barWidth = chartWidth / (labels.length * datasets.length + labels.length);
    const groupWidth = barWidth * datasets.length;
    
    // Draw axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw bars
    labels.forEach((label, labelIndex) => {
      datasets.forEach((dataset, datasetIndex) => {
        const value = dataset.data[labelIndex];
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + labelIndex * (groupWidth + barWidth) + datasetIndex * barWidth;
        const y = canvas.height - padding - barHeight;
        
        ctx.fillStyle = dataset.backgroundColor;
        ctx.fillRect(x, y, barWidth - 4, barHeight);
      });
      
      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      const labelX = padding + labelIndex * (groupWidth + barWidth) + groupWidth / 2;
      ctx.fillText(label.substring(0, 10), labelX, canvas.height - padding + 20);
    });

    // Legend
    let legendY = 20;
    datasets.forEach((dataset, index) => {
      ctx.fillStyle = dataset.backgroundColor;
      ctx.fillRect(canvas.width - 120, legendY, 15, 15);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label, canvas.width - 100, legendY + 12);
      legendY += 25;
    });
  }

  return canvas.toDataURL('image/png');
};

// ========================================
// MAIN PDF EXPORT FUNCTION
// ========================================

export const exportSystemToPDF = async (analytics) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── PAGE 1 ── Cover + Overview ───────────────────────────────────────
    addPDFHeader(doc);
    let y = 80;

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('System-Wide Analytics Report', pageWidth / 2, y, { align: 'center' });
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

    // System Overview
    y = addSectionHeader(doc, 'System Overview', y);
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`Total Users: ${analytics.user_stats?.total || 0}`, 20, y);
    doc.text(`Total Projects: ${analytics.project_stats?.total || 0}`, 20, y + 8);
    doc.text(`Total Tasks: ${analytics.task_stats?.total || 0}`, 20, y + 16);
    doc.text(`Completion Rate: ${analytics.system_health?.overall_completion_rate || 0}%`, 20, y + 24);
    y += 40;

    // User Statistics
    y = addSectionHeader(doc, 'User Statistics', y);
    const userRows = [
      ['Super Admins', analytics.user_stats?.super_admins || 0],
      ['Admins', analytics.user_stats?.admins || 0],
      ['Members', analytics.user_stats?.members || 0],
      ['Total Users', analytics.user_stats?.total || 0]
    ];
    y = drawStyledTable(doc, ['Role', 'Count'], userRows, y);
    y += 10;

    // Project Statistics
    y = addSectionHeader(doc, 'Project Statistics', y);
    const projectRows = [
      ['Active Projects', analytics.project_stats?.active || 0],
      ['Completed Projects', analytics.project_stats?.completed || 0],
      ['Total Projects', analytics.project_stats?.total || 0]
    ];
    y = drawStyledTable(doc, ['Status', 'Count'], projectRows, y);

    // ── PAGE 2 ── User Role Distribution (Pie Chart) ─────────────────────────────────
    doc.addPage();
    addPDFHeader(doc);
    y = 75;
    
    y = addSectionHeader(doc, 'User Role Distribution', y);
    const roleColors = ['#fbbf24', '#3b82f6', '#10b981'];
    const roleLabels = ['Super Admins', 'Admins', 'Members'];
    const roleData = [
      analytics.user_stats?.super_admins || 0,
      analytics.user_stats?.admins || 0,
      analytics.user_stats?.members || 0
    ];
    
    const roleChartImg = generateChartImage(
      'pie',
      roleLabels,
      [{
        data: roleData,
        backgroundColor: roleColors
      }],
      { width: 500, height: 220 }
    );
    doc.addImage(roleChartImg, 'PNG', 15, y, 180, 80);
    y += 90;

    // Task Status Distribution (Pie Chart) on same page
    if (analytics.status_distribution) {
      y = addSectionHeader(doc, 'Task Status Distribution', y);
      const statusColors = {
        'To Do': '#94a3b8',
        'In Progress': '#3b82f6',
        'Testing': '#f59e0b',
        'Dev Complete': '#8b5cf6',
        'Done': '#10b981',
        'Closed': '#64748b'
      };
      const statusEntries = Object.entries(analytics.status_distribution);
      const statusChartImg = generateChartImage(
        'pie',
        statusEntries.map(([name]) => name),
        [{
          data: statusEntries.map(([, value]) => value),
          backgroundColor: statusEntries.map(([name]) => statusColors[name] || '#94a3b8')
        }],
        { width: 500, height: 240 }
      );
      doc.addImage(statusChartImg, 'PNG', 15, y, 180, 90);
    }

    // ── PAGE 3 ── Project Health Overview (Bar Chart) ─────────────────────────────────
    doc.addPage();
    addPDFHeader(doc);
    y = 75;

    if (analytics.project_health && analytics.project_health.length > 0) {
      y = addSectionHeader(doc, 'Project Health Overview', y);
      const projectNames = analytics.project_health.slice(0, 8).map(p => p.name);
      const projectHealthChart = generateChartImage(
        'bar',
        projectNames,
        [
          {
            label: 'Completed',
            data: analytics.project_health.slice(0, 8).map(p => p.completed),
            backgroundColor: '#10b981'
          },
          {
            label: 'Total',
            data: analytics.project_health.slice(0, 8).map(p => p.total_tasks),
            backgroundColor: '#3b82f6'
          },
          {
            label: 'Overdue',
            data: analytics.project_health.slice(0, 8).map(p => p.overdue),
            backgroundColor: '#ef4444'
          }
        ],
        { width: 500, height: 350 }
      );
      doc.addImage(projectHealthChart, 'PNG', 10, y, 190, 120);
      y += 130;

      // Project Health Table
      y = addSectionHeader(doc, 'Project Details', y);
      const projectHealthRows = analytics.project_health.slice(0, 10).map(p => [
        p.name.substring(0, 25),
        p.total_tasks,
        p.completed,
        p.overdue,
        `${p.completion_rate}%`
      ]);
      y = drawStyledTable(
        doc,
        ['Project', 'Total', 'Done', 'Overdue', 'Rate'],
        projectHealthRows,
        y
      );
    }

    // ── PAGE 4 ── User Workload Distribution ─────────────────────────────────
    if (analytics.user_workload && analytics.user_workload.length > 0) {
      doc.addPage();
      addPDFHeader(doc);
      y = 75;

      y = addSectionHeader(doc, 'User Workload Distribution', y);
      const userNames = analytics.user_workload.slice(0, 10).map(u => u.name);
      const userWorkloadChart = generateChartImage(
        'bar',
        userNames,
        [
          {
            label: 'Active Tasks',
            data: analytics.user_workload.slice(0, 10).map(u => u.active_tasks),
            backgroundColor: '#3b82f6'
          },
          {
            label: 'Completed',
            data: analytics.user_workload.slice(0, 10).map(u => u.completed_tasks),
            backgroundColor: '#10b981'
          }
        ],
        { width: 500, height: 350 }
      );
      doc.addImage(userWorkloadChart, 'PNG', 10, y, 190, 120);
      y += 130;

      // User Workload Table
      y = addSectionHeader(doc, 'User Task Details', y);
      const userWorkloadRows = analytics.user_workload.slice(0, 10).map(u => [
        u.name.substring(0, 20),
        u.role,
        u.active_tasks,
        u.completed_tasks,
        u.total_tasks
      ]);
      y = drawStyledTable(
        doc,
        ['User', 'Role', 'Active', 'Done', 'Total'],
        userWorkloadRows,
        y
      );
    }

    // Save PDF
    const fileName = `System_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ System Dashboard PDF exported successfully');
  } catch (error) {
    console.error('Error exporting system dashboard PDF:', error);
    throw error;
  }
};

// ========================================
// EXCEL EXPORT FUNCTION
// ========================================

export const exportSystemToExcel = (analytics) => {
  try {
    const wb = XLSX.utils.book_new();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // ========== SHEET 1: System Overview ==========
    const overviewData = [
      ['DOIT - System Dashboard Report'],
      ['Generated: ' + currentDate],
      [],
      ['USER STATISTICS'],
      ['Metric', 'Value'],
      ['Total Users', analytics.user_stats?.total || 0],
      ['Super Admins', analytics.user_stats?.super_admins || 0],
      ['Admins', analytics.user_stats?.admins || 0],
      ['Members', analytics.user_stats?.members || 0],
      [],
      ['PROJECT STATISTICS'],
      ['Metric', 'Value'],
      ['Total Projects', analytics.project_stats?.total || 0],
      ['Active Projects', analytics.project_stats?.active || 0],
      ['Completed Projects', analytics.project_stats?.completed || 0],
      [],
      ['TASK STATISTICS'],
      ['Status', 'Count', 'Percentage'],
      ['Total Tasks', analytics.task_stats?.total || 0, '100%'],
      ['To Do', analytics.task_stats?.to_do || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.to_do / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      ['In Progress', analytics.task_stats?.in_progress || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.in_progress / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      ['Testing', analytics.task_stats?.testing || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.testing / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      ['Dev Complete', analytics.task_stats?.dev_complete || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.dev_complete / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      ['Done', analytics.task_stats?.done || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.done / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      ['Closed', analytics.task_stats?.closed || 0, analytics.task_stats?.total > 0 ? `${((analytics.task_stats.closed / analytics.task_stats.total) * 100).toFixed(1)}%` : '0%'],
      [],
      ['SYSTEM HEALTH METRICS'],
      ['Metric', 'Value'],
      ['System Completion Rate', `${analytics.system_health?.overall_completion_rate || 0}%`],
      ['Overdue Tasks', analytics.system_health?.overdue_tasks || 0]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    
    // Set column widths for better readability
    ws1['!cols'] = [
      { wch: 30 },  // Column A - Metric names
      { wch: 18 },  // Column B - Values
      { wch: 15 }   // Column C - Percentage
    ];
    
    // Merge cells for title
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }  // Merge title across 3 columns
    ];
    
    XLSX.utils.book_append_sheet(wb, ws1, 'System Overview');

    // ========== SHEET 2: Project Health ==========
    if (analytics.project_health && analytics.project_health.length > 0) {
      const projectData = [
        ['PROJECT HEALTH OVERVIEW'],
        [`Generated: ${currentDate}`],
        [],
        ['Project Name', 'Status', 'Total Tasks', 'Completed', 'Overdue', 'Completion Rate'],
        ...analytics.project_health.map(p => [
          p.name,
          p.status,
          p.total_tasks,
          p.completed,
          p.overdue,
          `${p.completion_rate}%`
        ])
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(projectData);
      
      // Set column widths
      ws2['!cols'] = [
        { wch: 30 },  // Project Name
        { wch: 12 },  // Status
        { wch: 14 },  // Total Tasks
        { wch: 14 },  // Completed
        { wch: 12 },  // Overdue
        { wch: 18 }   // Completion Rate
      ];
      
      // Merge title row
      ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws2, 'Project Health');
    }

    // ========== SHEET 3: User Workload ==========
    if (analytics.user_workload && analytics.user_workload.length > 0) {
      const workloadData = [
        ['USER WORKLOAD DISTRIBUTION'],
        [`Generated: ${currentDate}`],
        [],
        ['User Name', 'Role', 'Total Tasks', 'Active Tasks', 'Completed Tasks'],
        ...analytics.user_workload.map(u => [
          u.name,
          u.role,
          u.total_tasks,
          u.active_tasks,
          u.completed_tasks
        ])
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(workloadData);
      
      // Set column widths
      ws3['!cols'] = [
        { wch: 25 },  // User Name
        { wch: 15 },  // Role
        { wch: 14 },  // Total Tasks
        { wch: 15 },  // Active Tasks
        { wch: 18 }   // Completed Tasks
      ];
      
      // Merge title row
      ws3['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws3, 'User Workload');
    }

    // ========== SHEET 4: Project Team Distribution ==========
    if (analytics.project_user_distribution) {
      const teamData = [
        ['PROJECT TEAM SIZES'],
        [`Generated: ${currentDate}`],
        [],
        ['Project Name', 'Team Members'],
        ...Object.entries(analytics.project_user_distribution).map(([name, count]) => [name, count])
      ];

      const ws4 = XLSX.utils.aoa_to_sheet(teamData);
      
      // Set column widths
      ws4['!cols'] = [
        { wch: 30 },  // Project Name
        { wch: 16 }   // Team Members
      ];
      
      // Merge title row
      ws4['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws4, 'Project Teams');
    }

    // Save Excel file
    const fileName = `System_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('✅ System Dashboard Excel exported successfully');
  } catch (error) {
    console.error('Error exporting system dashboard Excel:', error);
    throw error;
  }
};

// ========================================
// CSV EXPORT FUNCTION
// ========================================

export const exportSystemToCSV = (analytics) => {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let csv = 'DOIT - System Dashboard Report\n';
    csv += `Generated: ${currentDate}\n\n`;

    // User Statistics
    csv += '=== USER STATISTICS ===\n';
    csv += 'Metric,Value\n';
    csv += `Total Users,${analytics.user_stats?.total || 0}\n`;
    csv += `Super Admins,${analytics.user_stats?.super_admins || 0}\n`;
    csv += `Admins,${analytics.user_stats?.admins || 0}\n`;
    csv += `Members,${analytics.user_stats?.members || 0}\n\n`;
    
    // Project Statistics
    csv += '=== PROJECT STATISTICS ===\n';
    csv += 'Metric,Value\n';
    csv += `Total Projects,${analytics.project_stats?.total || 0}\n`;
    csv += `Active Projects,${analytics.project_stats?.active || 0}\n`;
    csv += `Completed Projects,${analytics.project_stats?.completed || 0}\n\n`;
    
    // Task Statistics
    csv += '=== TASK STATISTICS ===\n';
    csv += 'Status,Count,Percentage\n';
    csv += `Total Tasks,${analytics.task_stats?.total || 0},100%\n`;
    csv += `To Do,${analytics.task_stats?.to_do || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.to_do / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n`;
    csv += `In Progress,${analytics.task_stats?.in_progress || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.in_progress / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n`;
    csv += `Testing,${analytics.task_stats?.testing || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.testing / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n`;
    csv += `Dev Complete,${analytics.task_stats?.dev_complete || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.dev_complete / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n`;
    csv += `Done,${analytics.task_stats?.done || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.done / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n`;
    csv += `Closed,${analytics.task_stats?.closed || 0},${analytics.task_stats?.total > 0 ? ((analytics.task_stats.closed / analytics.task_stats.total) * 100).toFixed(1) : 0}%\n\n`;

    // System Health
    csv += '=== SYSTEM HEALTH METRICS ===\n';
    csv += 'Metric,Value\n';
    csv += `Completion Rate,${analytics.system_health?.overall_completion_rate || 0}%\n`;
    csv += `Overdue Tasks,${analytics.system_health?.overdue_tasks || 0}\n\n`;

    // Project Health
    if (analytics.project_health && analytics.project_health.length > 0) {
      csv += '\n=== PROJECT HEALTH OVERVIEW ===\n';
      csv += 'Project Name,Status,Total Tasks,Completed,Overdue,Completion Rate\n';
      analytics.project_health.forEach(p => {
        csv += `"${p.name}",${p.status},${p.total_tasks},${p.completed},${p.overdue},${p.completion_rate}%\n`;
      });
    }

    // User Workload
    if (analytics.user_workload && analytics.user_workload.length > 0) {
      csv += '\n=== USER WORKLOAD DISTRIBUTION ===\n';
      csv += 'User Name,Role,Total Tasks,Active Tasks,Completed Tasks\n';
      analytics.user_workload.forEach(u => {
        csv += `"${u.name}",${u.role},${u.total_tasks},${u.active_tasks},${u.completed_tasks}\n`;
      });
    }
    
    // Project Team Sizes
    if (analytics.project_user_distribution) {
      csv += '\n=== PROJECT TEAM SIZES ===\n';
      csv += 'Project Name,Team Members\n';
      Object.entries(analytics.project_user_distribution).forEach(([name, count]) => {
        csv += `"${name}",${count}\n`;
      });
    }

    // Create and download CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `System_Dashboard_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ System Dashboard CSV exported successfully');
  } catch (error) {
    console.error('Error exporting system dashboard CSV:', error);
    throw error;
  }
};
