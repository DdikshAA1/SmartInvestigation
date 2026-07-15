import { Router, type IRouter } from "express";
import { db, conversations, messages, alertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendEmailNotification(subject: string, text: string) {
  const recipient = "dikshar1123@gmail.com";
  console.log(`[EMAIL NOTIFICATION TO ${recipient}]: ${subject}\nContent: ${text}`);

  if (!transporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await testTransporter.sendMail({
        from: '"Vanguard Alert System" <no-reply@vanguard-intel.com>',
        to: recipient,
        subject,
        text,
      });
      console.log(`[Email Alert Sent (Ethereal test)]: Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (e) {
      console.error("Failed to send email alert via mock Ethereal SMTP:", e);
    }
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Vanguard AI Alert"}" <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
      to: recipient,
      subject,
      text,
    });
    console.log(`[Email Alert Sent successfully]: MessageID: ${info.messageId}`);
  } catch (err) {
    console.error("Failed to send email alert via configured SMTP:", err);
  }
}

// ==========================================
// Local Rule-Based Chatbot Intake Tree
// ==========================================
function getLocalChatbotReply(userMessage: string, messageCount: number, history: any[]): string {
  const msg = userMessage.toLowerCase();

  // Detect language and dialect (Hindi, Hinglish, English)
  const HINGLISH_INDICATORS = [
    "bhai", "hai", "mujhe", "kuch", "mai", "mera", "hu", "tha", "ko", "se", "kar", 
    "naam", "hum", "police", "madad", "help", "cyber", "paisa", "chori", "bank", 
    "account", "phish", "darr", "dhamki", "mara", "gali", "paise", "nikal", "link", 
    "kho", "khoya", "dhokha", "thagi", "kya", "kaise", "kab", "kaha"
  ];
  
  const isHindiScript = /[\u0900-\u097F]/.test(userMessage);
  const isHinglish = HINGLISH_INDICATORS.some(word => msg.includes(word));
  
  const criticalKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife", "safety", "emergency", "blood", "attack"];
  const suspectKeywords = ["name", "suspect", "identity", "who", "alias", "associate", "profile", "mitnick", "ivanov", "petrova", "person", "look like"];
  const evidenceKeywords = ["file", "photo", "image", "proof", "screenshot", "video", "document", "record", "receipt", "chat log"];
  const locationKeywords = ["where", "location", "address", "city", "place", "street", "house", "near"];
  const greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"];

  const hasGreeting = greetings.some(word => msg.includes(word));
  const isCritical = criticalKeywords.some(word => msg.includes(word));
  const hasSuspect = suspectKeywords.some(word => msg.includes(word));
  const hasEvidence = evidenceKeywords.some(word => msg.includes(word));
  const hasLocation = locationKeywords.some(word => msg.includes(word));

  const randomOf = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // 1. GREETING/WELCOME STAGE
  if (messageCount === 0 && hasGreeting) {
    if (isHindiScript) {
      return "नमस्ते। यह गोपनीय रिपोर्टिंग प्रणाली है। आपका कनेक्शन पूरी तरह से सुरक्षित है। कृपया घटना का विवरण साझा करें, जैसे कि क्या और कब हुआ था।";
    }
    if (isHinglish) {
      return "Namaste. Ye confidential intake unit hai. Aapka connection fully encrypted aur safe hai. Please incident ki details share karein, jaise kab aur kya hua tha.";
    }
    return "Hello. This is the Secure Intake Unit. Your connection is fully encrypted. Please describe the incident you would like to report, including any details you remember.";
  }

  // 2. CRITICAL / EMERGENCY WARNINGS & REAL HELPFUL NUMBERS
  if (isCritical) {
    if (isHindiScript) {
      return "आपकी सुरक्षा सबसे महत्वपूर्ण है। यदि आप तत्काल खतरे में हैं, तो कृपया तुरंत किसी सुरक्षित स्थान पर जाएं और आपातकालीन हॉटलाइन (112 या स्थानीय पुलिस) पर कॉल करें। यदि यह ऑनलाइन वित्तीय धोखाधड़ी है, तो तत्काल वित्तीय लेनदेन को फ्रीज करने के लिए तुरंत 1930 पर कॉल करें। हमने इस रिपोर्ट को अत्यंत महत्वपूर्ण चिह्नित किया है। क्या आप अपनी वर्तमान स्थिति साझा कर सकते हैं?";
    }
    if (isHinglish) {
      return "AAPKI SAFETY SABSE PEHLE HAI. Agar aap active danger me hain toh please turant safe jagah par jayein aur police helpline 112 par call karein. Agar ye online financial fraud (paise ki thagi) hai, toh turant 1930 call karein taaki transactions freeze ho sakein. Humne is report ko critical priority par mark kiya hai. Kya aap apni location share kar sakte hain?";
    }
    return "YOUR IMMEDIATE SAFETY IS MOST IMPORTANT. If you are in active danger, please go to a safe location right away and call emergency hotlines (112 or local police). If this is an active financial cyber fraud, call 1930 immediately to freeze transactions. We have flagged this report as a CRITICAL case. Can you share where you are right now?";
  }

  // 3. SUSPECT SPECIFICS
  if (hasSuspect) {
    if (isHindiScript) {
      return "संदेही की जानकारी अत्यंत गोपनीय रखी जाएगी। क्या आपके पास संदेही का कोई विवरण, उपयोगकर्ता नाम (username) या संपर्क जानकारी (फ़ोन/ईमेल) है? इससे हमारी टीम को जांच में सहायता मिलेगी।";
    }
    if (isHinglish) {
      return "Suspect ki details confidential rakhi jayengi. Kya aapke paas suspect ka physical appearance, username, ya contact number/email hai? Isse cyber cell ko unhe trace karne me madad melega.";
    }
    return "Understood. Suspect details are strictly confidential. Do you have a physical description, username, alias, or contact information (phone/email) we should document? This helps our cyber cells track them down.";
  }

  // 4. EVIDENCE INSTRUCTIONS
  if (hasEvidence) {
    if (isHindiScript) {
      return "साक्ष्य अत्यंत महत्वपूर्ण हैं। कृपया सभी स्क्रीनशॉट, चैट लॉग, लिंक या रसीदें सुरक्षित रखें। उन्हें हटाए नहीं। जांच अधिकारी आपसे ये सुरक्षित तरीके से एकत्र करेंगे। आप cybercrime.gov.in पर भी शिकायत दर्ज कर सकते हैं।";
    }
    if (isHinglish) {
      return "Screenshots, chat logs aur receipts bohot zaroori saboot hote hain. Please inko delete mat karein aur safe rakhein. Aap cybercrime.gov.in par bhi ise darj kar sakte hain.";
    }
    return "Evidence is vital. Please save all screenshots, chat logs, links, or receipts. Do not delete them. Our investigation team will request them securely once assigned. You can also file details at cybercrime.gov.in.";
  }

  // 5. GEOGRAPHIC LOCATION
  if (hasLocation) {
    if (isHindiScript) {
      return "स्थान की जानकारी दर्ज कर ली गई है। इससे स्थानीय पुलिस टीम को मदद मिलती है। क्या उस स्थान पर कोई सुरक्षा कैमरे (CCTV) उपलब्ध थे, या यह अपराध पूरी तरह से ऑनलाइन हुआ था?";
    }
    if (isHinglish) {
      return "Location note kar li gayi hai. Isse local teams ko cyber cell intelligence map karne me madad milti hai. Kya wahan aas-paas koi CCTV camera tha, ya ye incident online hua?";
    }
    return "Thank you for sharing the location. This helps our geographic intelligence mapping. Do you know if there are security cameras (CCTV) at this location, or was the crime entirely online?";
  }

  // 6. GENERAL FOLLOWUPS / RANDOM EMOTIONAL INTELLIGENCE
  if (isHindiScript) {
    const hindiFollowups = [
      "मैं यह जानकारी दर्ज कर रहा हूँ। कृपया मुझे और विवरण बताएं कि इसके बाद क्या हुआ। वित्तीय धोखाधड़ी के लिए तुरंत 1930 पर कॉल करें।",
      "विवरण दर्ज कर लिया गया है। एक जांच अधिकारी इसकी समीक्षा कर रहा है। कृपया कोई अन्य तथ्य साझा करें जो आप महत्वपूर्ण महसूस करते हैं।",
      "धन्यवाद। यदि आप चाहते हैं कि हमारी टीम आपसे संपर्क करे, तो आप एक सुरक्षित ईमेल या फोन नंबर साझा कर सकते हैं।"
    ];
    return randomOf(hindiFollowups);
  }
  
  if (isHinglish) {
    const hinglishFollowups = [
      "Main ye details note kar raha hoon. Aage kya hua? Aur agar paise ki thagi (cyber fraud) hui hai toh turant 1930 call karein.",
      "Humne details note kar li hain. Ek officer is thread ko review kar raha hai. Safe contact email ya phone number share karein agar aap contact chahte hain, ya anonymous rahein.",
      "Got it. Please incident se judi koi bhi anjaan link ya OTP share na karein, aur screenshots safe rakhein."
    ];
    return randomOf(hinglishFollowups);
  }

  const openings = [
    "I understand this is a difficult situation, and I am here to help.",
    "Thank you for sharing this. Your safety and confidentiality are our top priorities.",
    "I appreciate you bringing this forward. Let's look into this step by step.",
    "We take this report very seriously. Thank you for reporting this securely.",
    "I hear you. Let me guide you through the process of recording this detail."
  ];

  const generalFollowups = [
    "Thank you. Please tell me more about what happened next. If this is a financial cyber fraud, please call 1930 immediately.",
    "I am capturing these details. What other details, times, or dates can you share? Remember you can file official complaints at cybercrime.gov.in.",
    "Understood. If you wish to be contacted by our team, you can share a safe email or phone number. Otherwise, your report remains completely anonymous.",
    "Details logged. An investigator is reviewing this intake thread. Please share any other facts that you feel are important.",
    "Thank you for providing this context. Is there anyone else who witnessed or was affected by this incident?"
  ];

  let reply = randomOf(generalFollowups);
  const assistantHistory = history.filter(h => h.role === "assistant").map(h => h.content);
  for (let i = 0; i < 5; i++) {
    if (!assistantHistory.includes(reply)) {
      break;
    }
    reply = randomOf(generalFollowups);
  }

  const opening = randomOf(openings);
  return `${opening} ${reply}`;
}

// ==========================================
// Check and Trigger Alerts Heuristics
// ==========================================
async function evaluateThreatAlert(conversationId: number, title: string, content: string) {
  const text = content.toLowerCase();
  const dangerKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife"];
  
  const matches = dangerKeywords.filter(keyword => text.includes(keyword));
  if (matches.length > 0) {
    try {
      await db.insert(alertsTable).values({
        title: `Confidential Report: ${title}`,
        description: `Confidential intake session #${conversationId} flagged for security review. Triggered by keywords: [${matches.join(", ")}]. Snippet: "${content.substring(0, 120)}..."`,
        severity: "critical",
        status: "active",
        source: "Confidential Chatbot Intake",
      });
    } catch (e) {
      console.error("Failed to insert confidential alert notification:", e);
    }
  }
}

