import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailClientId = process.env.GMAIL_CLIENT_ID;
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
const gmailFromName = process.env.GMAIL_FROM_NAME || "Sistema de Reservas UAI";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: gmailUser,
    clientId: gmailClientId,
    clientSecret: gmailClientSecret,
    refreshToken: gmailRefreshToken,
  },
});

export async function POST(req: Request) {
  try {
    const {
      studentEmail,
      professorEmail,
      studentName,
      professorName,
      day,
      startTime,
      duration,
      modality,
      location,
    } = await req.json();

    if (!studentEmail || !professorEmail) {
      return NextResponse.json(
        { error: "Faltan correos de estudiante o profesor" },
        { status: 400 }
      );
    }

    if (!gmailUser || !gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
      console.error("❌ Faltan variables de entorno de Gmail OAuth2");
      return NextResponse.json(
        { error: "Configuración de correo incompleta" },
        { status: 500 }
      );
    }

    const from = `"${gmailFromName}" <${gmailUser}>`;

    const baseInfo = `
Día: ${day}
Hora: ${startTime}
Duración: ${duration} minutos
Modalidad: ${modality}
Lugar / enlace: ${location}
    `.trim();

    // 📩 Estudiante
    await transporter.sendMail({
      from,
      to: studentEmail,
      subject: "Confirmación de reserva de consulta",
      text: `
Hola ${studentName || "estudiante"},

Tu reserva de consulta con ${professorName || "tu profesor/a"} ha sido confirmada.

${baseInfo}

Si no puedes asistir, por favor cancela la reserva en el sistema.
      `.trim(),
    });

    // 📩 Profesor
    await transporter.sendMail({
      from,
      to: professorEmail,
      subject: "Nueva reserva de consulta",
      text: `
Hola ${professorName || "profesor/a"},

El/la estudiante ${studentName || "un/a estudiante"} ha reservado una consulta contigo.

${baseInfo}

Puedes revisarla y gestionarla en tu panel de profesor.
      `.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("💥 Error en /api/send-reservation-email:", error);
    return NextResponse.json(
      { error: "Error enviando correos", details: error.message },
      { status: 500 }
    );
  }
}
