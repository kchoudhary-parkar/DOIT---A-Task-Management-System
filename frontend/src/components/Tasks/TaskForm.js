import React, { useState, useEffect } from "react";
import { 
  FiX, FiTag, FiPlus, FiCalendar, FiUser, 
  FiAlertCircle, FiFileText, FiFlag 
} from "react-icons/fi";
import { BsBug, BsCheckSquare, BsBook, BsBullseye } from "react-icons/bs";
import "./TaskForm.css";

function TaskForm({ onSubmit, onCancel, initialData = null, members = [], user = null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("task");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To Do");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");
  const [error, setError] = useState("");

  const assignableMembers = React.useMemo(() => {
    if (!user || !user.role) return members;
    
    if (user.role === "member") {
      return members.filter(member => 
        member.role !== "admin" && member.role !== "super-admin"
      );
    }
    
    return members;
  }, [members, user]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setIssueType(initialData.issue_type || "task");
      setPriority(initialData.priority || "Medium");
      setStatus(initialData.status || "To Do");
      setAssigneeId(initialData.assignee_id || "");
      setDueDate(initialData.due_date || "");
      setLabels(initialData.labels || []);
    }
  }, [initialData]);

  const handleAddLabel = (e) => {
    e.preventDefault();
    const label = labelInput.trim().toLowerCase();
    
    if (!label) return;
    
    if (label.length > 30) {
      setError("Label must be 30 characters or less");
      return;
    }
    
    if (!/^[a-z0-9\-_\/]+$/.test(label)) {
      setError("Label can only contain letters, numbers, hyphens, underscores, and slashes");
      return;
    }
    
    if (labels.includes(label)) {
      setError("Label already added");
      return;
    }
    
    setLabels([...labels, label]);
    setLabelInput("");
    setError("");
  };

  const handleRemoveLabel = (labelToRemove) => {
    setLabels(labels.filter(l => l !== labelToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (title.trim().length < 3) {
      setError("Task title must be at least 3 characters");
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      issue_type: issueType,
      priority,
      status,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      labels: labels,
    });
  };

  const getIssueTypeIcon = (type) => {
    switch (type) {
      case "bug": return <BsBug />;
      case "task": return <BsCheckSquare />;
      case "story": return <BsBook />;
      case "epic": return <BsBullseye />;
      default: return <BsCheckSquare />;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content task-form-modal">
        <div className="modal-header">
          <h2>{initialData ? "Edit Task" : "Create New Task"}</h2>
          <button type="button" onClick={onCancel} className="btn-close">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">
              <FiFileText size={14} />
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              <FiFileText size={14} />
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="issueType">
                {getIssueTypeIcon(issueType)}
                Issue Type
              </label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="epic">Epic</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">
                <FiFlag size={14} />
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">
                <FiAlertCircle size={14} />
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing">Testing</option>
                <option value="Dev Complete">Dev Complete</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assignee">
                <FiUser size={14} />
                Assign To
              </label>
              <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
              {user && user.role === "member" && (
                <small className="form-hint">
                  Note: Admin users are not shown in the list
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">
              <FiCalendar size={14} />
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="labels">
              <FiTag size={14} />
              Labels (optional)
            </label>
            <div className="label-input-container">
              <input
                type="text"
                id="labels"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddLabel(e);
                  }
                }}
                placeholder="Type label and press Enter"
                maxLength={30}
              />
              <button type="button" onClick={handleAddLabel} className="btn-add-label">
                <FiPlus size={16} />
                Add
              </button>
            </div>
            {labels.length > 0 && (
              <div className="labels-list">
                {labels.map((label) => (
                  <span key={label} className="label-badge">
                    <FiTag size={12} />
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="label-remove"
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              <FiX size={16} />
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FiPlus size={16} />
              {initialData ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskForm;