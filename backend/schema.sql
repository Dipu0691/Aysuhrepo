-- Supabase Database Schema Setup

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL
);

-- 2. Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
  id BIGSERIAL PRIMARY KEY,
  "studentName" TEXT NOT NULL,
  grade TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  "dateSubmitted" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id BIGSERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  type TEXT DEFAULT 'Holiday'
);

-- 4. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  "isRead" BOOLEAN DEFAULT FALSE,
  "dateSubmitted" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  alt TEXT,
  "dateAdded" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- 7. Pages Table (For dynamic content)
CREATE TABLE IF NOT EXISTS pages (
  id BIGSERIAL PRIMARY KEY,
  page_name TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL
);

-- 8. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'All',
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  "studentName" TEXT NOT NULL,
  grade TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  remarks TEXT,
  entered_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Results Table
CREATE TABLE IF NOT EXISTS results (
  id BIGSERIAL PRIMARY KEY,
  "studentName" TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_term TEXT NOT NULL,
  score NUMERIC NOT NULL,
  total_marks NUMERIC NOT NULL,
  remarks TEXT,
  date_published TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Homework Table
CREATE TABLE IF NOT EXISTS homework (
  id BIGSERIAL PRIMARY KEY,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  teacher_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
