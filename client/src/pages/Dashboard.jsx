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
