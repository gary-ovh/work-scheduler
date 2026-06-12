const pool = require('../config/database');

const getAllTemplates = async (req, res) => {
  try {
    const { is_active } = req.query;
    
    let query = 'SELECT * FROM shift_templates';
    const values = [];

    if (is_active !== undefined) {
      query += ' WHERE is_active = $1';
      values.push(is_active === 'true');
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM shift_templates WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

const createTemplate = async (req, res) => {
  try {
    let { name, start_time, end_time, position, color, created_by } = req.body;

    // Ensure times are in HH:MM:SS format
    if (start_time && start_time.length === 5) start_time += ':00';
    if (end_time && end_time.length === 5) end_time += ':00';

    if (new Date(`2000-01-01 ${start_time}`) >= new Date(`2000-01-01 ${end_time}`)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const result = await pool.query(
      'INSERT INTO shift_templates (name, start_time, end_time, position, color, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, start_time, end_time, position, color || '#007bff', created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, position, color, is_active } = req.body;

    const result = await pool.query(
      `UPDATE shift_templates 
       SET name = COALESCE($1, name), 
           start_time = COALESCE($2, start_time), 
           end_time = COALESCE($3, end_time), 
           position = COALESCE($4, position), 
           color = COALESCE($5, color), 
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [name, start_time, end_time, position, color, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM shift_templates WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

const applyTemplate = async (req, res) => {
  try {
    const { template_id, employee_id, date, position } = req.body;

    if (!template_id || !employee_id || !date) {
      return res.status(400).json({ error: 'Template ID, employee ID, and date are required' });
    }

    const templateResult = await pool.query(
      'SELECT * FROM shift_templates WHERE id = $1',
      [template_id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    const startDate = new Date(date);
    const startTime = template.start_time;
    const endTime = template.end_time;

    const [startHour, startMinute, startSecond] = startTime.split(':');
    const [endHour, endMinute, endSecond] = endTime.split(':');

    const shiftStart = new Date(startDate);
    shiftStart.setHours(parseInt(startHour), parseInt(startMinute), parseInt(startSecond || 0));

    const shiftEnd = new Date(startDate);
    shiftEnd.setHours(parseInt(endHour), parseInt(endMinute), parseInt(endSecond || 0));

    if (shiftEnd < shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    // Format as local datetime string WITHOUT timezone indicator
    // PostgreSQL TIMESTAMP without timezone will store it as-is
    const formatLocal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const result = await pool.query(
      'INSERT INTO shifts (employee_id, start_time, end_time, position, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, formatLocal(shiftStart), formatLocal(shiftEnd), position || template.position, 'scheduled']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
};

const applyTemplateToWeek = async (req, res) => {
  try {
    const { template_id, employee_id, week_start_date, positions } = req.body;

    if (!template_id || !employee_id || !week_start_date) {
      return res.status(400).json({ error: 'Template ID, employee ID, and week start date are required' });
    }

    const templateResult = await pool.query(
      'SELECT * FROM shift_templates WHERE id = $1',
      [template_id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    const weekStart = new Date(week_start_date);
    const createdShifts = [];

    const positionsArray = positions || [template.position];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + i);

      const startTime = template.start_time;
      const endTime = template.end_time;

      const [startHour, startMinute, startSecond] = startTime.split(':');
      const [endHour, endMinute, endSecond] = endTime.split(':');

      const shiftStart = new Date(currentDate);
      shiftStart.setHours(parseInt(startHour), parseInt(startMinute), parseInt(startSecond || 0));

      const shiftEnd = new Date(currentDate);
      shiftEnd.setHours(parseInt(endHour), parseInt(endMinute), parseInt(endSecond || 0));

      if (shiftEnd < shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }

      // Format as local time string for PostgreSQL (YYYY-MM-DD HH:MM:SS)
      const formatLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const position = positionsArray[i % positionsArray.length];

      const result = await pool.query(
        'INSERT INTO shifts (employee_id, start_time, end_time, position, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [employee_id, formatLocal(shiftStart), formatLocal(shiftEnd), position, 'scheduled']
      );

      createdShifts.push(result.rows[0]);
    }

    res.status(201).json({ created: createdShifts.length, shifts: createdShifts });
  } catch (error) {
    console.error('Apply template to week error:', error);
    res.status(500).json({ error: 'Failed to apply template to week' });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  applyTemplateToWeek
};
