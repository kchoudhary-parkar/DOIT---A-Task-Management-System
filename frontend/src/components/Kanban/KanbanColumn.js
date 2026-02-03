
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import KanbanTaskCard from "./KanbanTaskCard";
import "./KanbanColumn.css";

function KanbanColumn({ column, tasks, user, isOwner, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "column-over" : ""}`}
      data-status={column.id}
    >
      {/* Column Header */}
      <div className="column-header">
        <div className="column-title">
          <span className="column-name">{column.title}</span>
          <span className="task-count">{tasks.length}</span>
        </div>
      </div>

      {/* Column Content */}
      <div className="column-content">
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="empty-column">Drop tasks here</div>
          ) : (
            tasks.map((task) => (
              <KanbanTaskCard
                key={task._id}
                task={task}
                user={user}
                isOwner={isOwner}
                onClick={onTaskClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default KanbanColumn;
