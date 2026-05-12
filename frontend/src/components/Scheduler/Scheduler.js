import React, { useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAuthHeaders } from '../../services/api';
import './Scheduler.css';

// Modal Component for scheduling
const MeetingModal = ({ onClose, onSubmit, startTime }) => {
  // Convert ISO string (e.g., '2026-04-28T10:00:00Z') to 'YYYY-MM-DDTHH:MM'
  const initialDateTime = startTime ? new Date(startTime).toISOString().slice(0, 16) : '';
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    participants: '', 
    duration: 60,
    start_time: initialDateTime 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      description: formData.description,
      participants: formData.participants.split(',').filter(p => p.trim()).map(p => p.trim()),
      duration: parseInt(formData.duration),
      start_time: new Date(formData.start_time).toISOString() // Send back to API as ISO
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create Meeting</h3>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '0.85rem', color: '#666' }}>Start Time</label>
          <input 
            type="datetime-local" 
            required 
            value={formData.start_time}
            onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
          />
          <input type="text" placeholder="Title" required onChange={(e) => setFormData({...formData, title: e.target.value})} />
          <textarea placeholder="Description" onChange={(e) => setFormData({...formData, description: e.target.value})} />
          <input type="number" placeholder="Duration (minutes)" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
          <input type="text" placeholder="Participants (comma separated)" onChange={(e) => setFormData({...formData, participants: e.target.value})} />
          <div className="modal-actions">
            <button type="submit">Create</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Scheduler = ({ meetings = [], propView = 'dayGridMonth', onMeetingUpdate }) => {
//   const [currentEvents, setCurrentEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ start: null, end: null });

  const handleDateSelect = useCallback((selectInfo) => {
    setSelectedSlot({ start: selectInfo.startStr, end: selectInfo.endStr });
    setIsModalOpen(true);
  }, []);

  const handleCreateMeeting = async (meetingData) => {
    const payload = {
      ...meetingData,
      start_time: selectedSlot.start
    };

    try {
      const response = await fetch(`http://localhost:5000/api/meetings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setIsModalOpen(false);
        if (onMeetingUpdate) onMeetingUpdate(); // Trigger refresh
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    }
  };

const calendarEvents = useMemo(() => 
  meetings.map(meeting => ({
    id: meeting._id,
    title: meeting.title,
    start: meeting.start, // Matches your API field "start"
    end: meeting.end,     // Matches your API field "end"
    backgroundColor: meeting.color || '#0078d4',
    textColor: 'white'
  })), 
  [meetings]
);

  return (
    <div className="calendar-container" style={{ height: '800px' }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={propView}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        editable={true}
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        events={calendarEvents}
        height="100%"
      />
      
      {isModalOpen && (
        <MeetingModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleCreateMeeting} 
          startTime={selectedSlot.start}
        />
      )}
    </div>
  );
};

export default Scheduler;