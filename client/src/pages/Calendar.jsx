import { useState, useEffect } from 'react'
import api from '../api'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [teams, setTeams] = useState([])
  const [shifts, setShifts] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)

  useEffect(() => {
    fetchTeams()
    fetchShifts()
  }, [currentDate, selectedTeam])

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams')
      setTeams(res.data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const fetchShifts = async () => {
    try {
      const startDate = getWeekStart(currentDate)
      const endDate = getWeekEnd(currentDate)
      
      let url = `/api/shifts?startDate=${startDate}&endDate=${endDate}`
      if (selectedTeam !== 'all') {
        url = `/api/employees?team_id=${selectedTeam}`
        const employees = await api.get(url)
        const employeeIds = employees.data.map(e => e.id).join(',')
        if (employeeIds) {
          url = `/api/shifts?startDate=${startDate}&endDate=${endDate}&employeeIds=${employeeIds}`
        } else {
          setShifts([])
          return
        }
      }
      
      const res = await api.get(url)
      setShifts(res.data)
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    }
  }

  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
  }

  const getWeekEnd = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() + (6 - day) + (day === 0 ? 0 : 0)
    d.setDate(diff)
    d.setHours(23, 59, 59, 999)
    return d.toISOString().split('T')[0]
  }

  const getWeekDays = () => {
    const start = new Date(getWeekStart(currentDate))
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getShiftsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time).toISOString().split('T')[0]
      return shiftDate === dateStr
    })
  }

  const getTeamColor = (teamId) => {
    const team = teams.find(t => t.id === teamId)
    return team ? team.color : '#007bff'
  }

  const previousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Calendar View</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <button className="btn" onClick={previousWeek}>◀ Prev</button>
          <button className="btn" onClick={goToToday}>Today</button>
          <button className="btn" onClick={nextWeek}>Next ▶</button>
        </div>
      </div>

      <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '18px' }}>
        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#ddd', border: '1px solid #ddd' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} style={{ backgroundColor: '#f8f9fa', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            {day}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#ddd' }}>
        {getWeekDays().map((day, index) => (
          <div key={index} style={{ minHeight: '150px', backgroundColor: 'white', padding: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: day.toDateString() === new Date().toDateString() ? '#007bff' : '#333' }}>
              {formatDate(day)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {getShiftsForDay(day).map(shift => (
                <div
                  key={shift.id}
                  onClick={() => setSelectedShift(shift)}
                  style={{
                    padding: '5px 8px',
                    backgroundColor: getTeamColor(shift.team_id) + '40',
                    borderLeft: `3px solid ${getTeamColor(shift.team_id)}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title={`${shift.first_name} ${shift.last_name} - ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`}
                >
                  <div style={{ fontWeight: 'bold' }}>{shift.first_name} {shift.last_name}</div>
                  <div style={{ color: '#666' }}>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                  {shift.position && <div style={{ color: '#888', fontSize: '11px' }}>{shift.position}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedShift && (
        <div className="modal-overlay" onClick={() => setSelectedShift(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Shift Details</h2>
            <div style={{ marginTop: '20px' }}>
              <p><strong>Employee:</strong> {selectedShift.first_name} {selectedShift.last_name}</p>
              <p><strong>Date:</strong> {new Date(selectedShift.start_time).toLocaleDateString()}</p>
              <p><strong>Start Time:</strong> {formatTime(selectedShift.start_time)}</p>
              <p><strong>End Time:</strong> {formatTime(selectedShift.end_time)}</p>
              <p><strong>Position:</strong> {selectedShift.position || 'N/A'}</p>
              <p><strong>Status:</strong> {selectedShift.status}</p>
              {selectedShift.notes && (
                <p><strong>Notes:</strong> {selectedShift.notes}</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setSelectedShift(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
