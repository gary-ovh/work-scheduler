import { useState, useEffect } from 'react'
import api from '../api'
import Teams from './Teams'

function Settings({ onLogout }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.id, role: payload.role })
      } catch (error) {
        console.error('Failed to decode token:', error)
      }
    }
  }, [])

  const canManageTeams = user?.role === 'manager' || user?.role === 'admin'

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      })
    }
  }

  return (
    <div>
      <h2 className="mb-2">Account Settings</h2>

      <div className="card" style={{ maxWidth: '500px' }}>
        <h3>Change Password</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Update your login password
        </p>

        {message.text && (
          <div style={{
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'error' ? '#f8d7da' : '#e2e3e5',
            color: message.type === 'success' ? '#155724' : message.type === 'error' ? '#721c24' : '#383d41'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
              placeholder="Enter current password"
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
              placeholder="Enter new password"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Update Password
          </button>
        </form>
      </div>

      {canManageTeams && (
        <div style={{ marginTop: '30px' }}>
          <Teams />
        </div>
      )}
    </div>
  )
}

export default Settings
