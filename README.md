# Assignment 27 - React MongoDB CRUD Relationships

This is a MERN demo for MongoDB CRUD with:

- One-to-many: one department has many students.
- Many-to-many: students enroll in many courses, and courses contain many students.
- CRUD screens for departments, students, and courses.

## Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update `MONGODB_URI` if needed.

3. Start MongoDB locally, use a MongoDB Atlas URI, or run the included Docker database:

   ```bash
   docker compose up -d mongodb
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The React app opens at `http://127.0.0.1:5173` and the API runs at `http://127.0.0.1:5050`.

The server seeds sample data automatically when the database is empty.

## Jenkins

Create a Pipeline job named `A313`, point it at this repository, and use `Jenkinsfile` from SCM.

If Jenkins runs in Docker, build it with Docker CLI support and mount the host Docker socket:

```bash
docker build -f Jenkins.Dockerfile -t a313-jenkins .
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock a313-jenkins
```

The pipeline runs:

- `npm ci`
- `npm run check`
- `npm run build`
- Docker image build
- `docker compose up -d --build` deployment on the `main` branch

After deployment, the app is available at `http://localhost:5050`.
