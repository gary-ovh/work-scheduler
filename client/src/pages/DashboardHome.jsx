import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function DashboardHome() {
  const [stats, setStats] = useState({
    totalShifts: 0,
    totalEmployees: 0,
    upcomingShifts: 0,
    pendingRequests: 0
  })
  const [recentShifts, setRecentShifts] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [shiftsRes, employeesRes, requestsRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees'),
        api.get('/leave/requests')
      ])

      const shifts = shiftsRes.data
      const employees = employeesRes.data
      const requests = requestsRes.data

      const now = new Date()
      const upcoming = shifts.filter(s => new Date(s.start_time) > now)
      const pending = requests.filter(r => r.status === 'pending')

      setStats({
        totalShifts: shifts.length,
        totalEmployees: employees.length,
        upcomingShifts: upcoming.length,
        pendingRequests: pending.length
      })

      setRecentShifts(shifts.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  return (
    <div>
      <h2 className="mb-2">Dashboard Overview</h2>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#007bff', marginBottom: '10px' }}>
            {stats.totalShifts}
          </h3>
          <p style={{ color: '#666' }}>Total Shifts</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#28a745', marginBottom: '10px' }}>
            {stats.totalEmployees}
          </h3>
          <p style={{ color: '#666' }}>Employees</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#ffc107', marginBottom: '10px' }}>
            {stats.upcomingShifts}
          </h3>
          <p style={{ color: '#666' }}>Upcoming Shifts</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#dc3545', marginBottom: '10px' }}>
            {stats.pendingRequests}
          </h3>
          <p style={{ color: '#666' }}>Pending Requests</p>
        </div>
      </div>

      <div className="card">
        <h3>Recent Shifts</h3>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentShifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.first_name} {shift.last_name}</td>
                <td>{format(new Date(shift.start_time), 'MMM dd, yyyy hh:mm a')}</td>
                <td>{format(new Date(shift.end_time), 'MMM dd, yyyy hh:mm a')}</td>
                <td>{shift.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recentShifts.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No shifts scheduled yet
          </p>
        )}
      </div>
    </div>
  )
}

export default DashboardHome
