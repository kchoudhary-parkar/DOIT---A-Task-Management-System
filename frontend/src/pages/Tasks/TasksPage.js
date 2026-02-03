import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { taskAPI, projectAPI, memberAPI } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import TaskCard from "../../components/Tasks/TaskCard";
import TaskForm from "../../components/Tasks/TaskForm";
import MemberManager from "../../components/Tasks/MemberManager";
import { TaskDetailModal } from "../../components/Tasks";
import { KanbanBoard } from "../../components/Kanban";
import { CalendarView } from "../../components/Calendar";
import {
  FiArrowLeft,
  FiArchive,
  FiUsers,
  FiPlusCircle,
  FiActivity,
  FiList,
  FiCalendar,
  FiFilter
} from "react-icons/fi";
import "./TasksPage.css";
import Loader from "../../components/Loader/Loader";

function TasksPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showMembers, setShowMembers] = useState(false);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" or "list"
  const [showClosedTasks, setShowClosedTasks] = useState(false);

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [projectData, tasksData, membersData] = await Promise.all([
        projectAPI.getById(projectId),
        taskAPI.getByProject(projectId),
        memberAPI.getMembers(projectId),
      ]);

      setProject(projectData.project);
      setTasks(tasksData.tasks || []);
      setMembers(membersData.members || []);
    } catch (err) {
      setError(err.message || "Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleCreateTask = async (taskData) => {
    try {
      await taskAPI.create(projectId, taskData);
      setShowTaskForm(false);
      await fetchProjectData();
    } catch (err) {
      alert(err.message || "Failed to create task");
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      await taskAPI.update(editingTask._id, taskData);
      setEditingTask(null);
      setShowTaskForm(false);
      await fetchProjectData();
    } catch (err) {
      alert(err.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await taskAPI.delete(taskId);
      await fetchProjectData();
      
      // Notify other components (like SprintPage) that data has changed
      console.log('[TasksPage] Task deleted, dispatching sprintDataChanged event, projectId:', projectId);
      window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
        detail: { projectId } 
      }));
    } catch (err) {
      alert(err.message || "Failed to delete task");
    }
  };

  const handleEditTask = (task) => setEditingTask(task);
  const handleTaskClick = (task) => setSelectedTask(task);

  const handleTaskDetailUpdate = async (taskId, updateData) => {
    try {
      if (!taskId) {
        const tasksData = await taskAPI.getByProject(projectId);
        setTasks(tasksData.tasks || []);
        
        if (selectedTask) {
          const updatedSelectedTask = tasksData.tasks.find(t => t._id === selectedTask._id);
          if (updatedSelectedTask) {
            setSelectedTask(updatedSelectedTask);
          }
        }
        
        // Notify sprint page about the change
        window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
          detail: { projectId } 
        }));
        return;
      }
      
      if (updateData && updateData._id) {
        setTasks(prevTasks => 
          prevTasks.map(t => t._id === taskId ? updateData : t)
        );
        
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(updateData);
        }
        
        // Notify sprint page about the change
        window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
          detail: { projectId } 
        }));
        return;
      }
      
      await taskAPI.update(taskId, updateData);
      await fetchProjectData();
      setSelectedTask(null);
      
      // Notify sprint page about the change
      window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
        detail: { projectId } 
      }));
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const handleKanbanTaskUpdate = (taskId, updateData) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task._id === taskId ? { ...task, ...updateData } : task
      )
    );
    
    // Notify sprint page about the change
    window.dispatchEvent(new CustomEvent('sprintDataChanged', { 
      detail: { projectId } 
    }));
  };

  const handleMembersUpdate = () => fetchProjectData();

  const filteredTasks = statusFilter === "All"
    ? tasks
    : statusFilter === "Backlog"
    ? tasks.filter((task) => {
        if (!task.due_date) return false;
        const now = new Date();
        const dueDate = new Date(task.due_date);
        return dueDate < now && task.status !== "Done" && task.status !== "Closed";
      })
    : tasks.filter((task) => task.status === statusFilter);

  const isOwner = project && user && (
    project.owner_id === user.id ||
    project.user_id === user.id ||
    project.is_owner === true
  );

  if (loading) return (
    <div className="tasks-page">
      <div style={{ position: 'relative', minHeight: '400px' }}>
        <Loader />
      </div>
    </div>
  );
  
  if (error) return (
    <div className="tasks-page">
      <p className="error-message">{error}</p>
      <button type="button" onClick={() => navigate("/projects")} className="btn btn-secondary">
        <FiArrowLeft size={16} style={{ marginRight: '6px' }} />
        Back to Projects
      </button>
    </div>
  );
  
  if (!project) return (
    <div className="tasks-page">
      <p className="error-message">Project not found</p>
      <button type="button" onClick={() => navigate("/projects")} className="btn btn-secondary">
        <FiArrowLeft size={16} style={{ marginRight: '6px' }} />
        Back to Projects
      </button>
    </div>
  );

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div className="header-top">
          <div className="header-left-actions">
            <button type="button" onClick={() => navigate("/projects")} className="btn-view-closed1">
              <FiArrowLeft size={16} />
              Back to Projects
            </button>
            <button
              type="button"
              onClick={() => setShowClosedTasks(true)} 
              className="btn-view-closed"
            >
              <FiArchive size={16} />
              View Closed/Completed Tickets
            </button>
          </div>
          <div className="header-actions">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                className={`view-btn ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
                title="Kanban View"
              >
                <FiActivity size={16} />
                Kanban
              </button>
              <button
                className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <FiList size={16} />
                List
              </button>
              <button
                className={`view-btn ${viewMode === "calendar" ? "active" : ""}`}
                onClick={() => setViewMode("calendar")}
                title="Calendar View"
              >
                <FiCalendar size={16} />
                Calendar
              </button>
            </div>

            <button
              onClick={() => navigate(`/projects/${projectId}/sprints`)}
              className="btn btn-view-closed"
            >
              🏃 Sprint Management
            </button>

            <button
              onClick={() => setShowMembers(!showMembers)}
              className="btn btn-view-closed"
            >
              <FiUsers size={16} />
              {showMembers ? "Hide Members" : "Team"}
            </button>

            <button
              onClick={() => setShowTaskForm(true)}
              className="btn btn-primary"
            >
              <FiPlusCircle size={16} />
              Create Task
            </button>
          </div>
        </div>

        <div className="project-info">
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
        </div>
      </div>

      {showMembers && (
        <div className="members-section">
          <MemberManager
            projectId={projectId}
            isOwner={isOwner}
            onMembersUpdate={handleMembersUpdate}
          />
        </div>
      )}

      <div className="tasks-content">
        {viewMode === "kanban" && (
          <KanbanBoard
            projectId={projectId}
            initialTasks={tasks}
            onTaskUpdate={handleKanbanTaskUpdate}
            user={user}
            isOwner={isOwner}
          />
        )}

        {viewMode === "calendar" && (
          <CalendarView
            tasks={tasks}
            onTaskUpdate={fetchProjectData}
            onTaskClick={handleTaskClick}
            members={members}
          />
        )}

        {viewMode === "list" && (
          <>
            <div className="tasks-filters">
              <div className="filter-buttons">
                <FiFilter size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
                {["All", "To Do", "In Progress", "Testing", "Dev Complete", "Done", "Backlog"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`filter-btn ${statusFilter === status ? "active" : ""}`}
                  >
                    {status}
                    {status === "All" && ` (${tasks.length})`}
                    {status === "Backlog" && ` (${tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done" && t.status !== "Closed").length})`}
                    {status !== "All" && status !== "Backlog" && ` (${tasks.filter(t => t.status === status).length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="tasks-grid">
              {filteredTasks.length === 0 ? (
                <div className="no-tasks">
                  <p>No tasks found</p>
                  {statusFilter !== "All" && (
                    <button type="button" onClick={() => setStatusFilter("All")} className="btn btn-secondary">
                      View All Tasks
                    </button>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onClick={() => handleTaskClick(task)}
                    isOwner={isOwner}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals & Forms */}
      {showTaskForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowTaskForm(false)}
          members={members}
          user={user}
        />
      )}

      {editingTask && (
        <TaskForm
          onSubmit={handleUpdateTask}
          onCancel={() => setEditingTask(null)}
          initialData={editingTask}
          members={members}
          user={user}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskDetailUpdate}
          isOwner={isOwner}
          projectTasks={tasks}
        />
      )}

      {/* Closed Tasks Modal */}
      {showClosedTasks && (
        <div className="closed-tasks-modal-overlay" onClick={() => setShowClosedTasks(false)}>
          <div className="closed-tasks-modal" onClick={(e) => e.stopPropagation()}>
            <div className="closed-tasks-header">
              <h2>
                <FiArchive size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Closed/Completed Tickets
              </h2>
              <button type="button" onClick={() => setShowClosedTasks(false)} className="modal-close-btn">
                ×
              </button>
            </div>
            <div className="closed-tasks-list">
              {tasks.filter(t => t.status === "Closed").length === 0 ? (
                <p className="no-tasks">No closed tickets yet.</p>
              ) : (
                tasks.filter(t => t.status === "Closed").map((task) => (
                  <div 
                    key={task._id} 
                    className="closed-task-item"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowClosedTasks(false);
                    }}
                  >
                    <div className="closed-task-header">
                      <span className="task-ticket-id">{task.ticket_id}</span>
                      <h4>{task.title}</h4>
                    </div>
                    <p className="closed-task-description">{task.description}</p>
                    {task.approved_by_name && (
                      <div className="approval-info">
                        <span className="approved-badge">✓ Approved by {task.approved_by_name}</span>
                        {task.approved_at && (
                          <span className="approved-date">
                            on {new Date(task.approved_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;