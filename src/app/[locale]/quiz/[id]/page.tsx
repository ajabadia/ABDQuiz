import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig'; // Importamos para registrar el modelo en Mongoose
import { notFound } from 'next/navigation';
import QuizInterface from '@/components/quiz/QuizInterface';
import { withTenantContext } from '@ajabadia/satellite-sdk';
import { getIndustrialSession } from '@ajabadia/satellite-sdk';

interface QuizPageProps {
  params: Promise<{ id: string; locale: string }>;
}

/**
 * Server Component que recupera el estado del examen e inyecta la interfaz de cliente
 */
export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  
  return withTenantContext(async () => {
    const session = await getIndustrialSession();
    if (!session?.user?.id) return notFound();

    const attempt = await ExamAttempt.findOne({ _id: id, userId: session.user.id }).populate('examConfigId').lean();

    if (!attempt || attempt.status !== 'in_progress') {
      return notFound();
    }

    interface SerializedQuestion {
      questionSnapshot?: {
        correctOptionIndex?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }

    // Convertir IDs de MongoDB a strings para el Client Component
    const serializedAttempt = JSON.parse(JSON.stringify(attempt));
    
    // Ocultar correctOptionIndex para evitar fugas de información
    const questions = serializedAttempt.questions as SerializedQuestion[] | undefined;
    if (questions) {
      questions.forEach((q) => {
        if (q.questionSnapshot) {
          delete q.questionSnapshot.correctOptionIndex;
        }
      });
    }

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <QuizInterface initialAttempt={serializedAttempt} />
      </main>
    );
  });
}
