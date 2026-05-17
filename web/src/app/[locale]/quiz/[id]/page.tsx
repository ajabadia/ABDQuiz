import connectDB from '@/lib/database/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig'; // Importamos para registrar el modelo en Mongoose
import { notFound } from 'next/navigation';
import QuizInterface from '@/components/quiz/QuizInterface';

interface QuizPageProps {
  params: Promise<{ id: string; locale: string }>;
}

/**
 * Server Component que recupera el estado del examen e inyecta la interfaz de cliente
 */
export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  
  await connectDB();
  const attempt = await ExamAttempt.findById(id).populate('examConfigId').lean();

  if (!attempt || attempt.status !== 'in_progress') {
    return notFound();
  }

  // Convertir IDs de MongoDB a strings para el Client Component
  const serializedAttempt = JSON.parse(JSON.stringify(attempt));

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <QuizInterface initialAttempt={serializedAttempt} />
    </main>
  );
}