// ==========================================
// API Endpoints
// ==========================================

router.get("/chat/conversations", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(conversations).orderBy(sql`${conversations.createdAt} DESC`);
    res.json(list.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // 1. Create conversation record
    const [newConv] = await db.insert(conversations).values({
      title: parsed.data.title,
    }).returning();

    // 2. Add welcome message from chatbot
    const welcomeText = "Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure. Please describe the incident you would like to report so we can alert the duty officers privately.";
    await db.insert(messages).values({
      conversationId: newConv.id,
      role: "assistant",
      content: welcomeText,
    });

    res.status(201).json({
      ...newConv,
      createdAt: newConv.createdAt.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const conversationId = Number(req.params.id);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  try {
    // Check if conversation exists
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conv) {
      // Auto-create conversation to support serverless environment shift
      await db.insert(conversations).values({
        id: conversationId,
        title: `Confidential Report #${conversationId}`,
      });
      // Add welcome message
      const welcomeText = "Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure. Please describe the incident you would like to report so we can alert the duty officers privately.";
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: welcomeText,
      });
    }

    const list = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
    res.json(list.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString()
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const conversationId = Number(req.params.id);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userContent = parsed.data.content;

  try {
    // 1. Fetch conversation details or auto-provision if shifted
    let [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conv) {
      const [newConv] = await db.insert(conversations).values({
        id: conversationId,
        title: `Confidential Report #${conversationId}`,
      }).returning();
      conv = newConv;

      const welcomeText = "Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure. Please describe the incident you would like to report so we can alert the duty officers privately.";
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: welcomeText,
      });
    }

    // 2. Save user message to database
    const [userMessage] = await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userContent,
    }).returning();

    // 3. Trigger heuristics to insert high-severity alerts in db if needed
    await evaluateThreatAlert(conversationId, conv.title, userContent);

    // Asynchronously dispatch Email Notification to dikshar1123@gmail.com
    const criticalWords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife", "safety", "emergency", "suicide", "murder"];
    const isUrgentMsg = criticalWords.some(kw => userContent.toLowerCase().includes(kw));
    const mailSubject = `${isUrgentMsg ? "🚨 URGENT ALERT: " : ""}New Secure Intake Message (Session #${conversationId})`;
    const mailText = `
Intake Session Alert - Vanguard Intel Platform
------------------------------------------------
Intake Session Title: ${conv.title} (ID: ${conversationId})
Timestamp: ${new Date().toLocaleString()}

User Message Content:
"${userContent}"

Threat Analysis:
- Priority: ${isUrgentMsg ? "HIGH / URGENT (Immediate Action Required)" : "Standard Baseline Information"}
- Threat Keywords Triggered: ${isUrgentMsg ? "Yes" : "No"}

To view this full secure thread, please check the Vanguard Admin Dashboard.
`;
    // Fire-and-forget email dispatch so it doesn't block client response time
    sendEmailNotification(mailSubject, mailText).catch(err => {
      console.error("Async email dispatch failed:", err);
    });

    // 4. Fetch entire thread history for AI context
    const history = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);

    // 5. Generate reply via OpenAI or Local Fallback
    let replyContent = "";
    try {
      const messagesPrompt = [
        {
          role: "system" as const,
          content: `You are Vanguard Secure Intake Assistant, a highly supportive, empathetic, and professional AI virtual assistant for a Crime Investigation Department.
A citizen is reporting a crime or sharing a tip in absolute confidence.

INSTRUCTIONS:
1. LANGUAGE IDENTIFICATION & ALIGNMENT: You MUST speak in the exact same language or dialect that the user is using (e.g. if the user uses Hinglish, reply in Hinglish; if Hindi script, reply in Hindi script; if English, reply in English).
2. ACTUAL HELP & GUIDELINES: Provide real, practical assistance. If it is online financial cyber fraud, direct them to immediately call 1930 or visit cybercrime.gov.in. If it is personal safety threat or harassment, direct them to emergency hotlines (112 or local police).
3. UNDERSTAND CONTEXT DEEPNESS: Carefully analyze the emotional tone, severity, and specific details of every sentence the user sends. Show genuine care and reassure them that this channel is fully encrypted, secure, and private.
4. DYNAMIC & NATURAL CONVERSATION: Never repeat static phrases or respond mechanically. Keep the tone human-like, comforting, and direct. Do not paste generic replies.
5. INTEL GATHERING: Gently ask follow-up questions to gather:
   - Nature of the incident (what occurred)
   - Date, time, and location
   - Suspect descriptions, aliases, or contact handles
   - Available evidence (such as screenshots, chats, documents)
   - A safe contact method (if they want to be reached, otherwise reassure anonymity)
6. CONCISE & TARGETED: Keep replies concise (2-4 sentences max), comforting, and professional.`
        },
        ...history.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 500,
        messages: messagesPrompt,
      });
      replyContent = response.choices[0]?.message?.content ?? "";
    } catch (aiErr) {
      replyContent = getLocalChatbotReply(userContent, history.length - 1, history);
    }

    // 6. Save chatbot reply to database
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: replyContent,
    });

    res.status(201).json({
      ...userMessage,
      createdAt: userMessage.createdAt.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process message exchange" });
  }
});

export default router;
