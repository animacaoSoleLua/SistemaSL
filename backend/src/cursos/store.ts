import { prisma } from "../db/prisma.js";

export type EnrollmentStatus = "enrolled" | "attended" | "missed";

export interface EnrollmentRecord {
  id: string;
  courseId: string;
  memberId: string;
  status: EnrollmentStatus;
  createdAt: Date;
}

export interface CourseRecord {
  id: string;
  createdBy: string;
  instructorId: string;
  instructorName: string;
  title: string;
  description?: string;
  courseDate: Date;
  location?: string;
  capacity: number;
  createdAt: Date;
  enrollments: EnrollmentRecord[];
}

export interface CreateCourseInput {
  instructorId: string;
  title: string;
  description?: string;
  courseDate: Date;
  location?: string;
  capacity: number;
}

export interface UpdateCourseInput {
  instructorId?: string;
  title?: string;
  description?: string | null;
  courseDate?: Date;
  location?: string | null;
  capacity?: number;
}

function toEnrollmentRecord(entry: {
  id: string;
  courseId: string;
  memberId: string;
  status: EnrollmentStatus;
  createdAt: Date;
}): EnrollmentRecord {
  return {
    id: entry.id,
    courseId: entry.courseId,
    memberId: entry.memberId,
    status: entry.status,
    createdAt: entry.createdAt,
  };
}

function toCourseRecord(course: {
  id: string;
  createdBy: string;
  instructorId: string;
  title: string;
  description: string | null;
  courseDate: Date;
  location: string | null;
  capacity: number | null;
  createdAt: Date;
  instructor: {
    id: string;
    name: string;
  };
  enrollments: Array<{
    id: string;
    courseId: string;
    memberId: string;
    status: EnrollmentStatus;
    createdAt: Date;
  }>;
}): CourseRecord {
  return {
    id: course.id,
    createdBy: course.createdBy,
    instructorId: course.instructorId,
    instructorName: course.instructor.name,
    title: course.title,
    description: course.description ?? undefined,
    courseDate: course.courseDate,
    location: course.location ?? undefined,
    capacity: course.capacity ?? 0,
    createdAt: course.createdAt,
    enrollments: course.enrollments.map((enrollment) =>
      toEnrollmentRecord(enrollment)
    ),
  };
}

export async function createCourse(
  createdBy: string,
  input: CreateCourseInput
): Promise<CourseRecord> {
  const course = await prisma.course.create({
    data: {
      createdBy,
      instructorId: input.instructorId,
      title: input.title,
      description: input.description,
      courseDate: input.courseDate,
      location: input.location,
      capacity: input.capacity,
    },
    include: { enrollments: true, instructor: true },
  });

  return toCourseRecord(course);
}

export async function listCourses(): Promise<CourseRecord[]> {
  const courses = await prisma.course.findMany({
    include: { enrollments: true, instructor: true },
  });
  return courses.map((course) => toCourseRecord(course));
}

export async function getCourseById(
  id: string
): Promise<CourseRecord | undefined> {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { enrollments: true, instructor: true },
  });
  return course ? toCourseRecord(course) : undefined;
}

export async function updateCourse(
  courseId: string,
  input: UpdateCourseInput
): Promise<CourseRecord> {
  const data: {
    instructorId?: string;
    title?: string;
    description?: string | null;
    courseDate?: Date;
    location?: string | null;
    capacity?: number;
  } = {};

  if (input.instructorId !== undefined) {
    data.instructorId = input.instructorId;
  }
  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.courseDate !== undefined) {
    data.courseDate = input.courseDate;
  }
  if (input.location !== undefined) {
    data.location = input.location;
  }
  if (input.capacity !== undefined) {
    data.capacity = input.capacity;
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data,
    include: { enrollments: true, instructor: true },
  });

  return toCourseRecord(updated);
}

export async function deleteCourse(courseId: string): Promise<void> {
  await prisma.course.delete({ where: { id: courseId } });
}

export function getEnrollmentByMember(
  course: CourseRecord,
  memberId: string
): EnrollmentRecord | undefined {
  return course.enrollments.find(
    (enrollment) => enrollment.memberId === memberId
  );
}

export function getEnrollmentById(
  course: CourseRecord,
  enrollmentId: string
): EnrollmentRecord | undefined {
  return course.enrollments.find(
    (enrollment) => enrollment.id === enrollmentId
  );
}

export async function addEnrollment(
  course: CourseRecord,
  memberId: string
): Promise<EnrollmentRecord> {
  const enrollment = await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      memberId,
      status: "enrolled",
    },
  });

  return toEnrollmentRecord(enrollment);
}

export async function updateEnrollmentStatus(
  enrollment: EnrollmentRecord,
  status: EnrollmentStatus
): Promise<EnrollmentRecord> {
  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollment.id },
    data: { status },
  });
  return toEnrollmentRecord(updated);
}

export async function listEnrollmentsForMember(
  memberId: string
): Promise<EnrollmentRecord[]> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { memberId },
  });
  return enrollments.map((enrollment) => toEnrollmentRecord(enrollment));
}

export async function resetCourses(): Promise<void> {
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
}
