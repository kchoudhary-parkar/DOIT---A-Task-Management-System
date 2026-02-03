import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './Charts.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ProjectProgressChart = memo(({ data }) => {
  console.log("[ProjectProgressChart] Received data:", data);
  console.log("[ProjectProgressChart] Data type:", typeof data);
  console.log("[ProjectProgressChart] Is array:", Array.isArray(data));
  console.log("[ProjectProgressChart] Length:", data?.length);
  
  if (!data || data.length === 0) {
    console.log("[ProjectProgressChart] No data to display");
    return (
      <div className="chart-container">
        <h3 className="chart-title">Project Progress</h3>
        <div className="no-data">No projects to display</div>
      </div>
    );
  }

  // Limit to top 8 projects for better visibility
  const chartData = data.slice(0, 8);
  console.log("[ProjectProgressChart] Chart data:", chartData);

  return (
    <div className="chart-container wide">
      <h3 className="chart-title">Project Progress Overview</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="project_name" 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis label={{ value: 'Tasks', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed_tasks" name="Completed" fill="#10b981" />
          <Bar dataKey="total_tasks" name="Total" fill="#94a3b8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ProjectProgressChart;
