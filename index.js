const functions = require("firebase-functions");
const admin = require("firebase-admin");
const QRCode = require("qrcode");
const {createCanvas, loadImage} = require("canvas");
const nodemailer = require("nodemailer");
const {v4: uuidv4} = require("uuid");

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuration email (utilise le serveur SMTP 4nap.fr)
const transporter = nodemailer.createTransport({
  host: "mail.4nap.fr",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@4nap.fr",
    pass: "dE9*$FaBmwSDUBP",
  },
});

// Fonction principale pour traiter les webhooks Hello Asso
exports.processHelloAssoWebhook = functions.https.onRequest(
    async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.status(200).send("");
        return;
      }

      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      try {
        console.log("Webhook reçu:", JSON.stringify(req.body, null, 2));

        const webhookData = req.body;

        if (!webhookData.data || webhookData.eventType !== "Order") {
          console.log("Type d'événement non traité");
          res.status(200).send("Event type not processed");
          return;
        }

        const orderData = webhookData.data;
        const payer = orderData.payer;
        const mainEmail = payer.email;
        const firstName = payer.firstName;
        const lastName = payer.lastName;

        console.log(
            `Traitement commande: ${firstName} ${lastName} (${mainEmail})`
        );

        for (const item of orderData.items) {
          if (item.state === "Processed") {
            await processTicket(item, payer, orderData);
          }
        }

        res.status(200).send("Webhook processed successfully");
      } catch (error) {
        console.error("Erreur traitement webhook:", error);
        res.status(500).send("Internal Server Error");
      }
    }
);

/**
 * Traite un billet individuel
 * @param {Object} item L'item/billet
 * @param {Object} payer Le payeur
 * @param {Object} orderData Les données de la commande
 */
async function processTicket(item, payer, orderData) {
  try {
    let memberEmail = payer.email;
    const emailField = item.customFields &&
      item.customFields.find((field) =>
        field.name.toLowerCase().includes("email")
      );
    if (emailField && emailField.answer) {
      memberEmail = emailField.answer;
    }

    // Vérifier si un membre avec cet email existe déjà
    const existingMemberQuery = await db.collection("members")
        .where("email", "==", memberEmail)
        .limit(1)
        .get();

    if (!existingMemberQuery.empty) {
      console.log(`Membre avec email ${memberEmail} existe déjà - ticket ignoré`);
      return; // Membre déjà existant, on ne fait rien
    }

    // Membre n'existe pas, on procède à l'enregistrement
    const memberUid = uuidv4();

    const postalCodeField = item.customFields &&
      item.customFields.find((field) =>
        field.name.toLowerCase().includes("postal")
      );
    const postalCode = postalCodeField && postalCodeField.answer || "";

    const birthDateField = item.customFields &&
      item.customFields.find((field) =>
        field.name.toLowerCase().includes("naissance")
      );
    const birthDate = birthDateField && birthDateField.answer || "";

    const phoneField = item.customFields &&
      item.customFields.find((field) =>
        field.name.toLowerCase().includes("téléphone")
      );
    const phone = phoneField && phoneField.answer || "";

    const discoverySourceField = item.customFields &&
      item.customFields.find((field) =>
        field.name.toLowerCase().includes("connu")
      );
    const discoverySource = discoverySourceField &&
      discoverySourceField.answer || "";

    const memberDoc = {
      uid: memberUid,
      email: memberEmail,
      firstName: payer.firstName,
      lastName: payer.lastName,
      ticketType: item.name,
      postalCode: postalCode,
      birthDate: birthDate,
      phone: phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      "end-member": new Date("2025-12-31"),
      "member-type": "4nap-festival",
    };

    await db.collection("members").doc(memberUid).set(memberDoc);
    console.log(`Nouveau membre créé: ${memberUid} (${memberEmail})`);

    await generateAndSendQRCode(memberDoc);
  } catch (error) {
    console.error("Erreur traitement billet:", error);
    throw error;
  }
}

/**
 * Génère le QR code et envoie l'email
 * @param {Object} memberData Les données du membre
 */
