import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

function Dashboard({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/shifts', label: 'Shifts' },
    { path: '/templates', label: 'Templates' },
    { path: '/employees', label: 'Employees' },
    { path: '/time-off', label: 'Time Off' }
  ]

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'

  return (
    <div>
      <div className="header">
        <div className="container flex justify-between">
          <div className="flex" style={{ alignItems: 'center' }}>
            {!isDashboard && (
              <button 
                className="btn" 
                onClick={() => navigate('/dashboard')}
                style={{ marginRight: '15px', padding: '8px 12px' }}
                title="Back to Dashboard"
              >
                🏠 Dashboard
              </button>
            )}
            <h1>Work Scheduler</h1>
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
