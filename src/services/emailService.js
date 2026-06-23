import nodemailer from "nodemailer";

/** Les mots de passe d’application Gmail sont souvent collés avec espaces ; les retirer évite les refus SMTP. */
function smtpPass() {
    return (process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // TLS implicite sur 465, STARTTLS sinon
    auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass(),
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

    if (!process.env.SMTP_USER || !smtpPass()) {
        const err = new Error("[emailService] SMTP_USER ou SMTP_PASS manquant dans .env");
        console.error(err.message);
        throw err;
    }

    const message = {
        from: `"Smart-Yield" <${process.env.SMTP_USER}>`,
        to,
        subject: "Réinitialisation de votre mot de passe — Smart-Yield",
        html,
    };

    // Un retry simple : les erreurs SMTP transitoires (réseau) sont fréquentes
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            await transporter.sendMail(message);
            console.log(`[emailService] Email de réinitialisation envoyé à ${to}`);
            return;
        } catch (err) {
            lastErr = err;
            console.warn(`[emailService] Échec d'envoi (tentative ${attempt}/2) : ${err.message}`);
        }
    }
    throw lastErr;
}
