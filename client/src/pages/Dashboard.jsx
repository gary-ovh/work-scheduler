import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api'

function Dashboard({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.id, role: payload.role, email: payload.email })
        
        // Fetch user's name from employees table
        api.get('/employees/me')
          .then(res => {
            const employee = res.data
            if (employee) {
              setUserName(`${employee.first_name} ${employee.last_name}`)
            } else {
              setUserName(payload.email)
            }
          })
          .catch(() => setUserName(payload.email))
      } catch (error) {
        console.error('Failed to decode token:', error)
        setUserName('User')
      }
    }
  }, [])

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard/calendar', label: 'Calendar' },
    { path: '/dashboard/shifts', label: 'Shifts' },
    ...(user?.role === 'manager' || user?.role === 'admin' ? [{ path: '/dashboard/templates', label: 'Templates' }] : []),
    ...(user?.role === 'manager' || user?.role === 'admin' ? [{ path: '/dashboard/teams', label: 'Teams' }] : []),
    { path: '/dashboard/employees', label: 'Employees' },
    { path: '/dashboard/time-off', label: 'Time Off' }
  ]

  // Show back button on all pages except dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/'

  // Get current user info from token
  const getCurrentUserInfo = () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const employee = employees.find(e => e.user_id === payload.id)
        return {
          email: payload.email,
          role: payload.role,
          name: employee ? `${employee.first_name} ${employee.last_name}` : payload.email
        }
      } catch (error) {
        console.error('Failed to parse user token:', error)
      }
    }
    return null
  }

  const currentUser = getCurrentUserInfo()

  return (
    <div>
      <div className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {showBackButton && (
              <button 
                className="btn" 
                onClick={() => navigate('/dashboard')}
                style={{ padding: '8px 12px' }}
                title="Back to Dashboard"
              >
                🏠 Dashboard
              </button>
            )}
            <h1 style={{ margin: 0 }}>Work Scheduler</h1>
          </div>
          <div className="flex">
            <nav>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    marginRight: '20px',
                    textDecoration: 'none',
                    color: location.pathname === item.path ? '#007bff' : '#666',
                    fontWeight: location.pathname === item.path ? '600' : '400'
                  }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/dashboard/settings"
                style={{
                  marginLeft: '10px',
                  textDecoration: 'none',
                  color: location.pathname === '/dashboard/settings' ? '#007bff' : '#666',
                  fontWeight: location.pathname === '/dashboard/settings' ? '600' : '400'
                }}
              >
                ⚙️ Settings
              </Link>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>
                👤 {userName}
              </span>
              <button className="btn btn-danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <Outlet />
      </div>
    </div>
  )
}

export default Dashboard
