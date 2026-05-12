import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "../../services/api";
import Scheduler from "../../components/Scheduler/Scheduler";
import SchedulerBot from "../../components/Scheduler/ScheduleBot";
import "./SchedulePage.css";

const SchedulerPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/meetings`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMeetings(data.meetings || data || []);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    }
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  return (
    <div className="page-calendar">
      <Scheduler
        meetings={meetings}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        view={view}
        setView={setView}
        onMeetingUpdate={fetchMeetings}
      />

      <div className={`chat-widget-panel ${isChatOpen ? "open" : ""}`}>
        {isChatOpen && (
          <SchedulerBot
            meetings={meetings}
            selectedDate={selectedDate}
            onMeetingsUpdate={fetchMeetings}
          />
        )}
      </div>

      <button
        className="chat-toggle-button"
        onClick={toggleChat}
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
      >
        {isChatOpen ? "✕" : "💬"}
      </button>
    </div>
  );
};

export default SchedulerPage;
