import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function Shifts({ onLogout }) {
  const [shifts, setShifts] = useState([])
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_time: '',
    end_time: '',
    position: '',
    notes: ''
  })

  useEffect(() => {
    fetchShifts()
    fetchEmployees()
  }, [])

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts')
      setShifts(response.data)
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
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
      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, formData)
      } else {
        await api.post('/shifts', formData)
      }
      
      setShowModal(false)
      setEditingShift(null)
      setFormData({
        employee_id: '',
        start_time: '',
        end_time: '',
        position: '',
        notes: ''
      })
      fetchShifts()
    } catch (error) {
      console.error('Failed to save shift:', error)
    }
  }

  const handleEdit = (shift) => {
    setEditingShift(shift)
    setFormData({
      employee_id: shift.employee_id,
      start_time: shift.start_time.slice(0, 16),
      end_time: shift.end_time.slice(0, 16),
      position: shift.position || '',
      notes: shift.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      try {
        await api.delete(`/shifts/${id}`)
        fetchShifts()
      } catch (error) {
        console.error('Failed to delete shift:', error)
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
        <h2>Shift Management</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Add Shift
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.first_name} {shift.last_name}</td>
                <td>{shift.position || '-'}</td>
                <td>{format(new Date(shift.start_time), 'MMM dd, yyyy hh:mm a')}</td>
                <td>{format(new Date(shift.end_time), 'MMM dd, yyyy hh:mm a')}</td>
                <td>{shift.status}</td>
                <td>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleEdit(shift)}
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(shift.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shifts.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No shifts scheduled
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
            <h3>{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
            
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="form-group">
                <label>Employee</label>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Cashier, Manager"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingShift(null)
                    setFormData({
                      employee_id: '',
                      start_time: '',
                      end_time: '',
                      position: '',
                      notes: ''
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingShift ? 'Update' : 'Create'} Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Shifts