async function generateAndSendQRCode(memberData) {
  try {
    const qrCodeData = `FORNAP-MEMBER:${memberData.uid}`;

    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

        // Créer un canvas avec les proportions de ton image (légèrement élargi)
    const canvas = createCanvas(450, 800); // Légèrement plus large
    const ctx = canvas.getContext("2d");

    // Ton image de carte de membre en background
    const backgroundImageBase64 = "base 64";
    
    // Charger ton image de background
    const backgroundImg = await loadImage(backgroundImageBase64);
    
    // Dessiner ton background exact (garder les proportions)
    ctx.drawImage(backgroundImg, 0, 0, 450, 800);

    // Générer le QR code comme image Buffer
    const qrBuffer = await QRCode.toBuffer(qrCodeData, {
      width: 190, // Ajusté pour correspondre à la taille d'affichage
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    
    // Charger le QR code
    const qrImg = await loadImage(qrBuffer);
    
    // Dessiner le QR code au centre (descendu encore)
    const qrSize = 190; // Taille ajustée par l'utilisateur
    const qrX = (450 - qrSize) / 2; // Centré sur 450px
    const qrY = 340; // Descendu encore plus
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Configuration du texte (blanc sur fond noir)
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 2; // Ombre pour mieux voir le texte
    
    // "membre annuel" (descendu encore)
    ctx.font = "bold 20px Arial";
    ctx.fillText("membre annuel", 225, 630); // Descendu encore de 30px
    
    // Date d'expiration (descendu encore)
    ctx.font = "18px Arial";
    ctx.fillText("expire le 31/12/25", 225, 660); // Descendu encore de 30px
    
    // Nom Prénom (descendu encore)
    ctx.font = "bold 22px Arial";
    ctx.fillText(`${memberData.firstName} ${memberData.lastName}`, 225, 700); // Descendu encore de 30px

    // Convertir en JPG
    const imageBuffer = canvas.toBuffer("image/jpeg", {quality: 0.9});

    const mailOptions = {
      from: "\"FORNAP Festival\" <noreply@4nap.fr>",
      to: memberData.email,
      subject: "Bienvenue au FOR+NAP social club - Fort Napoléon. La Seyne sur Mer",
            html: `
        <div style="max-width: 600px; margin: 0 auto; 
                    font-family: Arial, sans-serif; background: #000; 
                    color: #fff; padding: 30px; border-radius: 15px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fff; font-size: 2.5rem; margin: 0;">
              ◆ FOR+NAP ◆
            </h1>
            <p style="color: #ccc; font-size: 1.2rem; margin: 5px 0;">
              social club
            </p>
          </div>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Hello <strong>${memberData.firstName}</strong>,
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            <strong>Bienvenue dans la famille FOR+NAP !</strong> 🎵
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Tu viens de rejoindre bien plus qu'un simple festival - tu fais maintenant partie d'une communauté passionnée qui va transformer le Fort Napoléon en un véritable laboratoire culturel.
          </p>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #ff6b35; margin: 0 0 15px 0; font-size: 1.3rem;">🎫 Ta carte de membre inclut :</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin: 8px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #ff6b35;">◆</span>
                <strong>Accès VIP au festival 4NAP</strong> (11-14 juillet)
              </li>
              <li style="margin: 8px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #ff6b35;">◆</span>
                <strong>Entrée gratuite</strong> à tous les événements du Fort (concerts, soirées, workshops)
              </li>
              <li style="margin: 8px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #ff6b35;">◆</span>
                <strong>Tarifs préférentiels</strong> sur les consommations et produits dérivés
              </li>
              <li style="margin: 8px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #ff6b35;">◆</span>
                <strong>Accès prioritaire</strong> aux ventes de billets et préventes
              </li>
              <li style="margin: 8px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #ff6b35;">◆</span>
                <strong>Invitations exclusives</strong> aux événements privés et avant-premières
              </li>
            </ul>
          </div>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            <strong>Le projet FOR+NAP</strong> c'est 12 ans d'aventure culturelle au Fort Napoléon ! Dès septembre, ce lieu historique exceptionnel va renaître sous une nouvelle forme :
          </p>
          
          <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0;">
            <div style="flex: 1; min-width: 250px; background: #2a2a2a; padding: 15px; border-radius: 8px;">
              <h4 style="color: #ff6b35; margin: 0 0 10px 0;">🎭 Résidences d'artistes</h4>
              <p style="margin: 0; font-size: 0.95rem; color: #ccc;">
                Découvre les créations en cours, rencontre les artistes en résidence
              </p>
            </div>
            <div style="flex: 1; min-width: 250px; background: #2a2a2a; padding: 15px; border-radius: 8px;">
              <h4 style="color: #ff6b35; margin: 0 0 10px 0;">🎵 Concerts & Lives</h4>
              <p style="margin: 0; font-size: 0.95rem; color: #ccc;">
                Musique électronique, sessions acoustiques, performances live
              </p>
            </div>
            <div style="flex: 1; min-width: 250px; background: #2a2a2a; padding: 15px; border-radius: 8px;">
              <h4 style="color: #ff6b35; margin: 0 0 10px 0;">🎨 Ateliers créatifs</h4>
              <p style="margin: 0; font-size: 0.95rem; color: #ccc;">
                MAO, arts visuels, techniques du son, création collaborative
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0; background: linear-gradient(135deg, #ff6b35, #ff8a65); padding: 25px; border-radius: 15px;">
            <h3 style="color: #000; margin: 0 0 15px 0; font-size: 1.4rem;">🚀 FESTIVAL 4NAP - 11 AU 14 JUILLET</h3>
            <p style="font-size: 1.1rem; line-height: 1.6; margin: 0; color: #000;">
              <strong>4 SOIRÉES THÉMATIQUES</strong><br>
              <strong>4 UNIVERS SONORES</strong><br>
              <strong>1 EXPÉRIENCE INOUBLIABLE</strong><br><br>
              <em>Prépare-toi à vivre quelque chose d'unique dans un cadre historique exceptionnel !</em>
            </p>
          </div>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            On compte sur toi pour faire vibrer cette communauté et partager cette aventure avec tes proches. Plus on sera nombreux, plus on pourra faire de belles choses ensemble !
          </p>
          
          <div style="text-align: center; margin-top: 20px; color: #666;">
            <p>◆</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `FOR+NAP-Carte-Membre-${memberData.firstName}-` +
            `${memberData.lastName}.jpg`,
          content: imageBuffer,
          contentType: "image/jpeg",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${memberData.email}`);
  } catch (error) {
    console.error("Erreur génération/envoi QR code:", error);
    throw error;
  }
}

// Fonction pour valider un QR code
exports.validateQRCode = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).send("");
    return;
  }

  try {
    const {qrData} = req.body;

    if (!qrData || !qrData.startsWith("FORNAP-MEMBER:")) {
      res.status(400).json({valid: false, message: "QR Code invalide"});
      return;
    }

    const uid = qrData.replace("FORNAP-MEMBER:", "");
    const memberDoc = await db.collection("members").doc(uid).get();

    if (!memberDoc.exists) {
      res.status(404).json({valid: false, message: "Membre non trouvé"});
      return;
    }

    const memberData = memberDoc.data();
    res.status(200).json({
      valid: true,
      member: {
        name: `${memberData.firstName} ${memberData.lastName}`,
        email: memberData.email,
        ticketType: memberData.ticketType,
        uid: memberData.uid,
      },
    });
  } catch (error) {
    console.error("Erreur validation QR:", error);
    res.status(500).json({valid: false, message: "Erreur serveur"});
  }
});

