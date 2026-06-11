import { useState, useEffect } from 'react'
import api from '../api'

function Teams({ embedded = false }) {
  const [teams, setTeams] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#007bff'
  })

  useEffect(() => {
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

  const openModal = (team = null) => {
    if (team) {
      setEditingTeam(team)
      setFormData({
        name: team.name,
        description: team.description || '',
        color: team.color || '#007bff'
      })
    } else {
      setEditingTeam(null)
      setFormData({
        name: '',
        description: '',
        color: '#007bff'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTeam(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, formData)
      } else {
        await api.post('/teams', formData)
      }
      closeModal()
      fetchTeams()
    } catch (error) {
      console.error('Failed to save team:', error)
      alert('Failed to save team: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this team? Employees will be unassigned.')) {
      return
    }
    try {
      await api.delete(`/teams/${id}`)
      fetchTeams()
    } catch (error) {
      console.error('Failed to delete team:', error)
      alert('Failed to delete team')
    }
  }

  return (
    <div>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Teams Management</h2>
          <button className="btn btn-primary" onClick={() => openModal()}>
            + Add Team
          </button>
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Manage Teams</h3>
          <button className="btn btn-primary" onClick={() => openModal()}>
            + Add Team
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {teams.map(team => (
          <div 
            key={team.id} 
            className="card"
            style={{ 
              borderLeft: `4px solid ${team.color}`,
              opacity: team.is_active ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0' }}>{team.name}</h3>
                <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                  {team.description || 'No description'}
                </p>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: team.color + '20',
                  color: team.color
                }}>
                  {team.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={() => openModal(team)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(team.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Morning Team, Electronics Dept"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Optional description"
                />
              </div>
              <div className="form-group">
                <label>Team Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '50px', height: '40px', border: 'none', cursor: 'pointer' }}
                  />
                  <span>{formData.color}</span>
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  {' '}Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingTeam ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Teams
