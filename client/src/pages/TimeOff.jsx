import { useState, useEffect } from 'react'
import api from '../api'
import { format } from 'date-fns'

function TimeOff() {
  const [user, setUser] = useState(null)
  const [leaveBalance, setLeaveBalance] = useState(null)
  const [requests, setRequests] = useState([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    leave_type: 'vacation',
    reason: '',
    is_full_day: true,
    hours_requested: ''
  })
  const [balanceFormData, setBalanceFormData] = useState({
    vacation_days: '',
    sick_days: '',
    flexible_days: ''
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.id, role: payload.role })

      // Fetch employees list (needed for all users)
      const employeesRes = await api.get('/employees')
      setEmployees(employeesRes.data)
      
      if (payload.role === 'manager' || payload.role === 'admin') {
        // Managers/Admins can see all requests
        const requestsRes = await api.get('/leave/requests')
        setRequests(requestsRes.data)
      } else {
        // Employees can only see their own requests
        const employee = employeesRes.data.find(e => e.user_id === payload.id)
        if (employee) {
          setSelectedEmployee(employee)
          fetchLeaveBalance(employee.id)
          
          // Fetch only this employee's requests
          try {
            const requestsRes = await api.get(`/leave/requests?employee_id=${employee.id}`)
            setRequests(requestsRes.data)
          } catch (error) {
            console.error('Failed to fetch requests:', error)
            setRequests([])
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchLeaveBalance = async (employeeId) => {
    try {
      const response = await api.get(`/leave/balance/${employeeId}`)
      setLeaveBalance(response.data)
    } catch (error) {
      console.error('Failed to fetch leave balance:', error)
    }
  }

  const handleRefreshBalance = () => {
    if (selectedEmployee) {
      fetchLeaveBalance(selectedEmployee.id)
    }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    try {
      // For employees, use their own employee_id
      const submitData = { ...formData }
      
      if (user?.role !== 'manager' && user?.role !== 'admin') {
        // Employee submitting for themselves
        if (!selectedEmployee) {
          return alert('Employee profile not found')
        }
        submitData.employee_id = selectedEmployee.id
      }
      
      // Calculate hours based on full day or custom
      if (formData.leave_type === 'sick' || formData.leave_type === 'flexible') {
        if (formData.is_full_day) {
          // Calculate days from date range and convert to hours (8 hours per day)
          const days = Math.round((new Date(formData.end_date + 'T00:00:00') - new Date(formData.start_date + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1
          submitData.hours_requested = days * 8
        } else {
          submitData.hours_requested = parseFloat(formData.hours_requested)
          if (!submitData.hours_requested || submitData.hours_requested < 0.5) {
            return alert('Please enter valid hours (minimum 0.5)')
          }
        }
      }
      
      // Ensure dates are sent as-is without timezone conversion
      submitData.start_date = formData.start_date
      submitData.end_date = formData.end_date
      
      if (submitData.employee_id) {
        await api.post('/leave/requests', submitData)
        setShowRequestModal(false)
        setFormData({
          employee_id: '',
          start_date: '',
          end_date: '',
          leave_type: 'vacation',
          reason: '',
          is_full_day: true,
          hours_requested: ''
        })
        fetchUserData()
        if (selectedEmployee) {
          fetchLeaveBalance(selectedEmployee.id)
        }
      } else {
        alert('Please select an employee')
      }
    } catch (error) {
      console.error('Failed to submit request:', error.response?.data?.error || error.message)
      alert(error.response?.data?.error || 'Failed to submit request')
    }
  }

  const handleReview = async (id, status) => {
    try {
      await api.put(`/leave/requests/${id}/review`, { status, reviewed_by: user.id })
      fetchUserData()
    } catch (error) {
      console.error('Failed to review request:', error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to cancel this time off request? If approved, the days will be returned to your balance.')) {
      try {
        await api.put(`/leave/requests/${id}/cancel`)
        fetchUserData()
      } catch (error) {
        console.error('Failed to cancel request:', error)
        alert(error.response?.data?.error || 'Failed to cancel request')
      }
    }
  }

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value
    setSelectedEmployee(employees.find(e => e.id === parseInt(employeeId)))
    if (employeeId) {
      fetchLeaveBalance(employeeId)
    } else {
      setLeaveBalance(null)
    }
  }

  const handleUpdateBalance = async (e) => {
    e.preventDefault()
    if (!selectedEmployee) return

    try {
      await api.put(`/leave/balance/${selectedEmployee.id}`, balanceFormData)
      setShowBalanceModal(false)
      fetchLeaveBalance(selectedEmployee.id)
      setBalanceFormData({
        vacation_days: '',
        sick_days: '',
        flexible_days: ''
      })
    } catch (error) {
      console.error('Failed to update balance:', error)
    }
  }

  const openBalanceModal = () => {
    if (leaveBalance) {
      setBalanceFormData({
        vacation_days: leaveBalance.vacation_days.toString(),
        sick_days: leaveBalance.sick_days.toString(),
        flexible_days: leaveBalance.flexible_days.toString()
      })
    }
    setShowBalanceModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745'
      case 'denied': return '#dc3545'
      case 'cancelled': return '#6c757d'
      case 'pending': return '#ffc107'
      default: return '#6c757d'
    }
  }

  return (
    <div>
      <div className="flex justify-between mb-2">
        <h2>Time Off Management</h2>
        <div className="flex">
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <button 
              className="btn btn-primary" 
              onClick={openBalanceModal}
              disabled={!selectedEmployee}
              style={{ marginRight: '10px', opacity: !selectedEmployee ? 0.5 : 1 }}
            >
              Update Leave Balance
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
            Request Time Off
          </button>
        </div>
      </div>

      {(user?.role === 'manager' || user?.role === 'admin') && (
        <div className="card mb-2">
          <div className="form-group">
            <label>Select Employee</label>
            <select value={selectedEmployee?.id || ''} onChange={handleEmployeeChange}>
              <option value="">-- Select an Employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {leaveBalance && (
        <div className="card mb-2">
          <div className="flex justify-between mb-2">
            <h3>Leave Balance - {selectedEmployee?.first_name || 'Current'} {selectedEmployee?.last_name || ''}</h3>
            <button 
              className="btn" 
              onClick={handleRefreshBalance}
              title="Refresh balance"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              🔄 Refresh
            </button>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '20px',
            marginTop: '15px'
          }}>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#1976d2', marginBottom: '10px' }}>Vacation Days</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                {leaveBalance.vacation_days}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {(leaveBalance.vacation_days * 8).toFixed(0)} hours
              </p>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#ffebee', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#d32f2f', marginBottom: '10px' }}>Sick Hours</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#d32f2f' }}>
                {leaveBalance.sick_days}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {(leaveBalance.sick_days / 8).toFixed(1)} days
              </p>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#f57c00', marginBottom: '10px' }}>Flexible Hours</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>
                {leaveBalance.flexible_days}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {(leaveBalance.flexible_days / 8).toFixed(1)} days
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Time Off Requests</h3>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Hours/Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.first_name} {request.last_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{request.leave_type}</td>
                <td>
                  {request.start_date ? (() => {
                    try {
                      // Handle various date formats from backend
                      const dateStr = request.start_date.toString()
                      if (dateStr.length === 10 && dateStr.includes('-')) {
                        const [year, month, day] = dateStr.split('-').map(Number)
                        return format(new Date(year, month - 1, day), 'MMM dd, yyyy')
                      }
                      // Fallback for ISO format
                      const date = new Date(dateStr)
                      if (!isNaN(date.getTime())) {
                        return format(date, 'MMM dd, yyyy')
                      }
                    } catch (e) {
                      console.error('Date parse error:', e)
                    }
                    return '-'
                  })() : '-'}
                </td>
                <td>
                  {request.end_date ? (() => {
                    try {
                      const dateStr = request.end_date.toString()
                      if (dateStr.length === 10 && dateStr.includes('-')) {
                        const [year, month, day] = dateStr.split('-').map(Number)
                        return format(new Date(year, month - 1, day), 'MMM dd, yyyy')
                      }
                      const date = new Date(dateStr)
                      if (!isNaN(date.getTime())) {
                        return format(date, 'MMM dd, yyyy')
                      }
                    } catch (e) {
                      console.error('Date parse error:', e)
                    }
                    return '-'
                  })() : '-'}
                </td>
                <td>
                  {request.leave_type && request.leave_type.toLowerCase() === 'vacation'
                    ? `${(request.days_requested || 0) / 8} days`
                    : `${request.days_requested || 0} hrs`}
                </td>
                <td style={{ maxWidth: '200px', fontSize: '13px' }}>
                  {request.reason || '-'}
                </td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: getStatusColor(request.status),
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {request.status}
                  </span>
                </td>
                <td>
                  {request.status === 'pending' && (user?.role === 'manager' || user?.role === 'admin') && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleReview(request.id, 'approved')}
                        style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleReview(request.id, 'denied')}
                        style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {(request.status === 'pending' || request.status === 'approved') && (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(request.id)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  )}
                  {request.status === 'cancelled' && (
                    <span style={{ color: '#999', fontSize: '12px' }}>Cancelled</span>
                  )}
                  {request.status === 'denied' && (
                    <span style={{ color: '#999', fontSize: '12px' }}>Denied</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No time off requests
          </p>
        )}
      </div>

      {showRequestModal && (
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
            <h3>Request Time Off</h3>
            
            <form onSubmit={handleSubmitRequest} className="mt-2">
              {(user?.role === 'manager' || user?.role === 'admin') && (
                <div className="form-group">
                  <label>Employee</label>
                  <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
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
              )}

              <div className="form-group">
                <label>Leave Type</label>
                <select
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
              </div>

              {formData.start_date && formData.end_date && (
                <div className="form-group">
                  <label>Date Range Preview</label>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
                    {formData.start_date} to {formData.end_date} 
                    ({Math.round((new Date(formData.end_date + 'T00:00:00') - new Date(formData.start_date + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1} days)
                  </p>
                </div>
              )}

              {(formData.leave_type === 'sick' || formData.leave_type === 'flexible') && (
                <>
                  <div className="form-group">
                    <label>Time Off Type</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="time_type"
                          checked={formData.is_full_day}
                          onChange={() => setFormData({...formData, is_full_day: true})}
                          style={{ width: 'auto' }}
                        />
                        Full Day (8 hours)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="time_type"
                          checked={!formData.is_full_day}
                          onChange={() => setFormData({...formData, is_full_day: false})}
                          style={{ width: 'auto' }}
                        />
                        Custom Hours
                      </label>
                    </div>
                  </div>

                  {!formData.is_full_day && (
                    <div className="form-group">
                      <label>Hours Requested</label>
                      <input
                        type="number"
                        name="hours_requested"
                        value={formData.hours_requested}
                        onChange={(e) => setFormData({...formData, hours_requested: e.target.value})}
                        min="0.5"
                        max="24"
                        step="0.5"
                        placeholder="e.g., 2, 4, 6"
                        required
                        style={{ width: '150px' }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        Minimum 0.5 hours, maximum 24 hours
                      </p>
                    </div>
                  )}
                </>
              )}

              {formData.leave_type === 'vacation' && (
                <div className="form-group">
                  <label>Days Requested</label>
                  <input
                    type="number"
                    value={formData.start_date && formData.end_date 
                      ? Math.round((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24)) + 1
                      : ''}
                    disabled
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Based on start and end dates (8 hours per day)
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows="3"
                  placeholder="Optional reason for time off request..."
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowRequestModal(false)
                    setFormData({
                      employee_id: '',
                      start_date: '',
                      end_date: '',
                      leave_type: 'vacation',
                      reason: '',
                      is_full_day: true,
                      hours_requested: ''
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBalanceModal && (
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
            <h3>Update Leave Balance - {selectedEmployee?.first_name} {selectedEmployee?.last_name}</h3>
            
            <form onSubmit={handleUpdateBalance} className="mt-2">
              <div className="form-group">
                <label>Vacation Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={balanceFormData.vacation_days}
                  onChange={(e) => setBalanceFormData({...balanceFormData, vacation_days: e.target.value})}
                  placeholder="e.g., 10"
                />
              </div>

              <div className="form-group">
                <label>Sick Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={balanceFormData.sick_days}
                  onChange={(e) => setBalanceFormData({...balanceFormData, sick_days: e.target.value})}
                  placeholder="e.g., 5"
                />
              </div>

              <div className="form-group">
                <label>Flexible Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={balanceFormData.flexible_days}
                  onChange={(e) => setBalanceFormData({...balanceFormData, flexible_days: e.target.value})}
                  placeholder="e.g., 3"
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setShowBalanceModal(false)
                    setBalanceFormData({
                      vacation_days: '',
                      sick_days: '',
                      flexible_days: ''
                    })
                  }}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeOff
