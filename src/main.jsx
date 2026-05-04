import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Building2, GraduationCap, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import './styles.css';

const API = 'http://127.0.0.1:5050/api';

const blankDepartment = { name: '', building: '' };
const blankCourse = { title: '', code: '', credits: 3 };
const blankStudent = { name: '', email: '', year: 1, department: '', courses: [] };

function App() {
  const [data, setData] = useState({ departments: [], courses: [], students: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [departmentForm, setDepartmentForm] = useState(blankDepartment);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [studentForm, setStudentForm] = useState(blankStudent);
  const [editing, setEditing] = useState({ type: '', id: '' });

  async function loadDashboard() {
    setLoading(true);
    try {
      const response = await fetch(`${API}/dashboard`);
      if (!response.ok) throw new Error('Unable to load API data. Is the server and MongoDB running?');
      setData(await response.json());
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const departmentCounts = useMemo(() => {
    return data.students.reduce((counts, student) => {
      const id = student.department?._id;
      if (id) counts[id] = (counts[id] || 0) + 1;
      return counts;
    }, {});
  }, [data.students]);

  const courseCounts = useMemo(() => {
    return data.students.reduce((counts, student) => {
      student.courses.forEach((course) => {
        counts[course._id] = (counts[course._id] || 0) + 1;
      });
      return counts;
    }, {});
  }, [data.students]);

  async function saveResource(type, form) {
    const id = editing.type === type ? editing.id : '';
    const endpoint = `${API}/${type}${id ? `/${id}` : ''}`;
    const method = id ? 'PUT' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Save failed');
    }
    setEditing({ type: '', id: '' });
    await loadDashboard();
  }

  async function deleteResource(type, id) {
    const response = await fetch(`${API}/${type}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }
    await loadDashboard();
  }

  function editDepartment(department) {
    setDepartmentForm({ name: department.name, building: department.building });
    setEditing({ type: 'departments', id: department._id });
  }

  function editCourse(course) {
    setCourseForm({ title: course.title, code: course.code, credits: course.credits });
    setEditing({ type: 'courses', id: course._id });
  }

  function editStudent(student) {
    setStudentForm({
      name: student.name,
      email: student.email,
      year: student.year,
      department: student.department?._id || '',
      courses: student.courses.map((course) => course._id)
    });
    setEditing({ type: 'students', id: student._id });
  }

  function toggleCourse(courseId) {
    setStudentForm((current) => ({
      ...current,
      courses: current.courses.includes(courseId)
        ? current.courses.filter((id) => id !== courseId)
        : [...current.courses, courseId]
    }));
  }

  async function handleAction(action) {
    try {
      setMessage('');
      await action();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const editingLabel = editing.id ? 'Update' : 'Add';

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Assignment 27</p>
          <h1>MongoDB CRUD Relationships</h1>
          <p className="lede">
            React frontend with MongoDB documents showing one department to many students, and many
            students to many courses.
          </p>
        </div>
        <button className="icon-button" onClick={loadDashboard} aria-label="Refresh data" title="Refresh data">
          <RefreshCw size={20} />
        </button>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="relationship-strip" aria-label="Relationship model">
        <RelationshipCard
          icon={<Building2 />}
          title="One-to-many"
          body="Department -> Students"
          meta="Each student stores one department ObjectId."
        />
        <RelationshipCard
          icon={<Users />}
          title="Many-to-many"
          body="Students <-> Courses"
          meta="Each student stores an array of course ObjectIds."
        />
        <RelationshipCard
          icon={<BookOpen />}
          title="CRUD"
          body="Create, read, update, delete"
          meta="Forms call Express routes backed by Mongoose models."
        />
      </section>

      <section className="workspace-grid">
        <Panel
          title="Departments"
          icon={<Building2 />}
          form={
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAction(async () => {
                  await saveResource('departments', departmentForm);
                  setDepartmentForm(blankDepartment);
                });
              }}
            >
              <input
                required
                placeholder="Department name"
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
              />
              <input
                required
                placeholder="Building"
                value={departmentForm.building}
                onChange={(event) => setDepartmentForm({ ...departmentForm, building: event.target.value })}
              />
              <button type="submit">
                <Plus size={18} />
                {editing.type === 'departments' ? editingLabel : 'Add'} Department
              </button>
            </form>
          }
        >
          {data.departments.map((department) => (
            <Record key={department._id} title={department.name} subtitle={department.building}>
              <span>{departmentCounts[department._id] || 0} students</span>
              <Actions onEdit={() => editDepartment(department)} onDelete={() => handleAction(() => deleteResource('departments', department._id))} />
            </Record>
          ))}
        </Panel>

        <Panel
          title="Courses"
          icon={<BookOpen />}
          form={
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAction(async () => {
                  await saveResource('courses', courseForm);
                  setCourseForm(blankCourse);
                });
              }}
            >
              <input
                required
                placeholder="Course title"
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
              />
              <div className="inline-inputs">
                <input
                  required
                  placeholder="Code"
                  value={courseForm.code}
                  onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value.toUpperCase() })}
                />
                <input
                  required
                  type="number"
                  min="1"
                  max="6"
                  value={courseForm.credits}
                  onChange={(event) => setCourseForm({ ...courseForm, credits: Number(event.target.value) })}
                />
              </div>
              <button type="submit">
                <Plus size={18} />
                {editing.type === 'courses' ? editingLabel : 'Add'} Course
              </button>
            </form>
          }
        >
          {data.courses.map((course) => (
            <Record key={course._id} title={course.title} subtitle={`${course.code} - ${course.credits} credits`}>
              <span>{courseCounts[course._id] || 0} enrollments</span>
              <Actions onEdit={() => editCourse(course)} onDelete={() => handleAction(() => deleteResource('courses', course._id))} />
            </Record>
          ))}
        </Panel>

        <Panel
          title="Students"
          icon={<GraduationCap />}
          wide
          form={
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAction(async () => {
                  await saveResource('students', studentForm);
                  setStudentForm(blankStudent);
                });
              }}
            >
              <div className="inline-inputs three">
                <input
                  required
                  placeholder="Student name"
                  value={studentForm.name}
                  onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })}
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={studentForm.email}
                  onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })}
                />
                <input
                  required
                  type="number"
                  min="1"
                  max="4"
                  value={studentForm.year}
                  onChange={(event) => setStudentForm({ ...studentForm, year: Number(event.target.value) })}
                />
              </div>
              <select
                required
                value={studentForm.department}
                onChange={(event) => setStudentForm({ ...studentForm, department: event.target.value })}
              >
                <option value="">Choose department</option>
                {data.departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <div className="checkbox-grid">
                {data.courses.map((course) => (
                  <label key={course._id}>
                    <input
                      type="checkbox"
                      checked={studentForm.courses.includes(course._id)}
                      onChange={() => toggleCourse(course._id)}
                    />
                    {course.code}
                  </label>
                ))}
              </div>
              <button type="submit">
                <Plus size={18} />
                {editing.type === 'students' ? editingLabel : 'Add'} Student
              </button>
            </form>
          }
        >
          {loading ? (
            <p className="empty-state">Loading records...</p>
          ) : (
            data.students.map((student) => (
              <Record
                key={student._id}
                title={student.name}
                subtitle={`${student.email} - Year ${student.year}`}
              >
                <span>{student.department?.name}</span>
                <div className="chips">
                  {student.courses.map((course) => (
                    <span key={course._id}>{course.code}</span>
                  ))}
                </div>
                <Actions onEdit={() => editStudent(student)} onDelete={() => handleAction(() => deleteResource('students', student._id))} />
              </Record>
            ))
          )}
        </Panel>
      </section>
    </main>
  );
}

function RelationshipCard({ icon, title, body, meta }) {
  return (
    <article className="relationship-card">
      <div className="relationship-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <strong>{body}</strong>
        <p>{meta}</p>
      </div>
    </article>
  );
}

function Panel({ title, icon, form, children, wide = false }) {
  return (
    <section className={wide ? 'panel wide' : 'panel'}>
      <div className="panel-header">
        {icon}
        <h2>{title}</h2>
      </div>
      {form}
      <div className="records">{children}</div>
    </section>
  );
}

function Record({ title, subtitle, children }) {
  return (
    <article className="record">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="record-meta">{children}</div>
    </article>
  );
}

function Actions({ onEdit, onDelete }) {
  return (
    <div className="actions">
      <button className="icon-button small" onClick={onEdit} aria-label="Edit" title="Edit">
        <Pencil size={16} />
      </button>
      <button className="icon-button small danger" onClick={onDelete} aria-label="Delete" title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
