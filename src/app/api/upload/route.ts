/**
 * @purpose Gestiona subidas de archivos para la aplicación ABDQuiz, incluyendo validación de tipos MIME y tamaño de archivo, generación de nombres únicos y guardado de archivos en una carpeta designada.
 * @purpose_en Handles file uploads for the ABDQuiz application, including validation of MIME types and file size, generating unique filenames, and saving files to a designated directory.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1dwr8qo
 * @lastUpdated 2026-06-23T16:47:54.910Z
 */

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { rateLimitMongodb } from '@ajabadia/satellite-sdk';

// ── Allowed MIME types ─────────────────────────────────
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    // 🚦 Rate limit uploads: 10 per 60s per IP
    const ip = rateLimitMongodb.getClientIpFromRequest(request);
    const allowed = await rateLimitMongodb.check(ip, 'api', 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    // Validar tipo MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}. Formatos aceptados: PNG, JPEG, GIF, WebP, SVG, PDF, MP3, WAV, OGG, MP4, WebM, TXT.` },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el límite de 10 MB.` },
        { status: 400 }
      );
    }

    // Generar nombre único
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.bin';
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedName}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const url = `/uploads/questions/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('❌ [UPLOAD_ERROR]:', error);
    return NextResponse.json({ error: 'Error interno al subir el archivo.' }, { status: 500 });
  }
}
