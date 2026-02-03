import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiCalendar,
  FiUser,
  FiClock
} from "react-icons/fi";
import "./KanbanTaskCard.css";

function KanbanTaskCard({ task, isDragging = false, user, isOwner, onClick }) {
  // All team members can interact with all tasks
  const canInteract = true;
  const isLocked = !canInteract;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return <FiAlertCircle size={12} />;
      case "medium":
        return <FiAlertTriangle size={12} />;
      case "low":
        return <FiCheckCircle size={12} />;
      default:
        return <FiAlertTriangle size={12} />;
    }
  };

  const handleCardClick = (e) => {
    // Only trigger onClick if not dragging and onClick is provided
    if (!isSortableDragging && onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-task-card ${isSortableDragging ? "dragging" : ""} ${
        isLocked ? "locked" : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Locked Overlay */}
      {isLocked && (
        <div className="locked-overlay">
          <span className="lock-icon">🔒</span>
        </div>
      )}

      {/* Card Header */}
      <div className="task-card-header">
        <div className="task-header-content">
          {task.ticket_id && (
            <span className="task-ticket-id">{task.ticket_id}</span>
          )}
          <h4 className="task-card-title">{task.title}</h4>
        </div>
        <div className="task-header-right">
          {task.priority && (
            <span className={`task-card-priority ${task.priority.toLowerCase()}`}>
              {getPriorityIcon(task.priority)}
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <div className="task-card-due-date">
              <FiCalendar size={11} className="due-date-icon" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="task-card-footer">
        {/* Top Row: Assignee and Created By */}
        <div className="footer-top-row">
          {/* Assignee */}
          <div className="task-card-assignee">
            {task.assignee_name ? (
              <>
                <div className="assignee-avatar">
                  {getInitials(task.assignee_name)}
                </div>
                <span className="assignee-name">{task.assignee_name}</span>
              </>
            ) : (
              <span className="unassigned">
                <FiUser size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Unassigned
              </span>
            )}
          </div>

          {/* Created By */}
          {task.created_by_name && (
            <div className="task-card-creator">
              <FiClock size={11} className="creator-icon" />
              <span className="creator-name">By: {task.created_by_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KanbanTaskCard;