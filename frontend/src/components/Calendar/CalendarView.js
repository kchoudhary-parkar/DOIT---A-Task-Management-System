import React, { useState, useCallback, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { taskAPI } from "../../services/api";
import "./CalendarView.css";

const localizer = momentLocalizer(moment);

function CalendarView({ tasks, onTaskUpdate, onTaskClick, members }) {
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  // Move these functions ABOVE useMemo to avoid TDZ
  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      case "Low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "Done":
        return "#22c55e";
      case "In Progress":
        return "#3b82f6";
      case "To Do":
        return "#94a3b8";
      case "Testing":
        return "#f59e0b";
      case "Incomplete":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  }, []);

  // Now it's safe to use them
  const events = useMemo(() => {
    return tasks
      .filter((task) => task.due_date)
      .map((task) => {
        const dueDate = new Date(task.due_date);
        return {
          id: task._id,
          title: task.title,
          start: dueDate,
          end: dueDate,
          allDay: true,
          resource: {
            ...task,
            color: getPriorityColor(task.priority),
            status: task.status,
          },
        };
      });
  }, [tasks, getPriorityColor]);

  // Custom event style getter
  const eventStyleGetter = useCallback((event) => {
    const backgroundColor = event.resource.color;
    const statusColor = getStatusColor(event.resource.status);
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: event.resource.status === "Done" ? 0.6 : 1,
        color: "white",
        border: `2px solid ${statusColor}`,
        display: "block",
        fontSize: "13px",
        fontWeight: "600",
        padding: "4px 8px",
      },
    };
  }, [getStatusColor]);

  // Handle event selection - ONLY trigger onTaskClick
  const handleSelectEvent = useCallback((event) => {
    // Only trigger the parent's onTaskClick callback
    // Do NOT show event details modal
    if (onTaskClick) {
      onTaskClick(event.resource);
    }
  }, [onTaskClick]);

  // Handle event drop (drag to reschedule)
  const handleEventDrop = async ({ event, start }) => {
    try {
      const newDueDate = moment(start).format("YYYY-MM-DD");
      await taskAPI.update(event.id, { due_date: newDueDate });
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error("Failed to update task due date:", error);
      alert("Failed to reschedule task. Please try again.");
    }
  };

  // Handle event resize (same as drop for all-day events)
  const handleEventResize = async ({ event, start }) => {
    await handleEventDrop({ event, start });
  };

  // Handle slot selection
  const handleSelectSlot = useCallback(({ start }) => {
    console.log("Selected date for new task:", start);
    // You can integrate task creation here later
  }, []);

  // Custom toolbar
  const CustomToolbar = (props) => {
    const { label, onNavigate, onView } = props;
    return (
      <div className="calendar-toolbar">
        <div className="toolbar-navigation">
          <button type="button" className="btn-nav" onClick={() => onNavigate("TODAY")}>
            Today
          </button>
          <button type="button" className="btn-nav" onClick={() => onNavigate("PREV")}>
            ‹
          </button>
          <button type="button" className="btn-nav" onClick={() => onNavigate("NEXT")}>
            ►
          </button>
        </div>
        <div className="toolbar-label">
          <h2>{label}</h2>
        </div>
        <div className="toolbar-views">
          {["month", "week", "day", "agenda"].map((v) => (
            <button
              key={v}
              className={`btn-view ${props.view === v ? "active" : ""}`}
              onClick={() => onView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Custom event component
  const CustomEvent = ({ event }) => {
    const task = event.resource;
    return (
      <div className="custom-event">
        <div className="event-ticket-id">{task.ticket_id}</div>
        <div className="event-title">{event.title}</div>
        <div className="event-meta">
          <span className="event-priority">{task.priority || "None"}</span>
          {task.assignee_name && task.assignee_name !== "Unassigned" && (
            <span className="event-assignee">
              {task.assignee_name.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-view">
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: "#ef4444" }}></span>
          <span>High Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: "#f59e0b" }}></span>
          <span>Medium Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: "#10b981" }}></span>
          <span>Low Priority</span>
        </div>
        <div className="legend-divider">|</div>
        <div className="legend-item">
          <span className="legend-border" style={{ borderColor: "#94a3b8" }}></span>
          <span>To Do</span>
        </div>
        <div className="legend-item">
          <span className="legend-border" style={{ borderColor: "#3b82f6" }}></span>
          <span>In Progress</span>
        </div>
        <div className="legend-item">
          <span className="legend-border" style={{ borderColor: "#f3ff0aff" }}></span>
          <span>Testing</span>
        </div>
        <div className="legend-item">
          <span className="legend-border" style={{ borderColor: "#22c55e" }}></span>
          <span>Done</span>
        </div>
        <div className="legend-item">
          <span className="legend-border" style={{ borderColor: "#ff0000ff" }}></span>
          <span>Incomplete</span>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "calc(100vh - 300px)", minHeight: "600px" }}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        eventPropGetter={eventStyleGetter}
        selectable
        resizable
        draggableAccessor={() => true}
        components={{
          toolbar: CustomToolbar,
          event: CustomEvent,
        }}
        popup
        tooltipAccessor={(event) => event.resource.description || event.title}
      />
    </div>
  );
}

export default CalendarView;