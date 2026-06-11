import { useState, useEffect } from 'react'
import api from '../api'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfMonth, isSameMonth, isToday } from 'date-fns'

function Shifts() {
  const [shifts, setShifts] = useState([])
  const [employees, setEmployees] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day'
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [show5DayWeek, setShow5DayWeek] = useState(false)
  const [showVacation, setShowVacation] = useState(false)
  const [vacationRequests, setVacationRequests] = useState([])
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
      
      await Promise.all([fetchShifts(), fetchEmployees(), fetchVacationRequests()])
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchVacationRequests = async () => {
    try {
      const response = await api.get('/leave/requests?status=approved')
      const vacations = response.data.filter(r => r.leave_type.toLowerCase() === 'vacation')
      setVacationRequests(vacations)
    } catch (error) {
      console.error('Failed to fetch vacation requests:', error)
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
      if (show5DayWeek) {
        // Monday to Friday
        const start = startOfWeek(weekStart, { weekStartsOn: 1 }) // Monday
        const monday = start
        const tuesday = new Date(start); tuesday.setDate(start.getDate() + 1)
        const wednesday = new Date(start); wednesday.setDate(start.getDate() + 2)
        const thursday = new Date(start); thursday.setDate(start.getDate() + 3)
        const friday = new Date(start); friday.setDate(start.getDate() + 4)
        return [monday, tuesday, wednesday, thursday, friday]
      } else {
        const start = startOfWeek(weekStart)
        const end = endOfWeek(weekStart)
        return eachDayOfInterval({ start, end })
      }
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

  const isEmployeeOnVacation = (employeeId, date) => {
    if (!showVacation) return false
    
    const checkDate = format(date, 'yyyy-MM-dd')
    const vacation = vacationRequests.find(v => 
      v.employee_id === employeeId &&
      v.status === 'approved' &&
      v.leave_type.toLowerCase() === 'vacation' &&
      checkDate >= v.start_date &&
      checkDate <= v.end_date
    )
    return !!vacation
  }

  const getVacationDates = (employeeId) => {
    const vacations = vacationRequests.filter(v => 
      v.employee_id === employeeId &&
      v.status === 'approved' &&
      v.leave_type.toLowerCase() === 'vacation'
    )
    return vacations.map(v => ({
      start: format(new Date(v.start_date + 'T00:00:00'), 'MMM dd'),
      end: format(new Date(v.end_date + 'T00:00:00'), 'MMM dd')
    }))
  }

  const navigateWeek = (direction) => {
    if (viewMode === 'month') {
      setWeekStart(direction === 'next' ? addWeeks(weekStart, 4) : subWeeks(weekStart, 4))
    } else if (viewMode === 'week') {
      // Always navigate by full weeks (7 days), even in Mon-Fri mode
      setWeekStart(direction === 'next' ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1))
    } else {
      setWeekStart(direction === 'next' ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1))
    }
  }

  const goToToday = () => {
    const today = new Date()
    
    if (viewMode === 'month') {
      setWeekStart(startOfMonth(today))
    } else if (viewMode === 'week') {
      setWeekStart(startOfWeek(today, { weekStartsOn: 0 }))
    } else {
      setWeekStart(today)
    }
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
              Mon-Fri
            </label>
          )}

          {/* Show Vacation Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={showVacation}
              onChange={(e) => {
                setShowVacation(e.target.checked)
                if (e.target.checked && vacationRequests.length === 0) {
                  fetchVacationRequests()
                }
              }}
              style={{ width: 'auto' }}
            />
            Show Vacation
          </label>

          {/* Navigation */}
          <div className="flex" style={{ alignItems: 'center', gap: '5px' }}>
            <button className="btn" onClick={() => navigateWeek('prev')}>&lt;</button>
            <span style={{ fontWeight: '600', minWidth: '250px', textAlign: 'center' }}>
              {viewMode === 'month' 
                ? format(weekStart, 'MMMM yyyy')
                : viewMode === 'week' && show5DayWeek
                ? (() => {
                    const monday = startOfWeek(weekStart, { weekStartsOn: 1 })
                    const friday = new Date(monday)
                    friday.setDate(monday.getDate() + 4)
                    return `${format(monday, 'MMM dd')} - ${format(friday, 'MMM dd, yyyy')}`
                  })()
                : viewMode === 'week'
                ? (() => {
                    const sunday = startOfWeek(weekStart)
                    const saturday = endOfWeek(weekStart)
                    return `${format(sunday, 'MMM dd')} - ${format(saturday, 'MMM dd, yyyy')}`
                  })()
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
                        
                        {/* Show vacation indicator in month view */}
                        {showVacation && (() => {
                          const vacationEmployees = employees.filter(e => isEmployeeOnVacation(e.id, day))
                          const remainingSlots = 3 - dayShifts.slice(0, 3).length
                          
                          return vacationEmployees.slice(0, remainingSlots).map(employee => (
                            <div 
                              key={`vac-${employee.id}-${day.toISOString()}`}
                              style={{
                                backgroundColor: '#fff3cd',
                                borderLeft: `3px solid #ffc107`,
                                padding: '4px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontStyle: 'italic'
                              }}
                            >
                              <div style={{ fontWeight: '600', color: '#856404' }}>
                                🌴 {employee.first_name} {employee.last_name}
                              </div>
                            </div>
                          ))
                        })()}
                        
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
                    marginBottom: '10px',
                    textAlign: 'center',
                    padding: '5px',
                    backgroundColor: isToday(day) ? '#007bff' : '#f8f9fa',
                    borderRadius: '5px',
                    fontSize: '16px'
                  }}>
                    <div style={{ fontSize: '16px', color: isToday(day) ? 'white' : '#333' }}>{format(day, 'EEEE')}</div>
                    <div style={{ fontSize: '24px', color: isToday(day) ? 'white' : '#333' }}>{format(day, 'd')}</div>
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
                    
                    {/* Show employees on vacation */}
                    {showVacation && employees.map(employee => {
                      if (isEmployeeOnVacation(employee.id, day)) {
                        return (
                          <div 
                            key={`vac-${employee.id}`}
                            style={{
                              backgroundColor: '#fff3cd',
                              borderLeft: `3px solid #ffc107`,
                              padding: '8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontStyle: 'italic'
                            }}
                          >
                            <div style={{ fontWeight: '600', color: '#856404' }}>
                              🌴 {employee.first_name} {employee.last_name}
                            </div>
                            <div style={{ color: '#856404', fontSize: '11px' }}>
                              On Vacation
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}
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

            {/* Timeline View */}
            <div className="card">
              <h4 style={{ marginBottom: '15px' }}>Daily Timeline</h4>
              
              {/* Time Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '150px repeat(24, 1fr)', 
                gap: '1px',
                backgroundColor: '#e0e0e0',
                marginBottom: '10px',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '10px', 
                  fontWeight: '600',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  Employee
                </div>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '5px', 
                    fontSize: '10px',
                    textAlign: 'center',
                    borderLeft: hour % 6 === 0 ? '1px solid #ccc' : '1px solid #e0e0e0'
                  }}>
                    {hour % 6 === 0 ? `${hour}:00` : ''}
                  </div>
                ))}
              </div>

              {/* Employee Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {employees.map((employee) => {
                  const employeeShifts = getShiftsForDay(weekStart).filter(
                    s => s.employee_id === employee.id
                  )
                  
                  return (
                    <div 
                      key={employee.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '150px 1fr',
                        gap: '1px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        minHeight: '50px'
                      }}
                    >
                      {/* Employee Name */}
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '12px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        fontSize: '13px'
                      }}>
                        <div style={{ fontWeight: '600' }}>
                          {employee.first_name} {employee.last_name}
                        </div>
                        {employee.position && (
                          <div style={{ fontSize: '11px', color: '#666' }}>{employee.position}</div>
                        )}
                      </div>

                      {/* Timeline Track */}
                      <div style={{
                        backgroundColor: 'white',
                        position: 'relative',
                        minHeight: '50px'
                      }}>
                        {/* Hour grid lines */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(24, 1fr)',
                          pointerEvents: 'none'
                        }}>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div 
                              key={i} 
                              style={{ 
                                borderLeft: i % 6 === 0 ? '1px solid #f0f0f0' : '1px solid #fafafa',
                                height: '100%'
                              }} 
                            />
                          ))}
                        </div>

                        {/* Shift bars */}
                        {employeeShifts.map((shift, idx) => {
                          const startTime = new Date(shift.start_time)
                          const endTime = new Date(shift.end_time)
                          
                          const startHour = startTime.getHours() + startTime.getMinutes() / 60
                          const endHour = endTime.getHours() + endTime.getMinutes() / 60
                          const duration = endHour - startHour
                          
                          const leftPercent = (startHour / 24) * 100
                          const widthPercent = (duration / 24) * 100
                          
                          return (
                            <div
                              key={shift.id}
                              style={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: `${idx * 22 + 5}px`,
                                height: '18px',
                                backgroundColor: '#4CAF50',
                                borderRadius: '3px',
                                cursor: isManager ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 4px',
                                fontSize: '10px',
                                color: 'white',
                                fontWeight: '500',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                zIndex: 10,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => isManager && handleEdit(shift)}
                              title={`${employee.first_name} ${employee.last_name}\n${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}\n${shift.position || ''}`}
                            >
                              {duration >= 1 && (
                                <span>
                                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                  {shift.position && ` • ${shift.position}`}
                                </span>
                              )}
                            </div>
                          )
                        })}

                        {employeeShifts.length === 0 && (
                          <div style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            color: '#ccc'
                          }}>
                            No shift
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ 
                marginTop: '20px', 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <strong>Legend:</strong>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '12px', 
                  backgroundColor: '#4CAF50', 
                  borderRadius: '2px',
                  marginLeft: '10px',
                  marginRight: '5px'
                }}></span>
                Scheduled Shift (click to edit)
                <span style={{ marginLeft: '20px', color: '#666' }}>
                  Grid lines show 6-hour intervals
                </span>
              </div>
            </div>

            {/* Table View Toggle */}
            <div style={{ marginTop: '20px' }}>
              <button 
                className="btn" 
                onClick={() => {
                  const tableView = document.getElementById('day-table-view')
                  if (tableView) {
                    tableView.style.display = tableView.style.display === 'none' ? 'block' : 'none'
                  }
                }}
                style={{ marginBottom: '10px' }}
              >
                Toggle Table View
              </button>
            </div>

            {/* Traditional Table View (toggleable) */}
            <div id="day-table-view" className="card" style={{ display: 'none' }}>
              <h4 style={{ marginBottom: '15px' }}>Shift Details</h4>
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
