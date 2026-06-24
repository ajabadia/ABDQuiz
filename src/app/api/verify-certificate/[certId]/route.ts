/**
 * @purpose Gestiona la solicitud GET para verificar un certificado llamando a la función `verifyCertificateAction` y devolviendo el resultado como JSON.
 * @purpose_en Handles the GET request to verify a certificate by calling the `verifyCertificateAction` function and returning the result as JSON.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1ek4abk
 * @lastUpdated 2026-06-24T12:54:26.608Z
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCertificateAction } from '@/actions/certificate-actions';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;
  const result = await verifyCertificateAction(certId);

  if (result.success) {
    return NextResponse.json(result.data);
  }

  return NextResponse.json({ error: result.error }, { status: 404 });
}
