import React, { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { taskAPI } from "../../services/api";
import { getProjectSprints, addTaskToSprint, removeTaskFromSprint } from "../../services/sprintAPI";
import DevelopmentSection from "./DevelopmentSection";
import { 
  FiX, FiTag, FiPaperclip, FiLink, FiClock, FiUser, 
  FiCheckCircle, FiMessageSquare, FiTrash2, FiPlus, 
  FiExternalLink, FiDownload, FiUpload, FiCalendar, 
  FiFlag, FiActivity, FiLock, FiChevronLeft, FiChevronRight
} from "react-icons/fi";
import { 
  MdOutlineBugReport, MdOutlineTask, MdOutlineBook, 
  MdOutlineFlag 
} from "react-icons/md";
import "./TaskDetailModal.css";

function TaskDetailModal({ task, onClose, onUpdate, isOwner, projectTasks = [] }) {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState(task.status);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for adding new items
  const [labelInput, setLabelInput] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("link");
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkType, setLinkType] = useState("blocks");
  const [linkedTicketId, setLinkedTicketId] = useState("");

  // Sprint-related state
  const [projectSprints, setProjectSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [loadingSprints, setLoadingSprints] = useState(false);

  // Local state for task data
  const [taskData, setTaskData] = useState(task);

  // Activity filtering and pagination state
  const [activityFilter, setActivityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Function to refresh task data from server
  const refreshTaskData = useCallback(async () => {
    try {
      const response = await taskAPI.getById(task._id);
      // Backend returns { task: {...} }
      const refreshedTask = response.task || response;
      console.log("Refreshed task data:", refreshedTask);
      console.log("Activities count:", refreshedTask.activities?.length || 0);
      setTaskData(refreshedTask);
      return refreshedTask;
    } catch (err) {
      console.error("Failed to refresh task data:", err);
      return null;
    }
  }, [task._id]);

  // Refresh task data when modal opens or task changes
  useEffect(() => {
    const loadTaskData = async () => {
      if (task._id) {
        await refreshTaskData();
      }
    };
    loadTaskData();
  }, [task._id, refreshTaskData]); // Re-fetch when task ID changes (modal reopens with different task)

  // Handle Escape key press to close modal
useEffect(() => {
  const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  // Add event listener when modal mounts
  document.addEventListener('keydown', handleEscapeKey);

  // Cleanup: remove event listener when modal unmounts
  return () => {
    document.removeEventListener('keydown', handleEscapeKey);
  };
}, [taskData]); // Include taskData in dependency array to ensure latest data is used in handleClose
  // Fetch project sprints on component mount and when task data changes
  useEffect(() => {
    const fetchSprints = async () => {
      if (!task.project_id) return;
      try {
        setLoadingSprints(true);
        const response = await getProjectSprints(task.project_id);
        
        // Filter sprints based on:
        // 1. Not completed
        // 2. Task's due date falls within sprint's date range (if task has due date)
        const eligibleSprints = response.sprints.filter(sprint => {
          // Filter out completed sprints
          if (sprint.status && sprint.status.toLowerCase() === "completed") {
            return false;
          }
          
          // If task has no due date, show all active sprints
          if (!taskData.due_date && !task.due_date) {
            return true;
          }
          
          // If sprint has no dates, show it
          if (!sprint.start_date || !sprint.end_date) {
            return true;
          }
          
          // Check if task's due date falls within sprint's date range
          const taskDueDate = new Date(taskData.due_date || task.due_date);
          const sprintStart = new Date(sprint.start_date);
          const sprintEnd = new Date(sprint.end_date);
          
          return taskDueDate >= sprintStart && taskDueDate <= sprintEnd;
        });
        
        setProjectSprints(eligibleSprints);
        
        // Validate current sprint assignment - clear if sprint no longer exists
        if (taskData.sprint_id) {
          const sprintExists = response.sprints.some(s => s._id === taskData.sprint_id);
          if (!sprintExists) {
            // Sprint was deleted, update taskData to clear sprint info
            setTaskData(prev => ({
              ...prev,
              sprint_id: null,
              sprint_name: null
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch sprints:", err);
      } finally {
        setLoadingSprints(false);
      }
    };
    fetchSprints();
  }, [task.project_id, task.due_date, taskData.due_date, taskData.sprint_id]);

  // Determine if user can change status
  const canChangeStatus = isOwner || (task.assignee_id === user?.id);
  
  // Check if ticket is closed (read-only mode)
  const isClosed = taskData.status === "Closed" || task.status === "Closed";

  // Check if task is unassigned and user is a member (not owner)
  const showAcceptTicket = !isOwner && !task.assignee_id;

  // Enhanced close handler that updates parent with latest data
  const handleClose = () => {
    // Update parent component with the latest task data before closing
    if (onUpdate && taskData) {
      onUpdate(task._id, taskData);
    }
    onClose();
  };

  const handleAcceptTicket = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await taskAPI.update(task._id, { assignee_id: user.id });
      setSuccess("Ticket accepted! You are now assigned to this task.");
      setTimeout(() => {
        onUpdate(task._id, { assignee_id: user.id, assignee_name: user.name });
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to accept ticket");
      setLoading(false);
    }
  };

  const handleApproveTask = async () => {
    if (!window.confirm("Are you sure you want to approve and close this task?")) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await taskAPI.approveTask(task._id);
      setSuccess("Task approved and closed successfully!");
      setTimeout(() => {
        onUpdate(task._id, { status: "Closed" });
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to approve task");
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      setError("Comment cannot be empty");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await taskAPI.addComment(task._id, comment);
      setComment("");
      setSuccess("Comment added!");
      
      // Refresh task data to get updated activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to add comment");
      setLoading(false);
    }
  };

  const handleAddLabel = async () => {
    if (!labelInput.trim()) return;
    try {
      setError("");
      await taskAPI.addLabel(task._id, labelInput.trim());
      
      setLabelInput("");
      setSuccess("Label added!");
      
      // Refresh task data to get updated labels and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.message || "Failed to add label");
    }
  };

  const handleRemoveLabel = async (label) => {
    try {
      setError("");
      await taskAPI.removeLabel(task._id, label);
      
      setSuccess("Label removed!");
      
      // Refresh task data to get updated labels and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.message || "Failed to remove label");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("File type not supported. Please upload PDF, Excel, CSV, Word, or image files.");
      return;
    }
    setSelectedFile(file);
    setError("");
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAddAttachment = async () => {
    if (!attachmentName.trim()) {
      setError("Attachment name is required");
      return;
    }
    let attachmentData = {
      name: attachmentName.trim()
    };
    try {
      setError("");
      setLoading(true);
      if (attachmentType === "link") {
        if (!attachmentUrl.trim()) {
          setError("URL is required for link attachments");
          setLoading(false);
          return;
        }
        if (!attachmentUrl.startsWith("http://") && !attachmentUrl.startsWith("https://")) {
          setError("URL must start with http:// or https://");
          setLoading(false);
          return;
        }
        attachmentData.url = attachmentUrl.trim();
      } else {
        if (!selectedFile) {
          setError("Please select a file to upload");
          setLoading(false);
          return;
        }
        const base64 = await convertFileToBase64(selectedFile);
        attachmentData.url = base64;
        attachmentData.fileName = selectedFile.name;
        attachmentData.fileType = selectedFile.type;
        attachmentData.fileSize = selectedFile.size;
      }
      await taskAPI.addAttachment(task._id, attachmentData);

      setAttachmentName("");
      setAttachmentUrl("");
      setSelectedFile(null);
      setAttachmentType("link");

      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';

      setSuccess("Attachment added!");
      
      // Refresh task data to get updated attachments and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to add attachment");
      setLoading(false);
    }
  };

  const handleRemoveAttachment = async (url) => {
    try {
      setError("");
      await taskAPI.removeAttachment(task._id, url);
      
      setSuccess("Attachment removed!");
      
      // Refresh task data to get updated attachments and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.message || "Failed to remove attachment");
    }
  };

  const handleAddLink = async () => {
    if (!linkedTicketId.trim()) {
      setError("Ticket ID is required");
      return;
    }
    try {
      setError("");
      await taskAPI.addLink(task._id, {
        type: linkType,
        linked_ticket_id: linkedTicketId.trim()
      });
      
      // Reset form
      setLinkedTicketId("");
      setLinkType("blocks");
      
      setSuccess("Link added successfully!");
      
      // Refresh task data to get updated links and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
      
      // Notify parent to refresh task data
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err.message || "Failed to add link");
    }
  };

  const handleRemoveLink = async (linkedTicketId, linkType) => {
    try {
      setError("");
      await taskAPI.removeLink(task._id, linkedTicketId, linkType);
      
      setSuccess("Link removed successfully!");
      
      // Refresh task data to get updated links and activities
      await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
      
      // Notify parent to refresh task data
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err.message || "Failed to remove link");
    }
  };

  const handleAddToSprint = async () => {
    if (!selectedSprintId) {
      setError("Please select a sprint");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await addTaskToSprint(selectedSprintId, task._id);
      
      setSuccess("Task added to sprint successfully!");
      setSelectedSprintId("");
      
      // Refresh task data to get updated sprint info and activities
      const updatedTask = await refreshTaskData();
      
      setTimeout(() => setSuccess(""), 2000);
      
      // Notify parent to refresh task data with updated task
      if (onUpdate && updatedTask) {
        onUpdate(task._id, updatedTask);
      }
      
      // Notify SprintPage that sprint data has changed
      console.log('[TaskDetailModal] Dispatching sprintDataChanged event after adding to sprint, projectId:', task.project_id);
      window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
        detail: { projectId: task.project_id } 
      }));
    } catch (err) {
      setError(err.message || "Failed to add task to sprint");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromSprint = async () => {
    if (!taskData.sprint_id) return;
    
    if (!window.confirm("Are you sure you want to remove this task from the sprint?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      await removeTaskFromSprint(taskData.sprint_id, task._id);
      
      setSuccess("Task removed from sprint successfully!");
      
      // Refresh task data to get updated sprint info and activities
      const updatedTask = await refreshTaskData();
      
      // Refresh sprint list to remove this task from deleted sprint
      if (task.project_id) {
        const response = await getProjectSprints(task.project_id);
        const eligibleSprints = response.sprints.filter(sprint => 
          sprint.status && sprint.status.toLowerCase() !== "completed"
        );
        setProjectSprints(eligibleSprints);
      }
      
      setTimeout(() => setSuccess(""), 2000);
      
      // Notify parent to refresh task data with updated task
      if (onUpdate && updatedTask) {
        onUpdate(task._id, updatedTask);
      }
      
      // Notify SprintPage that sprint data has changed
      console.log('[TaskDetailModal] Dispatching sprintDataChanged event after removing from sprint, projectId:', task.project_id);
      window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
        detail: { projectId: task.project_id } 
      }));
    } catch (err) {
      setError(err.message || "Failed to remove task from sprint");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    // Format time as HH:MM AM/PM
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    
    // Recent timestamps show relative time + actual time
    if (diffMins < 1) return `Just now (${timeStr})`;
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago (${timeStr})`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago (${timeStr})`;
    
    // Older timestamps show date + time
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
    
    return `${dateStr} at ${timeStr}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#f44336";
      case "Medium": return "#ff9800";
      case "Low": return "#4caf50";
      default: return "#999";
    }
  };

  const getIssueTypeIcon = (issueType) => {
    switch (issueType) {
      case "bug": return <MdOutlineBugReport />;
      case "task": return <MdOutlineTask />;
      case "story": return <MdOutlineBook />;
      case "epic": return <MdOutlineFlag />;
      default: return <MdOutlineTask />;
    }
  };

  const getIssueTypeColor = (issueType) => {
    switch (issueType) {
      case "bug": return "#ef4444";
      case "task": return "#3b82f6";
      case "story": return "#8b5cf6";
      case "epic": return "#f97316";
      default: return "#3b82f6";
    }
  };

  // Activity filtering and pagination functions
  const getFilteredActivities = () => {
    if (!taskData.activities || taskData.activities.length === 0) return [];
    
    let filtered = [...taskData.activities];
    
    switch (activityFilter) {
      case "comments":
        filtered = filtered.filter(activity => 
          activity.action === "comment"
        );
        break;
      case "labels":
        filtered = filtered.filter(activity => 
          activity.action === "label_add" || activity.action === "label_remove"
        );
        break;
      case "attachments":
        filtered = filtered.filter(activity => 
          activity.action === "attachment_add" || activity.action === "attachment_remove"
        );
        break;
      case "status":
        filtered = filtered.filter(activity => 
          activity.action === "status_change"
        );
        break;
      case "all":
      default:
        // Show all activities
        break;
    }
    
    return filtered.reverse();
  };

  const getPaginatedActivities = () => {
    const filtered = getFilteredActivities();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredActivities();
    return Math.ceil(filtered.length / ITEMS_PER_PAGE);
  };

  const handleFilterChange = (filter) => {
    setActivityFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getActivityCount = (filterType) => {
    if (!taskData.activities || taskData.activities.length === 0) return 0;
    
    switch (filterType) {
      case "all":
        return taskData.activities.length;
      case "comments":
        return taskData.activities.filter(a => 
          a.action === "comment"
        ).length;
      case "labels":
        return taskData.activities.filter(a => 
          a.action === "label_add" || a.action === "label_remove"
        ).length;
      case "attachments":
        return taskData.activities.filter(a => 
          a.action === "attachment_add" || a.action === "attachment_remove"
        ).length;
      case "status":
        return taskData.activities.filter(a => 
          a.action === "status_change"
        ).length;
      default:
        return 0;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            {task.ticket_id && (
              <span className="task-detail-ticket-id">{task.ticket_id}</span>
            )}
            <h2>{task.title}</h2>
          </div>
          <button type="button" onClick={handleClose} className="btn-close">
            <FiX size={20} />
          </button>
        </div>
        <div className="modal-body">
          {showAcceptTicket ? (
            <div className="unassigned-task-view">
              <div className="task-info-section">
                <div className="info-row">
                  <span className="info-label">Issue Type:</span>
                  <span
                    className="issue-type-badge"
                    style={{ backgroundColor: getIssueTypeColor(task.issue_type || "task") }}
                  >
                    {getIssueTypeIcon(task.issue_type || "task")} {(task.issue_type || "task").charAt(0).toUpperCase() + (task.issue_type || "task").slice(1)}
                  </span>
                </div>
              </div>
              <div className="task-description-section">
                <h3>Description</h3>
                <p className="task-description">{task.description || "No description provided"}</p>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <div className="accept-ticket-section">
                <button
                  onClick={handleAcceptTicket}
                  disabled={loading}
                  className="btn btn-primary accept-ticket-btn"
                >
                  <FiCheckCircle size={18} style={{ marginRight: '8px' }} />
                  {loading ? "Accepting..." : "Accept This Ticket"}
                </button>
                <p className="accept-info">
                  Click to accept this ticket and it will be assigned to you. You'll then have full access to all task details.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="task-info-section">
                <div className="info-row">
                  <span className="info-label">Issue Type:</span>
                  <span
                    className="issue-type-badge"
                    style={{ backgroundColor: getIssueTypeColor(task.issue_type || "task") }}
                  >
                    {getIssueTypeIcon(task.issue_type || "task")} {(task.issue_type || "task").charAt(0).toUpperCase() + (task.issue_type || "task").slice(1)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}>
                    {status}
                  </span>
                  {isClosed && (
                    <span className="closed-badge" style={{ marginLeft: '10px', padding: '4px 12px', backgroundColor: '#64748b', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FiLock size={12} /> Read-Only
                    </span>
                  )}
                  {isOwner && status === "Done" && (
                    <button
                      className="btn-approve-task"
                      onClick={handleApproveTask}
                      disabled={loading}
                    >
                      <FiCheckCircle size={16} style={{ marginRight: '4px' }} /> Approve & Close
                    </button>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label"><FiFlag size={14} /> Priority:</span>
                  <span className="priority-badge" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                    {task.priority}
                  </span>
                  {taskData.sprint_id && (
                    <span className="sprint-display">
                      <FiClock size={14} />
                      <span className="sprint-name">{taskData.sprint_name || task.sprint_name || "In Sprint"}</span>
                    </span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label"><FiUser size={14} /> Created By:</span>
                  <span className="user-info">
                    <span className="user-name">{taskData.created_by_name || task.created_by_name || "Unknown"}</span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label"><FiUser size={14} /> Assigned to:</span>
                  <span className="user-info">
                    <span className="user-name">{taskData.assignee_name || task.assignee_name || "Unassigned"}</span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label"><FiCalendar size={14} /> Due Date:</span>
                  <span>{formatDate(task.due_date)}</span>
                </div>
              </div>
              {taskData.description && (
                <div className="description-section">
                  <h3>Description</h3>
                  <p>{taskData.description}</p>
                </div>
              )}
              {isClosed && (
                <div className="closed-notice" style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#f1f5f9', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FiLock size={18} />
                  <span style={{ color: '#475569', fontSize: '14px' }}>
                    This ticket is closed and cannot be modified. All existing information is available in read-only mode.
                  </span>
                </div>
              )}
              <div className="labels-section">
                <h3><FiTag size={16} /> Labels</h3>
                {!isClosed && (
                  <div className="labels-input-group">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddLabel()}
                      placeholder="Add label (e.g., frontend, bug-fix)"
                      className="label-input"
                    />
                    <button type="button" onClick={handleAddLabel} className="btn-add-label">
                      <FiPlus size={16} /> Add
                    </button>
                  </div>
                )}
                {taskData.labels && taskData.labels.length > 0 ? (
                  <div className="labels-container">
                    {taskData.labels.map((label) => (
                      <span key={label} className="label-badge-detail">
                        {label}
                        {isOwner && !isClosed && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(label)}
                            className="label-remove"
                          >
                            <FiX size={14} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  isClosed && <p style={{ color: '#94a3b8', fontSize: '14px', margin: '10px 0' }}>No labels</p>
                )}
              </div>

          {/* Development Section - GitHub Integration */}
          <DevelopmentSection taskId={taskData._id} />

          <div className="attachments-section">
            <h3><FiPaperclip size={16} /> Attachments</h3>
            {!isClosed && (
              <div className="attachment-input-group">
                <select
                  value={attachmentType}
                  onChange={(e) => {
                    setAttachmentType(e.target.value);
                      setAttachmentUrl("");
                      setSelectedFile(null);
                      setError("");
                    }}
                    className="attachment-type-select"
                  >
                    <option value="link">Link</option>
                    <option value="document">Document (PDF, Excel, CSV, Word, Images)</option>
                  </select>
                 
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="Attachment name"
                    className="attachment-input"
                  />
                 
                  {attachmentType === "link" ? (
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="https://example.com/file.pdf"
                      className="attachment-input"
                    />
                  ) : (
                    <div className="file-upload-container">
                      <input
                        type="file"
                        id="file-upload-input"
                        onChange={handleFileSelect}
                        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="file-upload-input" className="file-upload-btn">
                        <FiUpload size={16} style={{ marginRight: '6px' }} />
                        {selectedFile ? selectedFile.name : "Choose File"}
                      </label>
                    </div>
                  )}
                 
                  <button type="button" onClick={handleAddAttachment} className="btn-add-attachment" disabled={loading}>
                    <FiPlus size={16} /> {loading ? "Adding..." : "Add"}
                  </button>
                </div>
            )}
                {taskData.attachments && taskData.attachments.length > 0 ? (
                  <div className="attachments-list">
                    {taskData.attachments.map((attachment, index) => {
                      const isDocument = attachment.url.startsWith('data:');
                     
                      return (
                        <div key={index} className="attachment-item">
                          {isDocument ? (
                            <a
                              href={attachment.url}
                              download={attachment.fileName || attachment.name}
                              className="attachment-link"
                            >
                              <FiDownload size={16} />
                              <span className="attachment-name">{attachment.name}</span>
                              {attachment.fileSize && (
                                <span className="file-size-badge">
                                  ({(attachment.fileSize / 1024).toFixed(2)} KB)
                                </span>
                              )}
                            </a>
                          ) : (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="attachment-link"
                            >
                              <FiExternalLink size={16} />
                              <span className="attachment-name">{attachment.name}</span>
                            </a>
                          )}
                          <span className="attachment-meta">
                            Added by {attachment.added_by_name}
                          </span>
                          {isOwner && !isClosed && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveAttachment(attachment.url)}
                              className="btn-remove-attachment"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  isClosed && <p style={{ color: '#94a3b8', fontSize: '14px', margin: '10px 0' }}>No attachments</p>
                )}
              </div>
              <div className="links-section">
                <h3><FiLink size={16} /> Linked Tickets</h3>
                {!isClosed && (
                  <div className="link-input-group">
                    <select
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value)}
                      className="link-type-select"
                    >
                      <option value="blocks">Blocks</option>
                      <option value="blocked-by">Blocked by</option>
                      <option value="relates-to">Relates to</option>
                      <option value="duplicates">Duplicates</option>
                    </select>
                    <select
                      value={linkedTicketId}
                      onChange={(e) => setLinkedTicketId(e.target.value)}
                      className="link-input"
                    >
                      <option value="">Select a ticket...</option>
                      {projectTasks
                        .filter((t) => t._id !== task._id)
                        .map((t) => (
                          <option key={t._id} value={t.ticket_id}>
                            {t.ticket_id} - {t.title}
                          </option>
                        ))}
                    </select>
                    <button onClick={handleAddLink} className="btn-add-link" disabled={!linkedTicketId}>
                      <FiPlus size={16} /> Add Link
                    </button>
                  </div>
                )}
                {taskData.links && taskData.links.length > 0 ? (
                  <div className="links-list">
                    {taskData.links.map((link, index) => (
                      <div key={index} className="link-item">
                        <span className="link-type">{link.type}</span>
                        <span className="link-ticket">{link.linked_ticket_id}</span>
                        {isOwner && !isClosed && (
                          <button
                            onClick={() => handleRemoveLink(link.linked_ticket_id, link.type)}
                            className="link-remove"
                          >
                            <FiX size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  isClosed && <p style={{ color: '#94a3b8', fontSize: '14px', margin: '10px 0' }}>No linked tickets</p>
                )}
              </div>
              {/* Sprint Section */}
              <div className="sprint-section">
                <h3><FiClock size={16} /> Sprint</h3>
                {taskData.sprint_id ? (
                  <div className="current-sprint">
                    <div className="sprint-info">
                      <FiClock size={18} />
                      <span className="sprint-name-large">{taskData.sprint_name || task.sprint_name || "Current Sprint"}</span>
                    </div>
                    {!isClosed && (
                      <button 
                        type="button" 
                        onClick={handleRemoveFromSprint} 
                        className="btn-remove-sprint"
                        disabled={loading}
                      >
                        <FiTrash2 size={14} /> Remove from Sprint
                      </button>
                    )}
                  </div>
                ) : (
                  !isClosed ? (
                    <div className="sprint-dropdown-group">
                      <select
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        className="sprint-select"
                        disabled={loadingSprints || projectSprints.length === 0}
                      >
                        <option value="">Select a sprint...</option>
                        {projectSprints.map((sprint) => (
                          <option key={sprint._id} value={sprint._id}>
                            {sprint.name} ({sprint.status})
                          </option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={handleAddToSprint} 
                        className="btn-add-to-sprint"
                        disabled={!selectedSprintId || loading}
                      >
                        <FiPlus size={14} /> Add to Sprint
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: '10px 0' }}>No sprint assigned</p>
                  )
                )}
                {!taskData.sprint_id && !isClosed && projectSprints.length === 0 && !loadingSprints && (
                  <p className="no-sprints">No active sprints available</p>
                )}
              </div>
              
              {/* Activity Section with Filters and Pagination */}
              <div className="activity-section">
                <div className="activity-header-container">
                  <h3><FiActivity size={16} /> Activity</h3>
                  <div className="activity-filters">
                    <button 
                      className={`filter-btn ${activityFilter === "all" ? "active" : ""}`}
                      onClick={() => handleFilterChange("all")}
                    >
                      All ({getActivityCount("all")})
                    </button>
                    <button 
                      className={`filter-btn ${activityFilter === "comments" ? "active" : ""}`}
                      onClick={() => handleFilterChange("comments")}
                    >
                      <FiMessageSquare size={14} /> Comments ({getActivityCount("comments")})
                    </button>
                    <button 
                      className={`filter-btn ${activityFilter === "labels" ? "active" : ""}`}
                      onClick={() => handleFilterChange("labels")}
                    >
                      <FiTag size={14} /> Labels ({getActivityCount("labels")})
                    </button>
                    <button 
                      className={`filter-btn ${activityFilter === "attachments" ? "active" : ""}`}
                      onClick={() => handleFilterChange("attachments")}
                    >
                      <FiPaperclip size={14} /> Attachments ({getActivityCount("attachments")})
                    </button>
                    <button 
                      className={`filter-btn ${activityFilter === "status" ? "active" : ""}`}
                      onClick={() => handleFilterChange("status")}
                    >
                      <FiActivity size={14} /> Status ({getActivityCount("status")})
                    </button>
                  </div>
                </div>

                {canChangeStatus && !isClosed && (
                  <div className="add-comment-section">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="comment-textarea"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={loading || !comment.trim()}
                      className="btn btn-secondary"
                    >
                      <FiMessageSquare size={16} style={{ marginRight: '6px' }} />
                      {loading ? "Adding..." : "Add Comment"}
                    </button>
                  </div>
                )}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <div className="activities-list">
                  {/* Fixed header with Assignee + Reported By */}
                  <div className="activity-item activity-initial">
                    <div className="activity-header">
                      <span className="activity-user"><FiUser size={14} /> Task Created</span>
                      <span className="activity-time">{formatTimestamp(taskData.created_at || taskData.timestamp || task.created_at)}</span>
                    </div>
                    <div className="activity-content">
                      <p className="activity-action">
                        <FiUser size={14} /> Created by <strong>{taskData.created_by_name || task.created_by_name || "Unknown"}</strong>
                      </p>
                      {(taskData.assignee_name || task.assignee_name) && (
                        <p className="activity-action">
                          <FiUser size={14} /> Assigned to <strong>{taskData.assignee_name || task.assignee_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Paginated activity logs */}
                  {getPaginatedActivities().length > 0 ? (
                    getPaginatedActivities().map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-header">
                          <span className="activity-user"><FiUser size={14} /> {activity.user_name}</span>
                          <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                        </div>
                        {activity.action === "status_change" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiActivity size={14} /> Changed status from <strong>{activity.old_value}</strong> → <strong>{activity.new_value}</strong>
                            </p>
                            {activity.comment && (
                              <p className="activity-comment"><FiMessageSquare size={14} /> {activity.comment}</p>
                            )}
                          </div>
                        )}
                        {activity.action === "comment" && (
                          <div className="activity-content">
                            <p className="activity-action"><FiMessageSquare size={14} /> Commented:</p>
                            <p className="activity-comment">{activity.comment}</p>
                          </div>
                        )}
                        {activity.action === "label_add" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiTag size={14} /> Added label <strong>{activity.label}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "label_remove" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiTrash2 size={14} /> Removed label <strong>{activity.label}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "attachment_add" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              {activity.attachment_type === "link" ? <FiLink size={14} /> : <FiPaperclip size={14} />} Added {activity.attachment_type === "link" ? "link" : "document"}: <strong>{activity.attachment_name || activity.new_value || "(unnamed)"}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "attachment_remove" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiTrash2 size={14} /> Removed attachment: <strong>{activity.attachment_name || activity.old_value || "(unnamed)"}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "link_add" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiLink size={14} /> Added link relationship: <strong>{taskData.ticket_id || task.ticket_id}</strong> {activity.link_type && <><em>{activity.link_type}</em> </>}<strong>{activity.linked_ticket_id || "(unknown)"}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "link_remove" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiTrash2 size={14} /> Removed link relationship: {activity.link_type && <><strong>{activity.link_type}</strong> </>}<strong>{activity.linked_ticket_id || "(unknown)"}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "sprint_add" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiClock size={14} /> Added to sprint: <strong>{activity.sprint_name || activity.new_value || "(unnamed sprint)"}</strong>
                            </p>
                          </div>
                        )}
                        {activity.action === "sprint_remove" && (
                          <div className="activity-content">
                            <p className="activity-action">
                              <FiTrash2 size={14} /> Removed from sprint: <strong>{activity.sprint_name || activity.old_value || "(unnamed sprint)"}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="no-activity">
                      {activityFilter === "all" 
                        ? "No further activity yet" 
                        : `No ${activityFilter} activities yet`}
                    </p>
                  )}
                </div>

                {/* Pagination Controls */}
                {getTotalPages() > 1 && (
                  <div className="pagination-controls">
                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <FiChevronLeft size={16} /> Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {getTotalPages()}
                    </span>
                    <button 
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                    >
                      Next <FiChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;