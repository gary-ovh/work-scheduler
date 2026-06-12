import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function TimeClockWidget() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [status, setStatus] = useState('clocked_out')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [teamStatus, setTeamStatus] = useState([])
  const [timeClockData, setTimeClockData] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

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
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setLoading(false)
    }
  }

  const fetchStatus = async (employeeId) => {
    try {
      const res = await api.get(`/time-clock/status/${employeeId}`)
      console.log('Status response:', res.data)
      setStatus(res.data.status || 'clocked_out')
      setTimeClockData(res.data.timeClock || null)
    } catch (error) {
      console.log('No active time clock entry - clocked out')
      setStatus('clocked_out')
      setTimeClockData(null)
    }
  }

  const fetchTeamStatus = async (teamId) => {
    try {
      const res = await api.get(`/time-clock/status/team?team_id=${teamId}`)
      console.log('Team status:', res.data)
      setTeamStatus(res.data || [])
    } catch (error) {
      console.error('Failed to fetch team status:', error)
      setTeamStatus([])
    }
  }

  const refreshAll = async () => {
    if (employee) {
      await fetchStatus(employee.id)
      await fetchTeamStatus(employee.team_id)
    }
  }

  const handleClockIn = async () => {
    try {
      await api.post('/time-clock/clock-in', {
        employee_id: employee.id,
        notes
      })
      setNotes('')
      await refreshAll()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to clock in')
    }
  }

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out?')) return
    
    try {
      const res = await api.post('/time-clock/clock-out', { employee_id: employee.id })
      alert(`Clocked out successfully!\nTotal hours: ${res.data.totalHours}`)
      await refreshAll()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to clock out')
    }
  }

  const handleStartBreak = async () => {
    try {
      await api.post('/time-clock/break/start', { employee_id: employee.id })
      await refreshAll()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start break')
    }
  }

  const handleEndBreak = async () => {
    try {
      const res = await api.post('/time-clock/break/end', { employee_id: employee.id })
      alert(`Break ended!\nBreak duration: ${res.data.breakMinutes} minutes`)
      await refreshAll()
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

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Time Clock</h3>

      {/* Clock In/Out Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0' }}>
              {employee?.first_name} {employee?.last_name}
            </h4>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
              {format(currentTime, 'EEE, MMM d, h:mm:ss a')}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
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
                style={{ flex: 1, minWidth: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button className="btn btn-success" onClick={handleClockIn} style={{ minWidth: '100px' }}>
                🕐 Clock In
              </button>
            </>
          )}

          {status === 'clocked_in' && (
            <>
              <button className="btn btn-warning" onClick={handleStartBreak} style={{ minWidth: '100px' }}>
                ☕ Start Break
              </button>
              <button className="btn btn-danger" onClick={handleClockOut} style={{ minWidth: '100px' }}>
                🏠 Clock Out
              </button>
            </>
          )}

          {status === 'on_break' && (
            <>
              <button className="btn btn-success" onClick={handleEndBreak} style={{ minWidth: '100px' }}>
                ✅ End Break
              </button>
              <button className="btn btn-danger" onClick={handleClockOut} style={{ minWidth: '100px' }}>
                🏠 Clock Out
              </button>
            </>
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
        <h4 style={{ marginBottom: '15px' }}>Team Status</h4>

        {teamStatus.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No team members currently clocked in
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
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
                    <td>{format(new Date(member.clock_in), 'h:mm a')}</td>
                    <td>{member.break_duration ? `${member.break_duration} min` : '-'}</td>
                    <td>
                      {member.scheduled_start ? format(new Date(member.scheduled_start), 'h:mm a') : '-'}
                    </td>
                    <td>
                      {member.is_late ? (
                        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                          {member.minutes_late} min
                        </span>
                      ) : (
                        <span style={{ color: '#28a745' }}>On time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimeClockWidget
