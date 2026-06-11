import { useState, useEffect } from 'react'
import api from '../api'

function Employees() {
  const [employees, setEmployees] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: '',
    hourly_rate: ''
  })

  const canEdit = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    fetchUserData()
  }, [])

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
        await api.put(`/employees/${editingEmployee.id}`, formData)
      } else {
        await api.post('/employees', formData)
      }
      
      setShowModal(false)
      setEditingEmployee(null)
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        position: '',
        hourly_rate: ''
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
      hourly_rate: employee.hourly_rate || ''
    })
    setShowModal(true)
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
              <th>Position</th>
              <th>Phone</th>
              <th>Hourly Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.first_name} {employee.last_name}</td>
                <td>{employee.position || '-'}</td>
                <td>{employee.phone || '-'}</td>
                <td>${employee.hourly_rate || '0.00'}</td>
                <td>
                  {canEdit && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleEdit(employee)}
                        style={{ marginRight: '5px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDelete(employee.id)}
                      >
                        Delete
                      </button>
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
                <label>Hourly Rate ($)</label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
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
                      hourly_rate: ''
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
    </div>
  )
}

export default Employees
