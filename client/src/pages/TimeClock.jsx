import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function TimeClock() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [status, setStatus] = useState('clocked_out')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [teamStatus, setTeamStatus] = useState([])
  const [timeClockData, setTimeClockData] = useState(null)
  const [notes, setNotes] = useState('')

  const parseLocalDate = (timestampStr) => {
    if (!timestampStr) return null
    const [datePart, timePart] = timestampStr.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute, second] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute, second || 0)
  }

  const formatDuration = (totalMinutes) => {
    if (!totalMinutes || totalMinutes <= 0) return '0 min'
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins} min`
  }

  useEffect(() => {
    fetchUserData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.id, role: payload.role })

      const employeesRes = await api.get('/employees')
      const currentEmployee = employeesRes.data.find(e => e.user_id === payload.id)
      setEmployee(currentEmployee)

      if (currentEmployee) {
        await fetchStatus(currentEmployee.id)
        await fetchTeamStatus(currentEmployee.team_id)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchStatus = async (employeeId) => {
    try {
      const res = await api.get(`/time-clock/status/${employeeId}`)
      setStatus(res.data.status)
      setTimeClockData(res.data.timeClock)
    } catch (error) {
      console.log('No active time clock entry')
    }
  }

  const fetchTeamStatus = async (teamId) => {
    try {
      const res = await api.get(`/time-clock/team-status?team_id=${teamId}`)
      const now = new Date()
      const teamData = (res.data || []).map(member => {
        const scheduledStart = parseLocalDate(member.scheduled_start)
        const clockIn = parseLocalDate(member.clock_in)
        const isLate = scheduledStart && clockIn && clockIn > scheduledStart
        const minutesLate = isLate ? Math.round((clockIn - scheduledStart) / (1000 * 60)) : 0
        return { ...member, is_late: isLate, minutes_late: minutesLate }
      })
      setTeamStatus(teamData)
    } catch (error) {
      console.error('Failed to fetch team status:', error)
    }
  }

  const handleClockIn = async () => {
    try {
      await api.post('/time-clock/clock-in', {
        employee_id: employee.id,
        notes
      })
      setNotes('')
      await fetchStatus(employee.id)
      await fetchTeamStatus(employee.team_id)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to clock in')
    }
  }

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out?')) return
    
    try {
      await api.post('/time-clock/clock-out', { employee_id: employee.id })
      await fetchStatus(employee.id)
      await fetchTeamStatus(employee.team_id)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to clock out')
    }
  }

  const handleStartBreak = async () => {
    try {
      await api.post('/time-clock/break/start', { employee_id: employee.id })
      await fetchStatus(employee.id)
      await fetchTeamStatus(employee.team_id)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start break')
    }
  }

  const handleEndBreak = async () => {
    try {
      await api.post('/time-clock/break/end', { employee_id: employee.id })
      await fetchStatus(employee.id)
      await fetchTeamStatus(employee.team_id)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to end break')
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'clocked_in': return '#28a745'
      case 'on_break': return '#ffc107'
      default: return '#dc3545'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'clocked_in': return 'Clocked In'
      case 'on_break': return 'On Break'
      default: return 'Clocked Out'
    }
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div>
      <h2 className="mb-2">Time Clock</h2>

      {/* Clock In/Out Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 10px 0' }}>
              {employee?.first_name} {employee?.last_name}
            </h3>
            <p style={{ margin: '0', color: '#666' }}>
              {format(currentTime, 'EEEE, MMMM d, yyyy h:mm:ss a')}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0 auto 10px',
              textAlign: 'center',
              padding: '10px'
            }}>
              {getStatusText()}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {status === 'clocked_out' && (
            <>
              <input
                type="text"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button className="btn btn-success" onClick={handleClockIn} style={{ minWidth: '120px' }}>
                🕐 Clock In
              </button>
            </>
          )}

          {status === 'clocked_in' && (
            <>
              <button className="btn btn-warning" onClick={handleStartBreak} style={{ minWidth: '120px' }}>
                ☕ Start Break
              </button>
              <button className="btn btn-danger" onClick={handleClockOut} style={{ minWidth: '120px' }}>
                🏠 Clock Out
              </button>
            </>
          )}

          {status === 'on_break' && (
            <button className="btn btn-success" onClick={handleEndBreak} style={{ minWidth: '120px' }}>
              ✅ End Break
            </button>
          )}
        </div>

        {timeClockData && status !== 'clocked_out' && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Current Session:</strong>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              Clock In: {format(new Date(timeClockData.clock_in), 'h:mm a')}
              {timeClockData.break_duration > 0 && (
                <span> • Break Time: {timeClockData.break_duration} min</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Team Status */}
      <div className="card">
        <h3>Team Status</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Currently clocked in from your team
        </p>

        {teamStatus.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No team members currently clocked in
          </p>
        ) : (
          <table className="table mt-2">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Clock In</th>
                <th>Break Time</th>
                <th>Scheduled</th>
                <th>Late</th>
              </tr>
            </thead>
            <tbody>
              {teamStatus.map((member) => (
                <tr key={member.employee_id}>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: member.team_color || '#007bff',
                      marginRight: '8px'
                    }}></span>
                    {member.first_name} {member.last_name}
                    {member.employee_id === employee?.id && ' (You)'}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: member.status === 'clocked_in' ? '#28a745' : member.status === 'on_break' ? '#ffc107' : '#dc3545',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {member.status === 'clocked_in' ? '🟢 In' : member.status === 'on_break' ? '☕ Break' : '🔴 Out'}
                    </span>
                  </td>
                  <td>{format(parseLocalDate(member.clock_in), 'h:mm a')}</td>
                  <td>{member.break_duration ? `${member.break_duration} min` : '-'}</td>
                  <td>
                    {member.scheduled_start ? format(parseLocalDate(member.scheduled_start), 'h:mm a') : '-'}
                  </td>
                  <td>
                    {member.is_late ? (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        +{formatDuration(member.minutes_late)} late
                      </span>
                    ) : (
                      <span style={{ color: '#28a745' }}>On time</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default TimeClock
