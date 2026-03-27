import React, { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import './Charts.css';

/* DOIT brand palette — blue→green accent system */
const PROJECT_COLORS = [
  '#4f8ef7', '#00c896', '#a855f7', '#f59e0b',
  '#f472b6', '#22d3ee', '#f87171', '#34d399'
];

const ProjectProgressChart = memo(({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container wide">
        <h3 className="chart-title">Project Progress Overview</h3>
        <div className="no-data">No projects to display</div>
      </div>
    );
  }

  const chartData = data.slice(0, 8);

  return (
    <div className="chart-container wide">
      <h3 className="chart-title">Project Progress Overview</h3>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 24, left: 16, bottom: 64 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="project_name"
            angle={-40}
            textAnchor="end"
            height={96}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            label={{ value: 'Tasks', angle: -90, position: 'insideLeft', fontSize: 12 }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(79,142,247,0.06)' }}
            contentStyle={{ borderRadius: 10, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
          <Bar
            dataKey="completed_tasks"
            name="Completed"
            fill="#00c896"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="total_tasks"
            name="Total"
            fill="rgba(79,142,247,0.3)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ProjectProgressChart;