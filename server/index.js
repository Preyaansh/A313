import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 5050;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/assignment27';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());
app.use(express.static(distPath));

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    building: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    credits: { type: Number, required: true, min: 1, max: 6 }
  },
  { timestamps: true }
);

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);
const Course = mongoose.model('Course', courseSchema);
const Student = mongoose.model('Student', studentSchema);

const asyncRoute = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const populateStudent = (query) => query.populate('department').populate('courses');

async function seedIfEmpty() {
  const existingDepartments = await Department.countDocuments();
  if (existingDepartments > 0) return;

  const [cs, design] = await Department.create([
    { name: 'Computer Science', building: 'Alan Turing Block' },
    { name: 'Interaction Design', building: 'Studio North' }
  ]);

  const [dbms, react, ux] = await Course.create([
    { title: 'Database Systems', code: 'DBMS301', credits: 4 },
    { title: 'React Applications', code: 'REACT220', credits: 3 },
    { title: 'User Experience Research', code: 'UX210', credits: 3 }
  ]);

  await Student.create([
    {
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      year: 3,
      department: cs._id,
      courses: [dbms._id, react._id]
    },
    {
      name: 'Nisha Rao',
      email: 'nisha@example.com',
      year: 2,
      department: design._id,
      courses: [react._id, ux._id]
    }
  ]);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [departments, courses, students] = await Promise.all([
    Department.find().sort({ name: 1 }),
    Course.find().sort({ code: 1 }),
    populateStudent(Student.find().sort({ name: 1 }))
  ]);

  res.json({ departments, courses, students });
}));

app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.post('/api/departments', asyncRoute(async (req, res) => {
  const department = await Department.create(req.body);
  res.status(201).json(department);
}));

app.put('/api/departments/:id', asyncRoute(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!department) return res.status(404).json({ message: 'Department not found' });
  res.json(department);
}));

app.delete('/api/departments/:id', asyncRoute(async (req, res) => {
  const linkedStudents = await Student.countDocuments({ department: req.params.id });
  if (linkedStudents > 0) {
    return res.status(409).json({ message: 'Move or delete students in this department first.' });
  }
  await Department.findByIdAndDelete(req.params.id);
  res.status(204).end();
}));

app.post('/api/courses', asyncRoute(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
}));

app.put('/api/courses/:id', asyncRoute(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

app.delete('/api/courses/:id', asyncRoute(async (req, res) => {
  await Student.updateMany({ courses: req.params.id }, { $pull: { courses: req.params.id } });
  await Course.findByIdAndDelete(req.params.id);
  res.status(204).end();
}));

app.post('/api/students', asyncRoute(async (req, res) => {
  const student = await Student.create(req.body);
  res.status(201).json(await populateStudent(Student.findById(student._id)));
}));

app.put('/api/students/:id', asyncRoute(async (req, res) => {
  const student = await populateStudent(
    Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  );
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
}));

app.delete('/api/students/:id', asyncRoute(async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.status(204).end();
}));

app.use((error, _req, res, _next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with that unique value already exists.' });
  }
  res.status(500).json({ message: error.message || 'Server error' });
});

mongoose
  .connect(mongoUri)
  .then(async () => {
    await seedIfEmpty();
    app.listen(port, () => {
      console.log(`API running on http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
