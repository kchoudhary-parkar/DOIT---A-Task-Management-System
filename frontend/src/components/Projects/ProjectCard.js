import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  FiFolder,
  FiEdit2,
  FiTrash2,
  FiArrowRight,
  FiCalendar,
  FiAward,
  FiUser,
  FiLayers,
  FiCheckCircle,
  FiClock
} from "react-icons/fi";
import "./ProjectCard.css";

function ProjectCard({ project, onDelete, onEdit }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Check if current user is the project owner
  const isOwner = project.owner_id === user?.id || project.user_id === user?.id || project.is_owner;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('.btn-icon') || e.target.closest('.btn-view-tasks')) {
      return;
    }
    navigate(`/projects/${project._id}/tasks`);
  };

  // Mock task stats - replace with real data when available
  const taskStats = {
    total: project.taskCount || 0,
    completed: project.completedTasks || 0
  };

  return (
    <div className="project-card" onClick={handleCardClick}>
      <div className="project-card-header">
        <div className="project-title-section">
          <div className="project-title-row">
            <div className="project-icon-wrapper">
              <FiFolder size={20} style={{ color: '#06b6d4' }} />
            </div>
            <div className="project-title-with-prefix">
              {project.prefix && (
                <span className="project-prefix">
                  <FiLayers size={12} />
                  {project.prefix}
                </span>
              )}
              <h3>{project.name}</h3>
            </div>
          </div>
          <div className="project-meta-row">
            <span className={`role-badge ${isOwner ? 'owner' : 'member'}`}>
              {isOwner ? (
                <>
                  <FiAward size={12} />
                  Owner
                </>
              ) : (
                <>
                  <FiUser size={12} />
                  Member
                </>
              )}
            </span>
          </div>
        </div>
        {isOwner && (
          <div className="project-card-actions">
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }} 
              className="action-btn edit-btn"
              aria-label="Edit project"
            >
              <FiEdit2 size={16} />
            </button>
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project._id);
              }} 
              className="action-btn delete-btn"
              aria-label="Delete project"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <p className="project-description">
        {project.description || "No description provided"}
      </p>

      {taskStats.total > 0 && (
        <div className="project-stats">
          <div className="stat-item">
            <FiCheckCircle size={14} />
            <span><strong>{taskStats.completed}</strong> / {taskStats.total} completed</span>
          </div>
          <div className="stat-item">
            <FiClock size={14} />
            <span><strong>{taskStats.total - taskStats.completed}</strong> remaining</span>
          </div>
        </div>
      )}

      <div className="project-card-footer">
        <div className="project-date">
          <FiCalendar size={12} />
          <span>Created {formatDate(project.created_at)}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/projects/${project._id}/tasks`);
          }} 
          className="btn-view-tasks"
        >
          View Tasks
          <FiArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;