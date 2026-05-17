import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Función simple para cargar .env.local sin depender de dotenv
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const QuestionSchema = new mongoose.Schema({
  tenantId: String,
  module: String,
  source: String,
  questionText: String,
  options: [String],
  correctOptionIndex: Number,
  explanation: String,
  difficulty: String,
  active: Boolean,
  tags: [String],
}, { timestamps: true });

const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);

async function seed() {
  try {
    console.log('🚀 Starting seed process...');
    await mongoose.connect(MONGODB_URI);
    console.log('📡 Connected to MongoDB');

    const questionsData = [
      {
        questionText: "¿Cuál es el método de atribución de valor más fiable para medir el impacto de la IA?",
        options: [
          "A) Expert Estimation",
          "B) A/B Testing",
          "C) Before/After",
          "D) Principal Component Analysis (PCA)"
        ],
        correctOptionIndex: 1,
        explanation: "El A/B Testing tiene una fiabilidad del 92% y es considerado el 'gold standard' porque asigna aleatoriamente grupos de control y tratamiento, aislando perfectamente el efecto de la IA frente a otras variables.",
        module: "Módulo 1",
        source: "Apuntes clase 3.1_Identificacion de metricas clave.pdf",
        difficulty: "medium",
        active: true,
        tenantId: DEFAULT_TENANT,
        tags: ["IA", "Métricas"]
      }
    ];

    for (const q of questionsData) {
      await Question.findOneAndUpdate(
        { questionText: q.questionText, tenantId: q.tenantId },
        q,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
