import React, { useState } from "react";
import { addTaskToSprint } from "../../services/sprintAPI";
import { TaskDetailModal } from "../Tasks";
import "./BacklogView.css";

const BacklogView = ({ tasks, projectId, sprints, isOwner, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [addingToSprint, setAddingToSprint] = useState({});
  const [error, setError] = useState("");

  const handleAddToSprint = async (taskId, sprintId) => {
    try {
      setError("");
      setAddingToSprint(prev => ({ ...prev, [taskId]: true }));
      await addTaskToSprint(sprintId, taskId);
      onRefresh(); // Refresh the page to update backlog and sprint
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingToSprint(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      High: "priority-high",
      Medium: "priority-medium",
      Low: "priority-low"
    };
    return classes[priority] || "priority-medium";
  };

  const getStatusClass = (status) => {
    const classes = {
      Todo: "status-todo",
      "In Progress": "status-in-progress",
      Done: "status-done"
    };
    return classes[status] || "status-todo";
  };

  // Only show planned sprints (can't add to active or completed)
  const availableSprints = sprints.filter(s => s.status === "planned");

  if (tasks.length === 0) {
    return (
      <div className="backlog-empty">
        <p>No tasks in backlog. All tasks are assigned to sprints!</p>
      </div>
    );
  }

  return (
    <div className="backlog-view">
      {error && <div className="backlog-error">{error}</div>}
      
      <div className="backlog-tasks">
        {tasks.map((task) => (
          <div key={task._id} className="backlog-task-card">
            <div 
              className="backlog-task-content"
              onClick={() => setSelectedTask(task)}
            >
              <div className="task-header">
                <h4 className="task-title">{task.title}</h4>
                <div className="task-badges">
                  <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`status-badge ${getStatusClass(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
              
              {task.description && (
                <p className="task-description">{task.description}</p>
              )}
              
              <div className="task-meta">
                {task.assigned_to_email && (
                  <span className="assigned-to">
                    👤 {task.assigned_to_email}
                  </span>
                )}
              </div>
            </div>
            
            {isOwner && availableSprints.length > 0 && (
              <div className="task-sprint-actions">
                <label className="sprint-select-label">Add to Sprint:</label>
                <select 
                  className="sprint-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddToSprint(task._id, e.target.value);
                      e.target.value = ""; // Reset
                    }
                  }}
                  disabled={addingToSprint[task._id]}
                >
                  <option value="">Select Sprint...</option>
                  {availableSprints.map(sprint => (
                    <option key={sprint._id} value={sprint._id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onUpdate={onRefresh}
          isOwner={isOwner}
          projectTasks={tasks}
        />
      )}
    </div>
  );
};

export default BacklogView;
