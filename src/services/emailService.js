import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {string} to — adresse email du destinataire
 * @param {string} resetUrl — URL complète de réinitialisation
 */
export async function sendResetPasswordEmail(to, resetUrl) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h2 style="color:#1F4E79;">Smart-Yield</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
        <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}"
               style="background:#4F8AFF;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Réinitialiser mon mot de passe
            </a>
        </div>
        <p style="color:#888;font-size:13px;">Ce lien est valide pendant 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:11px;">Smart-Yield — Application de gestion de production</p>
    </div>`;

    await transporter.sendMail({
        from: `"Smart-Yield" <${process.env.SMTP_USER}>`,
        to,
        subject: "Réinitialisation de votre mot de passe — Smart-Yield",
        html,
    });
}
