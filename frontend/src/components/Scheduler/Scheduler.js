import React, { useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAuthHeaders } from '../../services/api';
import './Scheduler.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  'https://doit-a-task-management-system-j593.onrender.com';

const formatDateTimeLocal = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? new Date(date) : date;

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = String(parsedDate.getHours()).padStart(2, '0');
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/* =========================================================
   CREATE / EDIT MODAL
========================================================= */

const MeetingModal = ({
  onClose,
  onSubmit,
  startTime,
  existingMeeting = null,
  isEdit = false,
}) => {

const initialDateTime = existingMeeting?.start
  ? formatDateTimeLocal(existingMeeting.start)
  : startTime
  ? formatDateTimeLocal(new Date(startTime))
  : '';

  const [formData, setFormData] = useState({
    title: existingMeeting?.title || '',
    description:
      existingMeeting?.description || '',

    participants:
      existingMeeting?.participants?.join(', ') ||
      '',

    duration:
      existingMeeting?.duration || 60,

    start_time: initialDateTime,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit({
      title: formData.title,

      description: formData.description,

      participants: formData.participants
        .split(',')
        .filter((p) => p.trim())
        .map((p) => p.trim()),

      duration: parseInt(formData.duration),

      start_time: formData.start_time,
    });
  };

  return (
    <div className="modal2-overlay">
      <div className="modal2-content">

        <h3>
          {isEdit
            ? 'Edit Meeting'
            : 'Create Meeting'}
        </h3>

        <form onSubmit={handleSubmit}>

          <label
            style={{
              fontSize: '0.85rem',
              color: '#666',
            }}
          >
            Start Time
          </label>

          <input
            type="datetime-local"
            required
            value={formData.start_time}
            onChange={(e) =>
              setFormData({
                ...formData,
                start_time: e.target.value,
              })
            }
          />

          <input
            type="text"
            placeholder="Title"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
          />

          <input
            type="number"
            placeholder="Duration (minutes)"
            value={formData.duration}
            onChange={(e) =>
              setFormData({
                ...formData,
                duration: e.target.value,
              })
            }
          />

          <input
            type="text"
            placeholder="Participants (comma separated)"
            value={formData.participants}
            onChange={(e) =>
              setFormData({
                ...formData,
                participants: e.target.value,
              })
            }
          />

          <div className="modal-actions">

            <button type="submit">
              {isEdit
                ? 'Update Meeting'
                : 'Create'}
            </button>

            <button
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   MEETING DETAILS MODAL
========================================================= */

const MeetingDetailsModal = ({
  meeting,
  onClose,
  onDelete,
  onEdit,
}) => {

  if (!meeting) return null;

  return (
    <div className="meeting-details-overlay">
      <div className="meeting-details-modal">

        <div className="meeting-details-header">
          <h2>{meeting.title}</h2>

          <button onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="meeting-details-body">

          <div className="meeting-detail-item">
            <label>Start Time</label>

            <p>
              {new Date(
                meeting.start
              ).toLocaleString()}
            </p>
          </div>

          <div className="meeting-detail-item">
            <label>End Time</label>

            <p>
              {meeting.end
                ? new Date(
                    meeting.end
                  ).toLocaleString()
                : 'N/A'}
            </p>
          </div>

          <div className="meeting-detail-item">
            <label>Description</label>

            <p>
              {meeting.description ||
                'No description'}
            </p>
          </div>

          <div className="meeting-detail-item">
            <label>Participants</label>

            <div className="participants-list">
              {meeting.participants?.length ? (
                meeting.participants.map(
                  (participant, index) => (
                    <span
                      key={index}
                      className="participant-chip"
                    >
                      {participant}
                    </span>
                  )
                )
              ) : (
                <p>No participants</p>
              )}
            </div>
          </div>
        </div>

        <div className="meeting-details-actions">

          <button
            className="edit-btn"
            onClick={() => onEdit(meeting)}
          >
            Edit
          </button>

          <button
            className="delete-btn"
            onClick={() =>
              onDelete(meeting.id)
            }
          >
            Delete
          </button>

        </div>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Scheduler = ({
  meetings = [],
  propView = 'dayGridMonth',
  onMeetingUpdate,
}) => {

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedSlot, setSelectedSlot] =
    useState({
      start: null,
      end: null,
    });

  const [selectedMeeting, setSelectedMeeting] =
    useState(null);

  const [
    isDetailsModalOpen,
    setIsDetailsModalOpen,
  ] = useState(false);

  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false);

  const [editingMeeting, setEditingMeeting] =
    useState(null);

  /* =========================================================
     DATE SELECT
  ========================================================= */

  const handleDateSelect = useCallback(
    (selectInfo) => {

      setSelectedSlot({
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      });

      setIsModalOpen(true);
    },
    []
  );

  /* =========================================================
     EVENT CLICK
  ========================================================= */

  const handleEventClick = useCallback(
    (clickInfo) => {

      const event = clickInfo.event;

      setSelectedMeeting({
        id: event.id,

        title: event.title,

        start: event.start,

        end: event.end,

        description:
          event.extendedProps.description,

        participants:
          event.extendedProps.participants ||
          [],

        duration:
          event.extendedProps.duration || 60,
      });

      setIsDetailsModalOpen(true);
    },
    []
  );

  /* =========================================================
     CREATE MEETING
  ========================================================= */

  const handleCreateMeeting = async (
    meetingData
  ) => {

    const payload = {
      ...meetingData,

      start_time:
        meetingData.start_time ||
        formatDateTimeLocal(selectedSlot.start),
    };

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/meetings`,
        {
          method: 'POST',

          headers: {
            ...getAuthHeaders(),
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {

        setIsModalOpen(false);

        if (onMeetingUpdate) {
          onMeetingUpdate();
        }
      }

    } catch (error) {

      console.error(
        'Failed to create meeting:',
        error
      );
    }
  };

  /* =========================================================
     DELETE MEETING
  ========================================================= */

  const handleDeleteMeeting = async (
    meetingId
  ) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/meetings/${meetingId}`,
        {
          method: 'DELETE',

          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {

        setIsDetailsModalOpen(false);

        if (onMeetingUpdate) {
          onMeetingUpdate();
        }
      }

    } catch (error) {

      console.error(
        'Failed to delete meeting:',
        error
      );
    }
  };

  /* =========================================================
     OPEN EDIT MODAL
  ========================================================= */

  const handleEditMeeting = (meeting) => {

    setEditingMeeting(meeting);

    setIsDetailsModalOpen(false);

    setIsEditModalOpen(true);
  };

  /* =========================================================
     UPDATE MEETING
  ========================================================= */

  const handleUpdateMeeting = async (
    updatedData
  ) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/meetings/${editingMeeting.id}`,
        {
          method: 'PUT',

          headers: {
            ...getAuthHeaders(),
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(updatedData),
        }
      );

      if (response.ok) {

        setIsEditModalOpen(false);

        setEditingMeeting(null);

        if (onMeetingUpdate) {
          onMeetingUpdate();
        }
      }

    } catch (error) {

      console.error(
        'Failed to update meeting:',
        error
      );
    }
  };

  /* =========================================================
     CALENDAR EVENTS
  ========================================================= */

  const calendarEvents = useMemo(
    () =>
      meetings.map((meeting) => ({
        id: meeting._id,

        title: meeting.title,

        start: meeting.start,

        end: meeting.end,

        backgroundColor:
          meeting.color || '#0078d4',

        textColor: 'white',

        extendedProps: {
          description:
            meeting.description,

          participants:
            meeting.participants || [],

          duration:
            meeting.duration || 60,
        },
      })),
    [meetings]
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="calendar-container"
      style={{ height: '800px' }}
    >

      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
        ]}

        initialView={propView}

        headerToolbar={{
          left: 'prev,next today',

          center: 'title',

          right:
            'dayGridMonth,timeGridWeek,timeGridDay',
        }}

        editable={true}

        selectable={true}

        selectMirror={true}

        select={handleDateSelect}

        eventClick={handleEventClick}

        events={calendarEvents}

        height="100%"
      />

      {/* CREATE MODAL */}

      {isModalOpen && (
        <MeetingModal
          onClose={() =>
            setIsModalOpen(false)
          }

          onSubmit={handleCreateMeeting}

          startTime={selectedSlot.start}
        />
      )}

      {/* DETAILS MODAL */}

      {isDetailsModalOpen && (
        <MeetingDetailsModal
          meeting={selectedMeeting}

          onClose={() =>
            setIsDetailsModalOpen(false)
          }

          onDelete={handleDeleteMeeting}

          onEdit={handleEditMeeting}
        />
      )}

      {/* EDIT MODAL */}

      {isEditModalOpen && (
        <MeetingModal
          isEdit={true}

          existingMeeting={editingMeeting}

          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMeeting(null);
          }}

          onSubmit={handleUpdateMeeting}
        />
      )}

    </div>
  );
};

export default Scheduler;