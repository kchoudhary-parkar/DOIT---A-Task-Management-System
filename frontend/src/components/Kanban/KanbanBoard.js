import Loader from "../Loader/Loader";
import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiArchive,
  FiActivity,
  FiWifi,
  FiWifiOff
} from "react-icons/fi";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import KanbanColumn from "./KanbanColumn";
import KanbanTaskCard from "./KanbanTaskCard";
import TaskDetailModal from "../Tasks/TaskDetailModal";
import { taskAPI } from "../../services/api";
import useKanbanWebSocket from "../../utils/useKanbanWebSocket";
import "./KanbanBoard.css";

const COLUMNS = [
  { id: "To Do", title: "TO DO", color: "#7a869a" },
  { id: "In Progress", title: "IN PROGRESS", color: "#2684ff" },
  { id: "Dev Complete", title: "DEV COMPLETE", color: "#6554c0" },
  { id: "Testing", title: "TESTING", color: "#ffab00" },
  { id: "Done", title: "DONE", color: "#36b37e" },
];

// Strict workflow order - tasks must follow this sequence
const WORKFLOW_ORDER = ["To Do", "In Progress", "Dev Complete","Testing", "Done"];

// Helper function to validate workflow transition
const isValidTransition = (fromStatus, toStatus) => {
  const fromIndex = WORKFLOW_ORDER.indexOf(fromStatus);
  const toIndex = WORKFLOW_ORDER.indexOf(toStatus);
  
  if (fromIndex === -1 || toIndex === -1) return false;
  if (toIndex < fromIndex) return true;
  return toIndex === fromIndex + 1;
};

// Get required previous status for error messages
const getRequiredPreviousStatus = (targetStatus) => {
  const index = WORKFLOW_ORDER.indexOf(targetStatus);
  if (index <= 0) return null;
  return WORKFLOW_ORDER[index - 1];
};

