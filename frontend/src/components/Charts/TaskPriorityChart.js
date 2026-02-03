import React, { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './Charts.css';

const COLORS = {
  'High': '#ef4444',
  'Medium': '#f59e0b',
  'Low': '#22c55e'
};

const TaskPriorityChart = memo(({ data }) => {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value
  })).filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Task Priority Distribution</h3>
        <div className="no-data">No tasks to display</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Task Priority Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TaskPriorityChart;
