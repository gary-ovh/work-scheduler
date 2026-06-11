import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

function Dashboard({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.id, role: payload.role })
      } catch (error) {
        console.error('Failed to decode token:', error)
      }
    }
  }, [])

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard/shifts', label: 'Shifts' },
    ...(user?.role === 'manager' || user?.role === 'admin' ? [{ path: '/dashboard/templates', label: 'Templates' }] : []),
    { path: '/dashboard/employees', label: 'Employees' },
    { path: '/dashboard/time-off', label: 'Time Off' }
  ]

  // Show back button on all pages except dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/'

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
            <button className="btn btn-danger" onClick={onLogout}>
              Logout
            </button>
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
