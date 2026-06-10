import { Link, Outlet, useLocation } from 'react-router-dom'

function Dashboard({ onLogout }) {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/shifts', label: 'Shifts' },
    { path: '/templates', label: 'Templates' },
    { path: '/employees', label: 'Employees' },
    { path: '/time-off', label: 'Time Off' }
  ]

  return (
    <div>
      <div className="header">
        <div className="container flex justify-between">
          <h1>Work Scheduler</h1>
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
