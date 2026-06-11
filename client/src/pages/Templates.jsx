import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function Templates() {
  const [templates, setTemplates] = useState([])
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    position: '',
    color: '#007bff'
  })
  const [applyData, setApplyData] = useState({
    template_id: '',
    employee_id: '',
    date: '',
    applyToWeek: false,
    applyToWeekdays: false
  })

  useEffect(() => {
    fetchTemplates()
    fetchEmployees()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates')
      setTemplates(response.data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
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
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, formData)
      } else {
        await api.post('/templates', formData)
      }
      
      setShowModal(false)
      setEditingTemplate(null)
      setFormData({
        name: '',
        start_time: '',
        end_time: '',
        position: '',
        color: '#007bff'
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    
    try {
      if (applyData.applyToWeekdays) {
        // Apply to Monday-Friday of the selected week
        // Parse date string manually to avoid timezone issues
        const [year, month, day] = applyData.date.split('-').map(Number)
        const selectedDate = new Date(year, month - 1, day, 12, 0, 0) // Noon to avoid DST issues
        const dayOfWeek = selectedDate.getDay()
        
        // Calculate days back to Monday (0=Sun→6, 1=Mon→0, 2=Tue→1, etc.)
        const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const monday = new Date(selectedDate)
        monday.setDate(selectedDate.getDate() - daysBack)
        
        const promises = []
        for (let i = 0; i < 5; i++) {
          const shiftDate = new Date(monday)
          shiftDate.setDate(monday.getDate() + i)
          // Format as YYYY-MM-DD to avoid timezone conversion
          const dateStr = shiftDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })
          
          promises.push(
            api.post('/templates/apply', {
              template_id: applyData.template_id,
              employee_id: applyData.employee_id,
              date: dateStr
            })
          )
        }
        
        await Promise.all(promises)
        alert('Shifts created Monday-Friday!')
      } else if (applyData.applyToWeek) {
        await api.post('/templates/apply-week', {
          template_id: applyData.template_id,
          employee_id: applyData.employee_id,
          week_start_date: applyData.date
        })
        alert('Week of shifts created!')
      } else {
        await api.post('/templates/apply', {
          template_id: applyData.template_id,
          employee_id: applyData.employee_id,
          date: applyData.date
        })
        alert('Shift created!')
      }
      
      setShowApplyModal(false)
      setApplyData({
        template_id: '',
        employee_id: '',
        date: '',
        applyToWeek: false,
        applyToWeekdays: false
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to apply template:', error)
      alert(error.response?.data?.error || 'Failed to apply template')
    }
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      start_time: template.start_time.slice(0, 5),
      end_time: template.end_time.slice(0, 5),
      position: template.position || '',
      color: template.color || '#007bff'
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await api.delete(`/templates/${id}`)
        fetchTemplates()
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  const handleApplyClick = (template) => {
    setApplyData({ ...applyData, template_id: template.id })
    setShowApplyModal(true)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return (
    <div>
      <div className="flex justify-between mb-2">
        <h2>Shift Templates</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Create Template
        </button>
      </div>

      <div className="card">
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Templates are reusable shift configurations. Create templates for common shifts (e.g., "Morning Shift", "Evening Shift") 
          and quickly apply them to employees for specific dates or entire weeks.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '15px' 
        }}>
          {templates.map((template) => (
            <div 
              key={template.id} 
              className="card" 
              style={{ 
                borderLeft: `4px solid ${template.color}`,
                marginBottom: 0
              }}
            >
              <div className="flex justify-between" style={{ marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{template.name}</h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: template.is_active ? '#28a745' : '#6c757d',
                  color: 'white',
                  fontSize: '11px'
                }}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                <strong>Time:</strong> {template.start_time.slice(0, 5)} - {template.end_time.slice(0, 5)}
              </p>
              
              {template.position && (
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Position:</strong> {template.position}
                </p>
              )}

              <div className="flex mt-2">
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleApplyClick(template)}
                  style={{ marginRight: '5px', fontSize: '12px', padding: '6px 12px' }}
                >
                  Apply
                </button>
                <button 
                  className="btn" 
                  onClick={() => handleEdit(template)}
                  style={{ marginRight: '5px', fontSize: '12px', padding: '6px 12px', backgroundColor: '#6c757d', color: 'white' }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDelete(template.id)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No templates created yet. Click "Create Template" to get started.
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
            <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
            
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Morning Shift, Evening Shift"
                />
              </div>

              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
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
                  placeholder="e.g., Cashier, Supervisor"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  style={{ height: '40px', cursor: 'pointer' }}
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingTemplate(null)
                    setFormData({
                      name: '',
                      start_time: '',
                      end_time: '',
                      position: '',
                      color: '#007bff'
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTemplate ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApplyModal && (
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
            <h3>Apply Template</h3>
            
            <form onSubmit={handleApply} className="mt-2">
              <div className="form-group">
                <label>Employee</label>
                <select
                  value={applyData.employee_id}
                  onChange={(e) => setApplyData({...applyData, employee_id: e.target.value})}
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
                <label>
                  {applyData.applyToWeek || applyData.applyToWeekdays ? 'Week Start Date' : 'Date'}
                </label>
                <input
                  type="date"
                  value={applyData.date}
                  onChange={(e) => setApplyData({...applyData, date: e.target.value})}
                  required
                />
              </div>

              {applyData.applyToWeek && applyData.date && (
                <div className="card" style={{ backgroundColor: '#f8f9fa', marginBottom: '15px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '10px' }}>
                    This will create shifts for the week starting {format(new Date(applyData.date), 'MMM dd, yyyy')}:
                  </p>
                  <ul style={{ paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date(applyData.date)
                      date.setDate(date.getDate() + i)
                      return (
                        <li key={i}>
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {applyData.applyToWeekdays && applyData.date && (
                <div className="card" style={{ backgroundColor: '#f8f9fa', marginBottom: '15px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '10px' }}>
                    This will create shifts Monday-Friday for the week of {applyData.date}:
                  </p>
                  <ul style={{ paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
                    {(() => {
                      // Parse date string manually to avoid timezone issues
                      const [year, month, day] = applyData.date.split('-').map(Number)
                      const selectedDate = new Date(year, month - 1, day, 12, 0, 0)
                      const dayOfWeek = selectedDate.getDay()
                      const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                      const monday = new Date(selectedDate)
                      monday.setDate(selectedDate.getDate() - daysBack)
                      return Array.from({ length: 5 }).map((_, i) => {
                        const date = new Date(monday)
                        date.setDate(monday.getDate() + i)
                        return (
                          <li key={i}>
                            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </li>
                        )
                      })
                    })()}
                  </ul>
                </div>
              )}

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyData.applyToWeek}
                    onChange={(e) => setApplyData({...applyData, applyToWeek: e.target.checked, applyToWeekdays: false})}
                    style={{ width: 'auto' }}
                  />
                  Apply to entire week (7 days)
                </label>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyData.applyToWeekdays}
                    onChange={(e) => setApplyData({...applyData, applyToWeekdays: e.target.checked, applyToWeek: false})}
                    style={{ width: 'auto' }}
                  />
                  Apply to Mon-Fri (weekdays only)
                </label>
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowApplyModal(false)
                    setApplyData({
                      template_id: '',
                      employee_id: '',
                      date: '',
                      applyToWeek: false
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {applyData.applyToWeekdays ? 'Create Mon-Fri Shifts' : applyData.applyToWeek ? 'Create Week of Shifts' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Templates
