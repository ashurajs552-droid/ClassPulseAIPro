-- ====================================================================
-- VeriFace AI — Supabase Database Schema
-- Run this script in your Supabase Project: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL, -- Roll No / USN / Registration Number
    full_name TEXT NOT NULL,
    email TEXT,
    department TEXT DEFAULT 'Computer Science',
    face_descriptors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of 128D Float32 descriptor arrays
    avatar_url TEXT, -- Base64 thumbnail or image URL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Present', -- 'Present', 'Late', 'Excused'
    confidence_score NUMERIC(5, 2) NOT NULL, -- e.g. 98.45 (%)
    dominant_emotion TEXT NOT NULL, -- 'happy', 'neutral', 'surprised', 'sad', 'angry', etc.
    emotion_scores JSONB DEFAULT '{}'::jsonb, -- { happy: 0.92, neutral: 0.08, ... }
    snapshot_url TEXT, -- Optional snapshot at moment of verification
    device_info TEXT DEFAULT 'Webcam Client',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Fast Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON public.attendance_records(timestamp DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies (Avoids RLS 42501 "violates row-level security policy" errors)
-- Note: In production you can lock this down to authenticated admin users if needed.
DROP POLICY IF EXISTS "Public can view students" ON public.students;
CREATE POLICY "Public can view students" ON public.students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert students" ON public.students;
CREATE POLICY "Public can insert students" ON public.students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update students" ON public.students;
CREATE POLICY "Public can update students" ON public.students FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can delete students" ON public.students;
CREATE POLICY "Public can delete students" ON public.students FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public can view attendance" ON public.attendance_records;
CREATE POLICY "Public can view attendance" ON public.attendance_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert attendance" ON public.attendance_records;
CREATE POLICY "Public can insert attendance" ON public.attendance_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete attendance" ON public.attendance_records;
CREATE POLICY "Public can delete attendance" ON public.attendance_records FOR DELETE USING (true);

-- 6. Trigger for updated_at on students
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- Setup Complete! Your Supabase database is ready for VeriFace AI.
-- ====================================================================
