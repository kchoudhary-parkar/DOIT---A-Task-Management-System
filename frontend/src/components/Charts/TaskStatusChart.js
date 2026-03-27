import React, { memo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Legend, Tooltip
} from 'recharts';
import './Charts.css';

/* DOIT status colors — matches .activity-status-badge in DashboardPage.css */
const STATUS_COLORS = {
  'To Do':       '#64748b',
  'In Progress': '#4f8ef7',
  'Done':        '#00c896',
  'Closed':      '#a855f7',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const TaskStatusChart = memo(({ data }) => {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Task Status Distribution</h3>
        <div className="no-data">No tasks to display</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Task Status Distribution</h3>
      <ResponsiveContainer width="100%" height={290}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%" cy="48%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={42}
            dataKey="value"
            paddingAngle={3}
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
          <Legend formatter={(v) => <span style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TaskStatusChart;