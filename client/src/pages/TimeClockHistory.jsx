import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { format } from 'date-fns'

function TimeClockHistory() {
  const [user, setUser] = useState(null)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [timeRecords, setTimeRecords] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [managerAction, setManagerAction] = useState({
    type: 'clock-in', // clock-in, clock-out, start-break, end-break
    notes: ''
  })

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
    // Default to last 30 days
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(format(end, 'yyyy-MM-dd'))
    setStartDate(format(start, 'yyyy-MM-dd'))
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.id, role: payload.role })

      if (payload.role === 'admin' || payload.role === 'manager') {
        const employeesRes = await api.get('/employees')
        setEmployees(employeesRes.data)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchTimeRecords = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await api.get(`/time-clock/history/${selectedEmployee}?${params}`)
      setTimeRecords(res.data)
    } catch (error) {
      console.error('Failed to fetch time records:', error)
      alert('Failed to fetch time records')
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = (record) => {
    if (!record.clock_out || !record.clock_in) return 'N/A'
    
    const clockIn = parseLocalDate(record.clock_in)
    const clockOut = parseLocalDate(record.clock_out)
    const breakMinutes = record.break_duration || 0
    
    const totalMinutes = (clockOut - clockIn) / (1000 * 60) - breakMinutes
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    
    return `${hours}h ${minutes}m`
  }

  const handleManagerClockAction = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    const endpoints = {
      'clock-in': '/time-clock/clock-in',
      'clock-out': '/time-clock/clock-out',
      'start-break': '/time-clock/break/start',
      'end-break': '/time-clock/break/end'
    }

    try {
      await api.post(endpoints[managerAction.type], {
        employee_id: parseInt(selectedEmployee),
        notes: managerAction.notes,
        for_employee: true // Flag to skip 15-min restriction for admin
      })
      
      alert(`Successfully ${managerAction.type.replace('-', ' ')} employee`)
      setManagerAction({ type: 'clock-in', notes: '' })
      fetchTimeRecords() // Refresh the list
    } catch (error) {
      alert(error.response?.data?.error || `Failed to ${managerAction.type}`)
    }
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

  if (!isAdminOrManager) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Only managers and admins can view time clock history.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-2">Time Clock History</h2>

      <div className="card mb-2">
        <h3>Manager Clock Control</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Clock employees in/out manually (bypasses 15-minute restriction)
        </p>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Select Employee</label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">-- Select an Employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} {employee.team_name ? `(${employee.team_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label>Action</label>
            <select 
              value={managerAction.type}
              onChange={(e) => setManagerAction({...managerAction, type: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="clock-in">Clock In</option>
              <option value="clock-out">Clock Out</option>
              <option value="start-break">Start Break</option>
              <option value="end-break">End Break</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Notes (Optional)</label>
            <input
              type="text"
              value={managerAction.notes}
              onChange={(e) => setManagerAction({...managerAction, notes: e.target.value})}
              placeholder="e.g., Manager override"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleManagerClockAction}
            disabled={!selectedEmployee}
            style={{ minWidth: '150px' }}
          >
            Apply Action
          </button>
        </div>
      </div>

      <div className="card mb-2">
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Select Employee</label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">-- Select an Employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} {employee.team_name ? `(${employee.team_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={fetchTimeRecords}
            disabled={loading || !selectedEmployee}
            style={{ minWidth: '120px' }}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {timeRecords.length > 0 && (
        <div className="card">
          <h3>Time Records</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Showing {timeRecords.length} record(s) for {employees.find(e => e.id === parseInt(selectedEmployee))?.first_name} {employees.find(e => e.id === parseInt(selectedEmployee))?.last_name}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Scheduled</th>
                  <th>Late</th>
                  <th>Clock Out</th>
                  <th>Break Time</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {timeRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.clock_in ? format(parseLocalDate(record.clock_in), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td>
                      {record.clock_in ? format(parseLocalDate(record.clock_in), 'h:mm a') : '-'}
                    </td>
                    <td>
                      {record.scheduled_start ? format(parseLocalDate(record.scheduled_start), 'h:mm a') : '-'}
                    </td>
                    <td>
                      {record.is_late ? (
                        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                          +{formatDuration(record.minutes_late)}
                        </span>
                      ) : record.scheduled_start ? (
                        <span style={{ color: '#28a745' }}>On time</span>
                      ) : (
                        <span style={{ color: '#666' }}>No shift</span>
                      )}
                    </td>
                    <td>
                      {record.clock_out ? format(parseLocalDate(record.clock_out), 'h:mm a') : '-'}
                    </td>
                    <td>
                      {record.break_duration ? `${record.break_duration} min` : '-'}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {calculateDuration(record)}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: record.status === 'clocked_in' ? '#28a745' : record.status === 'on_break' ? '#ffc107' : '#6c757d',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: '13px' }}>
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Summary:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Days Worked</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {timeRecords.filter(r => r.clock_out).length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Hours</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {timeRecords.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Break Time</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                  {timeRecords.reduce((sum, r) => sum + (r.break_duration || 0), 0)} min
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Late Arrivals</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {timeRecords.filter(r => r.is_late).length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Late Time</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {formatDuration(timeRecords.reduce((sum, r) => sum + (r.minutes_late || 0), 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && timeRecords.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>No time records found for the selected date range.</p>
        </div>
      )}
    </div>
  )
}

export default TimeClockHistory