function KanbanBoard({ projectId, initialTasks, onTaskUpdate, user, isOwner }) {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showClosedTasks, setShowClosedTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dragStartStatus, setDragStartStatus] = useState(null); // Store original status at drag start

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data) => {
    console.log('[Kanban WS] Received:', data.type);

    switch (data.type) {
      case 'connection':
        console.log('[Kanban WS] Connected to project:', data.project_id);
        break;

      case 'task_created':
        // Add new task to the board
        setTasks(prev => {
          // Avoid duplicates
          if (prev.some(t => t._id === data.task._id)) {
            return prev;
          }
          const taskTitle = data.task.title || data.task.ticket_id || 'New task';
          toast.info(`${data.user_name} created a new task: ${taskTitle}`);
          const newTasks = [...prev, data.task];
          // Update parent component's state
          if (onTaskUpdate) {
            onTaskUpdate(data.task._id, data.task);
          }
          return newTasks;
        });
        break;

      case 'task_updated':
        // Update existing task
        setTasks(prev => prev.map(task =>
          task._id === data.task._id ? data.task : task
        ));
        
        // Update parent component's state to keep it in sync
        if (onTaskUpdate) {
          onTaskUpdate(data.task._id, data.task);
        }
        
        // Show toast for status changes by other users
        if (data.updated_fields.includes('status') && data.user_name) {
          const currentUserId = localStorage.getItem('user_id');
          // Only show notification if the update was made by a different user
          if (data.user_id && data.user_id !== currentUserId) {
            const taskTitle = data.task.title || data.task.ticket_id || 'a task';
            toast.info(`${data.user_name} moved "${taskTitle}" to ${data.task.status}`);
          }
        }
        break;

      case 'task_deleted':
        // Remove deleted task
        setTasks(prev => prev.filter(task => task._id !== data.task_id));
        if (data.user_name) {
          toast.info(`${data.user_name} deleted a task`);
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('[Kanban WS] Unknown message type:', data.type);
    }
  }, [onTaskUpdate]);

  // WebSocket connection
  const { connectionStatus, isConnected } = useKanbanWebSocket(
    projectId,
    handleWebSocketMessage,
    {
      enabled: Boolean(projectId),
      reconnectAttempts: 10,
      reconnectInterval: 2000
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getTasksByStatus = (status) => {
    return tasks.filter(
      (task) => task.status === status && task.status !== "Closed"
    );
  };

  const getClosedTasks = () => {
    return tasks.filter((task) => task.status === "Closed");
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleTaskDetailUpdate = async (taskId, updateData) => {
    try {
      // If updateData contains full task object, update local state
      if (updateData && updateData._id) {
        // Refresh tasks to get updated data including sprint info
        if (onTaskUpdate) {
          onTaskUpdate();
        }
        return;
      }
      
      // Refresh tasks after update
      if (onTaskUpdate) {
        onTaskUpdate();
      }
      // Close modal and refresh
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);

    if (!task) return;

    setActiveTask(task);
    // Capture the current status when drag starts (not from stale initialTasks)
    setDragStartStatus(task?.status);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t._id === activeId);
    if (!activeTask) return;

    // Cannot move tasks OUT of "Done" or "Closed"
    if (activeTask.status === "Done" || activeTask.status === "Closed") {
      return;
    }

    const overColumn = COLUMNS.find((col) => col.id === overId);
    const overTask = tasks.find((t) => t._id === overId);

    let targetStatus;
    if (overColumn) {
      targetStatus = overColumn.id;
    } else if (overTask) {
      targetStatus = overTask.status;
    } else {
      return;
    }

    // Validate workflow transition before optimistic UI update
    if (!isValidTransition(activeTask.status, targetStatus)) {
      return;
    }

    // Optimistic UI update (only for valid transitions)
    if (activeTask.status !== targetStatus) {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === activeId ? { ...t, status: targetStatus } : t
        )
      );
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      setDragStartStatus(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find((t) => t._id === activeId);
    if (!activeTask) {
      setDragStartStatus(null);
      return;
    }

    // Use the status captured at drag start, not stale initialTasks
    const originalStatus = dragStartStatus || activeTask.status;

    // Cannot move tasks OUT of "Done" or "Closed"
    if (originalStatus === "Done" || originalStatus === "Closed") {
      toast.error("Tasks cannot be moved out of 'Done' or 'Closed' column. Once done, always done!", {
        position: "top-right",
        autoClose: 4000,
      });
      // Revert optimistic update - restore task to original status
      setTasks((prev) =>
        prev.map((t) => (t._id === activeId ? { ...t, status: originalStatus } : t))
      );
      setDragStartStatus(null);
      return;
    }

    const overColumn = COLUMNS.find((col) => col.id === overId);
    const overTask = tasks.find((t) => t._id === overId);

    const finalStatus = overColumn
      ? overColumn.id
      : overTask
      ? overTask.status
      : activeTask.status;

    // No status change needed
    if (originalStatus === finalStatus) {
      return;
    }

    // 🔒 VALIDATE WORKFLOW ORDER
    if (!isValidTransition(originalStatus, finalStatus)) {
      const requiredStatus = getRequiredPreviousStatus(finalStatus);
      
      // Create a custom toast message with HTML formatting
      const toastMessage = (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <FiAlertCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Invalid Workflow Transition
          </div>
          <div style={{ fontSize: '0.9em' }}>
            <div><strong>Current:</strong> {originalStatus}</div>
            <div><strong>Attempted:</strong> {finalStatus}</div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#ddd' }}>
            <FiTrendingUp size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Workflow: To Do → In Progress → Testing → Dev Complete → Done
          </div>
          {requiredStatus && (
            <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
              Move to <strong>{requiredStatus}</strong> first
            </div>
          )}
        </div>
      );

      toast.error(toastMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Revert optimistic update - restore task to original status
      setTasks((prev) =>
        prev.map((t) => (t._id === activeId ? { ...t, status: originalStatus } : t))
      );
      setDragStartStatus(null);
      return;
    }

    try {
      setLoading(true);
      
      // Update backend
      await taskAPI.update(activeId, { status: finalStatus });

      // Notify parent component with updated task data
      if (onTaskUpdate) {
        onTaskUpdate(activeId, { status: finalStatus });
      }

      toast.success(
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiCheckCircle size={16} />
          <span>Task moved to {finalStatus}</span>
        </div>,
        {
          position: "bottom-right",
          autoClose: 2000,
        }
      );

      console.log(`✅ Task status updated: ${activeId} → ${finalStatus}`);
    } catch (error) {
      console.error("❌ Failed to update task status:", error);
      
      toast.error(
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiAlertCircle size={16} />
          <span>Failed to update task: {error.message || "Unknown error"}</span>
        </div>,
        {
          position: "top-right",
          autoClose: 4000,
        }
      );
      
      // Revert optimistic update on error - restore task to original status
      setTasks((prev) =>
        prev.map((t) => (t._id === activeId ? { ...t, status: originalStatus } : t))
      );
    } finally {
      setLoading(false);
      setDragStartStatus(null); // Clean up drag state
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="kanban-board">
      {/* Toast Container - Required for toasts to display */}
      <ToastContainer />

      {/* Board Header */}
      <div className="kanban-board-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 className="board-title">
            <FiActivity size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Project Board
          </h2>
          {/* Connection Status Indicator */}
          <div style={{
            marginLeft: '15px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500',
            background: isConnected ? '#e3fcef' : '#ffebe6',
            color: isConnected ? '#006644' : '#de350b'
          }}>
            {isConnected ? (
              <>
                <FiWifi size={14} />
                <span>Live</span>
              </>
            ) : (
              <>
                <FiWifiOff size={14} />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
        <div className="board-actions">
          <button
            className="btn-closed-tasks"
            onClick={() => setShowClosedTasks(true)}
          >
            <FiArchive size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Closed Tasks ({getClosedTasks().length})
          </button>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Columns */}
        <div className="kanban-columns">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.id)}
              user={user}
              isOwner={isOwner}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="drag-overlay">
              <KanbanTaskCard
                task={activeTask}
                isDragging={true}
                user={user}
                isOwner={isOwner}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Closed Tasks Modal */}
      {showClosedTasks && (
        <div
          className="closed-tasks-modal-overlay"
          onClick={() => setShowClosedTasks(false)}
        >
          <div
            className="closed-tasks-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="closed-tasks-modal-header">
              <h3>
                <FiArchive size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Closed Tasks
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowClosedTasks(false)}
              >
                ×
              </button>
            </div>
            <div className="closed-tasks-list">
              {getClosedTasks().length === 0 ? (
                <div className="kanban-empty">No closed tasks</div>
              ) : (
                getClosedTasks().map((task) => (
                  <div key={task._id} className="closed-task-item">
                    <div className="closed-task-header">
                      {task.ticket_id && (
                        <span className="task-ticket-id">{task.ticket_id}</span>
                      )}
                      <h4>{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="closed-task-description">
                        {task.description}
                      </p>
                    )}
                    {task.approved_by_name && (
                      <div className="approval-info">
                        <span className="approved-badge">
                          <FiCheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Approved by {task.approved_by_name}
                        </span>
                        {task.approved_date && (
                          <span className="approved-date">
                            on {new Date(task.approved_date).toLocaleDateString()}
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

      {/* Task Detail Modal */}
      {selectedTask && (() => {
        // Find the current task from tasks state to get latest WebSocket updates
        const currentTask = tasks.find(t => t._id === selectedTask._id) || selectedTask;
        return (
          <TaskDetailModal
            task={currentTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleTaskDetailUpdate}
            isOwner={isOwner}
            projectTasks={tasks}
          />
        );
      })()}
    </div>
  );
}

export default KanbanBoard;