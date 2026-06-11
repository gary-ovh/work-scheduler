import { useState, useEffect } from 'react'
import api from '../api'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfMonth, isSameMonth, isToday } from 'date-fns'

function Shifts({ onLogout }) {
  const [shifts, setShifts] = useState([])
  const [employees, setEmployees] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day'
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [show5DayWeek, setShow5DayWeek] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_time: '',
    end_time: '',
    position: '',
    notes: ''
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
      
      await Promise.all([fetchShifts(), fetchEmployees()])
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

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

  const getDaysToShow = () => {
    if (viewMode === 'month') {
      const start = startOfMonth(weekStart)
      const end = endOfMonth(weekStart)
      return eachDayOfMonth({ start, end })
    } else if (viewMode === 'week') {
      const start = show5DayWeek ? weekStart : startOfWeek(weekStart)
      const end = show5DayWeek ? addWeeks(start, 1) : endOfWeek(weekStart)
      return eachDayOfInterval({ start, end })
    } else {
      return [weekStart]
    }
  }

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time)
      return shiftDate.toDateString() === date.toDateString()
    })
  }

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId)
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'
  }

  const navigateWeek = (direction) => {
    if (viewMode === 'month') {
      setWeekStart(direction === 'next' ? addWeeks(weekStart, 4) : subWeeks(weekStart, 4))
    } else {
      setWeekStart(direction === 'next' ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1))
    }
  }

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date()))
  }

  const daysToShow = getDaysToShow()
  const isManager = canEdit

  return (
    <div>
      <div className="flex justify-between mb-2" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <h2>Shift Calendar</h2>
        
        <div className="flex" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* View Mode Toggles */}
          <div className="flex" style={{ backgroundColor: '#f0f0f0', borderRadius: '5px', padding: '3px' }}>
            <button
              className={`btn ${viewMode === 'month' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('month')}
              style={{ borderRadius: '3px', fontSize: '13px', padding: '6px 12px' }}
            >
              Month
            </button>
            <button
              className={`btn ${viewMode === 'week' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('week')}
              style={{ borderRadius: '3px', fontSize: '13px', padding: '6px 12px' }}
            >
              Week
            </button>
            <button
              className={`btn ${viewMode === 'day' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('day')}
              style={{ borderRadius: '3px', fontSize: '13px', padding: '6px 12px' }}
            >
              Day
            </button>
          </div>

          {/* 5/7 Day Toggle */}
          {viewMode === 'week' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={show5DayWeek}
                onChange={(e) => setShow5DayWeek(e.target.checked)}
                style={{ width: 'auto' }}
              />
              5-day week
            </label>
          )}

          {/* Navigation */}
          <div className="flex" style={{ alignItems: 'center', gap: '5px' }}>
            <button className="btn" onClick={() => navigateWeek('prev')}>&lt;</button>
            <span style={{ fontWeight: '600', minWidth: '200px', textAlign: 'center' }}>
              {viewMode === 'month' 
                ? format(weekStart, 'MMMM yyyy')
                : viewMode === 'week'
                ? `${format(show5DayWeek ? weekStart : startOfWeek(weekStart), 'MMM dd')} - ${format(show5DayWeek ? addWeeks(weekStart, 1) : endOfWeek(weekStart), 'MMM dd, yyyy')}`
                : format(weekStart, 'MMMM dd, yyyy')
              }
            </span>
            <button className="btn" onClick={() => navigateWeek('next')}>&gt;</button>
            <button className="btn btn-primary" onClick={goToToday}>Today</button>
          </div>

          {isManager && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Add Shift
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        {viewMode === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#e0e0e0' }}>
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                fontWeight: '600', 
                textAlign: 'center',
                fontSize: '13px'
              }}>
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {(() => {
              const start = startOfMonth(weekStart)
              const end = endOfMonth(weekStart)
              const days = eachDayOfMonth({ start, end })
              const startDay = start.getDay()
              const endDay = 6 - end.getDay()
              
              const paddingDays = Array.from({ length: startDay }, (_, i) => {
                const d = new Date(start)
                d.setDate(d.getDate() - startDay + i)
                return d
              })
              
              const endPaddingDays = Array.from({ length: endDay }, (_, i) => {
                const d = new Date(end)
                d.setDate(d.getDate() + i + 1)
                return d
              })
              
              const allDays = [...paddingDays, ...days, ...endPaddingDays]
              const weeks = []
              for (let i = 0; i < allDays.length; i += 7) {
                weeks.push(allDays.slice(i, i + 7))
              }

              return weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dayShifts = getShiftsForDay(day)
                  const isCurrentMonth = isSameMonth(day, weekStart)
                  
                  return (
                    <div 
                      key={`${weekIdx}-${dayIdx}`}
                      style={{
                        backgroundColor: isCurrentMonth ? 'white' : '#f5f5f5',
                        minHeight: '100px',
                        padding: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <div style={{ 
                        fontWeight: isToday(day) ? 'bold' : 'normal',
                        color: isToday(day) ? 'white' : isCurrentMonth ? '#333' : '#999',
                        backgroundColor: isToday(day) ? '#007bff' : 'transparent',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '5px',
                        fontSize: '13px'
                      }}>
                        {format(day, 'd')}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {dayShifts.slice(0, 3).map(shift => (
                          <div 
                            key={shift.id}
                            style={{
                              backgroundColor: '#e3f2fd',
                              borderLeft: `3px solid #007bff`,
                              padding: '4px 6px',
                              borderRadius: '3px',
                              fontSize: '11px'
                            }}
                          >
                            <div style={{ fontWeight: '600' }}>{getEmployeeName(shift.employee_id)}</div>
                            <div style={{ color: '#666' }}>
                              {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                            </div>
                            {shift.position && (
                              <div style={{ color: '#007bff', fontSize: '10px' }}>{shift.position}</div>
                            )}
                          </div>
                        ))}
                        {dayShifts.length > 3 && (
                          <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                            +{dayShifts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ))
            })()}
          </div>
        )}

        {viewMode === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${show5DayWeek ? 5 : 7}, 1fr)`, gap: '1px', backgroundColor: '#e0e0e0' }}>
            {daysToShow.map((day, idx) => {
              const dayShifts = getShiftsForDay(day)
              
              return (
                <div 
                  key={idx}
                  style={{
                    backgroundColor: isToday(day) ? '#e3f2fd' : 'white',
                    minHeight: '300px',
                    padding: '10px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{ 
                    fontWeight: isToday(day) ? 'bold' : '600',
                    color: isToday(day) ? '#007bff' : '#333',
                    marginBottom: '10px',
                    textAlign: 'center',
                    padding: '5px',
                    backgroundColor: isToday(day) ? '#007bff' : '#f8f9fa',
                    borderRadius: '5px',
                    color: isToday(day) ? 'white' : '#333'
                  }}>
                    <div style={{ fontSize: '16px' }}>{format(day, 'EEEE')}</div>
                    <div style={{ fontSize: '24px' }}>{format(day, 'd')}</div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {dayShifts.map(shift => (
                      <div 
                        key={shift.id}
                        style={{
                          backgroundColor: '#e3f2fd',
                          borderLeft: `3px solid #007bff`,
                          padding: '8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '3px' }}>{getEmployeeName(shift.employee_id)}</div>
                        <div style={{ color: '#666', fontSize: '11px' }}>
                          {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                        </div>
                        {shift.position && (
                          <div style={{ color: '#007bff', fontSize: '10px', marginTop: '2px' }}>{shift.position}</div>
                        )}
                        {isManager && (
                          <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleEdit(shift)}
                              style={{ fontSize: '10px', padding: '2px 6px' }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger" 
                              onClick={() => handleDelete(shift.id)}
                              style={{ fontSize: '10px', padding: '2px 6px' }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {viewMode === 'day' && (
          <div style={{ padding: '20px' }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '15px', 
              backgroundColor: isToday(weekStart) ? '#e3f2fd' : '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: isToday(weekStart) ? '#007bff' : '#333' }}>
                {format(weekStart, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
            
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Position</th>
                    <th>Notes</th>
                    {isManager && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {getShiftsForDay(weekStart).map(shift => (
                    <tr key={shift.id}>
                      <td>{getEmployeeName(shift.employee_id)}</td>
                      <td>{format(new Date(shift.start_time), 'h:mm a')}</td>
                      <td>{format(new Date(shift.end_time), 'h:mm a')}</td>
                      <td>{shift.position || '-'}</td>
                      <td>{shift.notes || '-'}</td>
                      {isManager && (
                        <td>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleEdit(shift)}
                            style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px' }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => handleDelete(shift.id)}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {getShiftsForDay(weekStart).length === 0 && (
                <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No shifts scheduled for this day
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && isManager && (
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
