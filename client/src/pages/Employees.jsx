import { useState, useEffect } from 'react'
import api from '../api'

function Employees() {
  const [employees, setEmployees] = useState([])
  const [teams, setTeams] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: '',
    email: '',
    password: '',
    role: 'employee',
    team_id: ''
  })

  const canEdit = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    fetchUserData()
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams')
      setTeams(res.data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.id, role: payload.role })
      await fetchEmployees()
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, {
          ...formData,
          team_id: formData.team_id || null
        })
      } else {
        await api.post('/employees', {
          ...formData,
          team_id: formData.team_id || null
        })
      }
      
      setShowModal(false)
      setEditingEmployee(null)
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        position: '',
        email: '',
        password: '',
        role: 'employee',
        team_id: ''
      })
      fetchEmployees()
    } catch (error) {
      console.error('Failed to save employee:', error)
    }
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone || '',
      position: employee.position || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      team_id: employee.team_id || ''
    })
    setShowModal(true)
  }

  const handleResetPassword = (employee) => {
    setSelectedEmployee(employee)
    setResetPassword('')
    setShowResetModal(true)
  }

  const submitResetPassword = async (e) => {
    e.preventDefault()
    
    if (resetPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      await api.put('/auth/reset-password', {
        userId: selectedEmployee.user_id,
        newPassword: resetPassword
      })
      setShowResetModal(false)
      alert(`Password for ${selectedEmployee.first_name} ${selectedEmployee.last_name} has been reset`)
    } catch (error) {
      console.error('Failed to reset password:', error)
      alert(error.response?.data?.error || 'Failed to reset password')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/employees/${id}`)
        fetchEmployees()
      } catch (error) {
        console.error('Failed to delete employee:', error)
      }
    }
  }

  const handleChangeRole = async (employee, newRole) => {
    if (confirm(`Change ${employee.first_name}'s role to ${newRole}?`)) {
      try {
        await api.put(`/employees/${employee.id}/role`, { role: newRole })
        fetchEmployees()
      } catch (error) {
        console.error('Failed to update role:', error)
        alert('Failed to update role')
      }
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div>
      <div className="flex justify-between mb-2">
        <h2>Employee Management</h2>
        <div className="flex">
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Phone</th>
              <th>Team</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.first_name} {employee.last_name}</td>
                <td>{employee.email || '-'}</td>
                <td>{employee.position || '-'}</td>
                <td>{employee.phone || '-'}</td>
                <td>
                  {employee.team_name ? (
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: employee.team_color + '20',
                      color: employee.team_color,
                      fontSize: '12px'
                    }}>
                      {employee.team_name}
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>Unassigned</span>
                  )}
                </td>
                <td>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: employee.role === 'admin' ? '#dc3545' : employee.role === 'manager' ? '#007bff' : '#28a745',
                    color: 'white',
                    fontSize: '11px',
                    textTransform: 'capitalize'
                  }}>
                    {employee.role}
                  </span>
                </td>
                <td>
                  {canEdit && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleEdit(employee)}
                        style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px' }}
                      >
                        Edit
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          {employee.role === 'employee' && (
                            <button 
                              className="btn" 
                              onClick={() => handleChangeRole(employee, 'manager')}
                              style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px', backgroundColor: '#007bff', color: 'white' }}
                            >
                              Promote
                            </button>
                          )}
                          {employee.role === 'manager' && (
                            <button 
                              className="btn" 
                              onClick={() => handleChangeRole(employee, 'employee')}
                              style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px', backgroundColor: '#6c757d', color: 'white' }}
                            >
                              Demote
                            </button>
                          )}
                        </>
                      )}
                      {(user?.role === 'admin' || user?.role === 'manager') && employee.role !== 'admin' && (
                        <button 
                          className="btn" 
                          onClick={() => handleResetPassword(employee)}
                          style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white' }}
                        >
                          Reset Password
                        </button>
                      )}
                      {/* Only admins can delete, and never delete other admins */}
                      {((user?.role === 'admin' || user?.role === 'manager') && employee.role !== 'admin') && (
                        <button 
                          className="btn btn-danger" 
                          onClick={() => handleDelete(employee.id)}
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                  {!canEdit && <span style={{ color: '#666' }}>View only</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No employees found
          </p>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '500px', margin: 0 }}>
            <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
            
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              {!editingEmployee && (
                <>
                  <div className="form-group">
                    <label>Email (for login)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="employee@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Password (leave blank to skip account creation)</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password to create login account"
                    />
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              {editingEmployee && (
                <>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Cashier, Supervisor"
                />
              </div>

              <div className="form-group">
                <label>Team</label>
                <select
                  name="team_id"
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingEmployee(null)
                    setFormData({
                      first_name: '',
                      last_name: '',
                      phone: '',
                      position: '',
                      email: '',
                      password: '',
                      role: 'employee',
                      team_id: ''
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', margin: 0 }}>
            <h3>Reset Password</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Reset password for <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>
            </p>

            <form onSubmit={submitResetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new password (min 6 characters)"
                  autoFocus
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setShowResetModal(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
