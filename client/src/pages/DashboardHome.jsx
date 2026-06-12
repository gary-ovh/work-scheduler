import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'
import TimeClockWidget from '../components/TimeClockWidget'

function DashboardHome() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
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
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isAdminOrManager = payload.role === 'admin' || payload.role === 'manager'
      setUser({ id: payload.id, role: payload.role })

      const [shiftsRes, employeesRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees')
      ])

      const shifts = shiftsRes.data
      const employees = employeesRes.data

      // Find current employee's record
      const currentEmployee = employees.find(e => e.user_id === payload.id)
      setEmployee(currentEmployee)

      // Only fetch requests for admin/manager
      let pending = []
      if (isAdminOrManager) {
        try {
          const requestsRes = await api.get('/leave/requests')
          const requests = requestsRes.data
          pending = requests.filter(r => r.status === 'pending')
        } catch (error) {
          console.log('Could not fetch leave requests (expected for employees)')
        }
      }

      const now = new Date()
      
      // Filter shifts based on role
      let employeeShifts = shifts
      let employeePendingRequests = []
      if (!isAdminOrManager && currentEmployee) {
        // Employee sees only their own shifts
        employeeShifts = shifts.filter(s => s.employee_id === currentEmployee.id)
        
        // Employee sees only their own pending requests
        try {
          const requestsRes = await api.get(`/leave/requests?employee_id=${currentEmployee.id}`)
          const requests = requestsRes.data
          employeePendingRequests = requests.filter(r => r.status === 'pending')
        } catch (error) {
          console.log('Could not fetch employee requests')
        }
      }
      
      const upcoming = employeeShifts.filter(s => new Date(s.start_time) > now)

      setStats({
        totalShifts: employeeShifts.length,
        totalEmployees: isAdminOrManager ? employees.length : null,
        upcomingShifts: upcoming.length,
        pendingRequests: isAdminOrManager ? pending.length : employeePendingRequests.length
      })

      setRecentShifts(employeeShifts.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div>
      <h2 className="mb-2">Dashboard Overview</h2>

      {/* Time Clock Widget */}
      <div style={{ marginBottom: '30px' }}>
        <TimeClockWidget />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)), 
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#007bff', marginBottom: '10px' }}>
            {stats.totalShifts}
          </h3>
          <p style={{ color: '#666' }}>
            {isAdminOrManager ? 'Total Shifts' : 'My Shifts'}
          </p>
        </div>

        {isAdminOrManager && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#28a745', marginBottom: '10px' }}>
              {stats.totalEmployees}
            </h3>
            <p style={{ color: '#666' }}>Employees</p>
          </div>
        )}

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#ffc107', marginBottom: '10px' }}>
            {stats.upcomingShifts}
          </h3>
          <p style={{ color: '#666' }}>
            {isAdminOrManager ? 'Upcoming Shifts' : 'My Upcoming Shifts'}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#dc3545', marginBottom: '10px' }}>
            {stats.pendingRequests}
          </h3>
          <p style={{ color: '#666' }}>
            {isAdminOrManager ? 'Pending Requests' : 'My Pending Requests'}
          </p>
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
