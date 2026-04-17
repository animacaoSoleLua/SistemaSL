import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Get members
    const members = await prisma.user.findMany({
      take: 15
    });
    
    console.log(`Found ${members.length} members`);
    
    if (members.length === 0) {
      console.error('No members found!');
      process.exit(1);
    }
    
    const instructor = members[0];
    const toEnroll = members.slice(0, 10);
    
    // Create course
    const courseId = randomUUID();
    const course = await prisma.course.create({
      data: {
        id: courseId,
        createdBy: instructor.id,
        instructorId: instructor.id,
        title: 'Test Course with Enrolled Members',
        description: 'A course for testing the enrolled members feature',
        courseDate: new Date('2026-05-15T10:00:00Z'),
        location: 'Test Room',
        capacity: 30,
      }
    });
    
    console.log(`Created course: ${course.title}`);
    
    // Enroll members
    for (const member of toEnroll) {
      await prisma.courseEnrollment.create({
        data: {
          id: randomUUID(),
          courseId: courseId,
          memberId: member.id,
          status: 'enrolled'
        }
      });
      console.log(`  Enrolled: ${member.name} ${member.lastName || ''}`);
    }
    
    console.log(`\nTotal enrolled: ${toEnroll.length}`);
    console.log(`Course ID: ${courseId}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