// Fonction pour renvoyer l'email avec QR code (déclenchée depuis l'admin panel)
exports.resendMemberEmail = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({success: false, message: "Method Not Allowed"});
    return;
  }

  try {
    const {memberId, email} = req.body;

    if (!memberId && !email) {
      res.status(400).json({success: false, message: "memberId ou email requis"});
      return;
    }

    let memberDoc;
    
    // Chercher par memberId ou par email
    if (memberId) {
      memberDoc = await db.collection("members").doc(memberId).get();
    } else {
      const memberQuery = await db.collection("members")
          .where("email", "==", email)
          .limit(1)
          .get();
      
      if (!memberQuery.empty) {
        memberDoc = memberQuery.docs[0];
      }
    }

    if (!memberDoc || !memberDoc.exists) {
      res.status(404).json({success: false, message: "Membre non trouvé"});
      return;
    }

    const memberData = memberDoc.data();
    
    // Utiliser la fonction existante pour générer et envoyer l'email
    await generateAndSendQRCode(memberData);
    
    console.log(`Email renvoyé avec succès à ${memberData.email}`);
    res.status(200).json({
      success: true, 
      message: `Email renvoyé avec succès à ${memberData.email}`,
      memberEmail: memberData.email
    });

  } catch (error) {
    console.error("Erreur lors du renvoi de l'email:", error);
    res.status(500).json({success: false, message: "Erreur serveur", error: error.message});
  }
});
