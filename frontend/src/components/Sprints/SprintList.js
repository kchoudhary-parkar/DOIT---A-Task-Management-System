import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiPlay,
  FiCheckCircle,
  FiTrash2,
  FiPlusCircle,
  FiCalendar,
  FiTarget,
  FiTrendingUp,
  FiList,
  FiX,
  FiAlertCircle
} from "react-icons/fi";
import { TaskDetailModal } from "../Tasks";
import "./SprintList.css";

const SprintList = ({ sprints, projectId, isOwner, onStart, onComplete, onDelete, onRefresh, onAddTask, backlogTasks = [], availableTasks = [], sprintTasks = {} }) => {
  const [showTaskSelector, setShowTaskSelector] = useState(null); // sprintId or null
  const [showSprintTasks, setShowSprintTasks] = useState(null); // sprintId or null to show tasks in sprint
  const [selectedTask, setSelectedTask] = useState(null); // Task to show in detail modal
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter tasks to show:
  // 1. All backlog tasks (moved from completed sprints)
  // 2. Available tasks with due dates within the sprint's date range
  const getEligibleTasksForSprint = (sprint) => {
    if (!sprint.start_date || !sprint.end_date) {
      return [...backlogTasks]; // If no dates, show only backlog tasks
    }

    const sprintStart = new Date(sprint.start_date);
    const sprintEnd = new Date(sprint.end_date);

    // Get available tasks with due dates in sprint range
    const tasksInDateRange = availableTasks.filter(task => {
      if (!task.due_date) {
        return false; // Exclude tasks without due dates
      }
      const taskDueDate = new Date(task.due_date);
      return taskDueDate >= sprintStart && taskDueDate <= sprintEnd;
    });

    // Combine backlog tasks and tasks in date range (remove duplicates)
    const combinedTasks = [...backlogTasks, ...tasksInDateRange];
    const uniqueTasks = combinedTasks.filter((task, index, self) =>
      index === self.findIndex((t) => t._id === task._id)
    );

    return uniqueTasks;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      planned: { class: 'status-badge-planned', label: 'Planned', icon: FiCalendar },
      active: { class: 'status-badge-active', label: 'Active', icon: FiPlay },
      completed: { class: 'status-badge-completed', label: 'Completed', icon: FiCheckCircle }
    };
    
    const config = statusConfig[status] || statusConfig.planned;
    const Icon = config.icon;
    
    return (
      <span className={`status-badge ${config.class}`}>
        <Icon size={12} style={{ marginRight: '4px' }} />
        {config.label}
      </span>
    );
  };

  const getProgressPercentage = (completedTasks, totalTasks) => {
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  if (sprints.length === 0) {
    return <div className="no-sprints">No sprints yet</div>;
  }

  return (
    <div className="sprint-list">
      {sprints.map((sprint) => {
        // Calculate task count from frontend state instead of backend for immediate updates
        const tasksInSprint = sprintTasks[sprint._id] || [];
        const taskCount = tasksInSprint.length;
        const progress = getProgressPercentage(sprint.completed_tasks, sprint.total_tasks);
        const eligibleTasks = getEligibleTasksForSprint(sprint); // Get filtered tasks for this sprint
        
        return (
          <div key={sprint._id} className={`sprint-card sprint-${sprint.status}`}>
            <div className="sprint-card-header">
              <div className="sprint-info">
                <h3 className="sprint-name">
                  <Link to={`/projects/${projectId}/sprints/${sprint._id}`} className="sprint-link">
                    <FiTarget size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {sprint.name}
                  </Link>
                </h3>
                {getStatusBadge(sprint.status)}
              </div>
              
              <div className="sprint-actions">
                {/* View Tickets button - Show only for Active and Planned sprints - use frontend count */}
                {taskCount > 0 && sprint.status !== 'completed' && (
                  <button 
                    className="sprint-btn view-tasks-btn"
                    onClick={() => setShowSprintTasks(showSprintTasks === sprint._id ? null : sprint._id)}
                  >
                    <FiList size={14} style={{ marginRight: '4px' }} />
                    {showSprintTasks === sprint._id ? 'Hide Tickets' : `View Tickets (${taskCount})`}
                  </button>
                )}
                
                {/* Add Task button for Active and Planned sprints - Only for owners */}
                {isOwner && (sprint.status === "active" || sprint.status === "planned") && (
                  <button 
                    className="sprint-btn add-task-btn"
                    onClick={() => setShowTaskSelector(showTaskSelector === sprint._id ? null : sprint._id)}
                    disabled={eligibleTasks.length === 0}
                    title={eligibleTasks.length === 0 ? "No tasks in backlog with due dates in sprint range" : `${eligibleTasks.length} task(s) available`}
                  >
                    <FiPlusCircle size={14} style={{ marginRight: '4px' }} />
                    Add Task
                  </button>
                )}
                
                {isOwner && (
                  <>
                    {sprint.status === "planned" && (
                      <>
                        <button 
                          className="sprint-btn start-btn"
                          onClick={() => onStart(sprint._id)}
                        >
                          <FiPlay size={14} style={{ marginRight: '4px' }} />
                          Start Sprint
                        </button>
                        <button 
                          className="sprint-btn delete-btn"
                          onClick={() => onDelete(sprint._id)}
                        >
                          <FiTrash2 size={14} style={{ marginRight: '4px' }} />
                          Delete
                        </button>
                      </>
                    )}
                    
                    {sprint.status === "active" && (
                      <button 
                        className="sprint-btn complete-btn"
                        onClick={() => onComplete(sprint._id)}
                      >
                        <FiCheckCircle size={14} style={{ marginRight: '4px' }} />
                        Complete Sprint
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {sprint.goal && (
              <div className="sprint-goal">
                <FiTarget size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                <strong>Goal:</strong> {sprint.goal}
              </div>
            )}
            
            <div className="sprint-dates">
              <span className="sprint-date">
                <FiCalendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
              </span>
            </div>
            
            <div className="sprint-progress">
              <div className="progress-info">
                <span className="progress-text">
                  <FiTrendingUp size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {sprint.completed_tasks} / {taskCount > 0 ? taskCount : sprint.total_tasks} tasks completed
                </span>
                <span className="progress-percentage">{progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Display tasks in sprint */}
            {showSprintTasks === sprint._id && sprintTasks[sprint._id] && sprintTasks[sprint._id].length > 0 && (
              <div className="sprint-tasks-view">
                <div className="sprint-tasks-header">
                  <h4>
                    <FiList size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Tickets in Sprint ({sprintTasks[sprint._id].length})
                  </h4>
                </div>
                <div className="sprint-tasks-list">
                  {sprintTasks[sprint._id].map(task => (
                    <div 
                      key={task._id} 
                      className="sprint-task-item"
                      onClick={() => setSelectedTask(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="sprint-task-info">
                        <span className="sprint-task-id">
                          {task.ticket_id}
                        </span>
                        <span className="sprint-task-title">{task.title}</span>
                      </div>
                      <div className="sprint-task-meta">
                        <span className={`sprint-task-priority priority-${task.priority.toLowerCase()}`}>
                          {task.priority === 'High' && <FiAlertCircle size={12} style={{ marginRight: '4px' }} />}
                          {task.priority}
                        </span>
                        <span className={`sprint-task-status status-${task.status.toLowerCase().replace(' ', '-')}`}>
                          {task.status}
                        </span>
                        {task.assignee_name && (
                          <span className="sprint-task-assignee">
                            👤 {task.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showSprintTasks === sprint._id && (!sprintTasks[sprint._id] || sprintTasks[sprint._id].length === 0) && (
              <div className="sprint-tasks-view">
                <p className="no-tasks-message">No tickets in this sprint yet</p>
              </div>
            )}
            
            {/* Task Selector Dropdown */}
            {showTaskSelector === sprint._id && eligibleTasks.length > 0 && (
              <div className="task-selector-dropdown">
                <div className="task-selector-header">
                  <h4>
                    <FiPlusCircle size={16} style={{ marginRight: '6px' }} />
                    Add Tasks ({eligibleTasks.length})
                  </h4>
                  <button 
                    className="close-selector-btn"
                    onClick={() => setShowTaskSelector(null)}
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="task-selector-list">
                  {eligibleTasks.map(task => (
                    <div key={task._id} className="task-selector-item">
                      <div className="task-selector-info">
                        <span className="task-selector-title">{task.title}</span>
                        {task.due_date && (
                          <span className="task-selector-due-date">
                            <FiCalendar size={12} style={{ marginRight: '4px' }} />
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}
                        <span className={`task-selector-priority priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>
                      <button
                        className="add-to-sprint-btn"
                        onClick={async () => {
                          const success = await onAddTask(sprint._id, task._id);
                          if (success) {
                            setShowTaskSelector(null);
                          }
                        }}
                      >
                        <FiPlusCircle size={14} style={{ marginRight: '4px' }} />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            if (onRefresh) {
              onRefresh(); // Refresh sprint data when modal closes
            }
          }}
          onUpdate={(taskId, updateData) => {
            // Always refresh sprint data regardless of parameters
            if (onRefresh) {
              onRefresh();
            }
          }}
          isOwner={isOwner}
          projectTasks={Object.values(sprintTasks).flat().concat(backlogTasks).concat(availableTasks)}
        />
      )}
    </div>
  );
};

export default SprintList;