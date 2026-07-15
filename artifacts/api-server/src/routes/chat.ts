import { Router, type IRouter } from "express";
import { db, conversations, messages, alertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ==========================================
// Local Rule-Based Chatbot Intake Tree
// ==========================================
function getLocalChatbotReply(userMessage: string, messageCount: number, history: any[]): string {
  const msg = userMessage.toLowerCase();

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

  const openings = [
    "I understand this is a difficult situation, and I am here to help.",
    "Thank you for sharing this. Your safety and confidentiality are our top priorities.",
    "I appreciate you bringing this forward. Let's look into this step by step.",
    "We take this report very seriously. Thank you for reporting this securely.",
    "I hear you. Let me guide you through the process of recording this detail."
  ];

  const randomOf = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (messageCount === 0 && hasGreeting) {
    const welcomeMessages = [
      "Hello. This is the Secure Intake Unit. Your connection is fully encrypted. Please describe the incident you would like to report, including any details you remember.",
      "Greetings. You have reached our secure reporting channel. Your identity is protected. What happened and when did the incident take place?",
      "Hello there. This conversation is private. Please tell me about the incident you want to report, and we will make sure it is handled by the right team."
    ];
    return randomOf(welcomeMessages);
  }

  if (isCritical) {
    const safetyReplies = [
      `YOUR IMMEDIATE SAFETY IS MOST IMPORTANT. If you are in active danger, please go to a safe location right away and call emergency hotlines (112 or local police).\n\nWe have flagged this report as a CRITICAL case. Can you share where you are right now and if the suspect is still near you?`,
      `PLEASE SEEK SAFETY IMMEDIATELY if you are in danger. Call the emergency line (112 or your local police) for immediate help.\n\nYour report is marked as high priority. To assist our team, please tell us if you are currently in a secure location.`,
      `If you feel unsafe right now, please find a secure place and call emergency services immediately.\n\nWe have escalated this intake. Please tell us your current location and if anyone is currently threatening you.`
    ];
    return randomOf(safetyReplies);
  }

  if (hasSuspect) {
    const suspectReplies = [
      "Understood. Any information about the suspect's identity, name, or online handle is very helpful and will be shared only with authorized officers. Do you have a physical description, username, or other alias we should document?",
      "Thank you for these details. Suspect tracking is vital for our investigation. Do you know of any other associates they work with or online platforms they use?",
      "Identity details logged. Access to this information is strictly restricted to investigators. Can you describe their physical appearance or provide any contact details you might have?"
    ];
    return randomOf(suspectReplies);
  }

  if (hasEvidence) {
    const evidenceReplies = [
      "Excellent. Screenshots, documents, or logs are critical proof in cyber investigations. Please keep these files safe. We will request them securely once an investigator is assigned.",
      "Proof is highly valuable. Please make sure to save all chat records, screenshots, or receipts. An officer will guide you on how to upload them shortly.",
      "Recorded. Having evidence ready accelerates the case review process. Please keep these screenshots or documents safe and do not delete them."
    ];
    return randomOf(evidenceReplies);
  }

  if (hasLocation) {
    const locationReplies = [
      "Thank you for clarifying the location. Location coordinates help us map patterns and deploy resources. Are there any specific landmarks or addresses nearby?",
      "Location detail recorded. This is very helpful for our district team. Did the incident occur at this location, or did it happen online?",
      "Noted. Knowing the location allows us to coordinate with local patrol officers. Can you tell us if there are security cameras at this site?"
    ];
    return randomOf(locationReplies);
  }

  const generalFollowups = [
    "Thank you. Please tell me more about what happened next.",
    "I am capturing these details. What other details, times, or dates can you share?",
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
1. UNDERSTAND DETAILED CONTEXT: Carefully analyze the emotional tone, severity, and specific details of every sentence the user sends. Show genuine care and reassure them that this channel is fully encrypted, secure, and private.
2. DYNAMIC & NATURAL CONVERSATION: Never repeat static phrases or respond mechanically. Keep the tone human-like, comforting, and direct. Do not paste generic replies.
3. INTEL GATHERING: Gently ask follow-up questions to gather:
   - Nature of the incident (what occurred)
   - Date, time, and location
   - Suspect descriptions, aliases, or contact handles
   - Available evidence (such as screenshots, chats, documents)
   - A safe contact method (if they want to be reached, otherwise reassure anonymity)
4. HIGH-ALERT PROTOCOL: If the citizen mentions self-harm, physical violence, weapons, domestic abuse, or immediate danger, advise them immediately to seek safety and prioritize contacting local emergency services (112 or local police).
5. CONCISE & TARGETED: Keep replies concise (2-4 sentences max), comforting, and professional.`
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
