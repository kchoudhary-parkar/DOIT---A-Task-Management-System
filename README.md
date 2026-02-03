# DOIT - A Task Management System

A full-stack Jira-like project management and task tracking system built with React and FastAPI.

## Features

### Project Management
- Create and manage multiple projects
- Role-based access control (Admin, Member)
- Project dashboard with analytics and visualizations

### Sprint Management
- Create and track sprints
- Sprint planning and progress monitoring
- Burndown charts and velocity tracking

### Task Management
- Kanban board for task visualization
- Task assignment and prioritization
- Task status tracking (To Do, In Progress, Done)
- Calendar view for task deadlines

### Team Collaboration
- **Real-time Team Chat** (WebSocket)
  - Channel-based messaging per project
  - Instant message delivery and updates
  - File attachments (images, PDFs, documents)
  - Emoji reactions on messages
  - Reply to messages with context preview
  - Message editing and deletion
  - Connection status indicator
- AI-powered chatbot for project assistance

### Analytics & Reporting
- Project progress charts
- Task statistics and breakdowns
- System-wide dashboard (Admin)
- Export reports functionality

### User Management
- User authentication with JWT
- Profile management
- Session management with device tracking
- GitHub integration for activity tracking

## Tech Stack

### Frontend
- React.js
- Lucide React (icons)
- Custom WebSocket hook for real-time features
- Chart.js for data visualization

### Backend
- FastAPI (Python)
- MongoDB (database)
- WebSocket for real-time communication
- JWT authentication
- File upload support

## Project Structure

```
DOIT/
├── backend-2/          # FastAPI backend
│   ├── controllers/    # Business logic
│   ├── routers/        # API endpoints
│   ├── models/         # Database models
│   ├── middleware/     # Auth & security
│   └── utils/          # Helper functions
└── frontend/           # React frontend
    ├── src/
    │   ├── components/ # Reusable components
    │   ├── pages/      # Page components
    │   ├── services/   # API services
    │   └── utils/      # Utility functions
    └── public/
```

## Getting Started

### Backend Setup
```bash
cd backend-2
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Recent Updates
- Implemented real-time team chat with WebSocket
- Added file attachment support for chat
- Added emoji reactions on messages
- Added reply functionality with message preview
- Enhanced message UI with real-time updates
