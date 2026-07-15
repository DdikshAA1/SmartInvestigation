import { Router, type IRouter } from "express";
import { db, conversations, messages, alertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ==========================================
// Local Rule-Based Chatbot Intake Tree
// ==========================================
function getLocalChatbotReply(userMessage: string, messageCount: number): string {
  const msg = userMessage.toLowerCase();

  if (messageCount === 0 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Thank you for reaching out to the Confidential Intake Unit. Your conversation is secure and encrypted. Please share details about the incident you want to report, including what occurred and when.";
  }

  // Sync with evaluateThreatAlert keywords
  const criticalKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife", "safety"];
  if (criticalKeywords.some(keyword => msg.includes(keyword))) {
    return "YOUR SAFETY IS CRITICAL. If you are in immediate physical danger, please find a safe space immediately and call emergency hotlines (112 or local police). We have flagged this report for urgent admin priority review. Can you share your current location and if the suspect is still nearby?";
  }

  const suspectKeywords = ["name", "suspect", "identity", "who", "alias", "associate", "profile", "mitnick", "ivanov", "petrova"];
  if (suspectKeywords.some(keyword => msg.includes(keyword))) {
    return "Understood. The identity details you have provided will be restricted to authorized investigators only. Do you have any supporting documents, screenshots, or physical description of the suspect that we should note?";
  }

  return "Thank you for providing these details. An investigator has been notified and is reviewing this intake thread. Please share any additional context, contact phone/email if you wish to be reached, or key events. Your details remain fully confidential.";
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
          content: "You are a supportive, intake virtual assistant for a Crime Investigation Department.\nA citizen is reporting a sensitive, highly personal, or violent case confidentially.\nGoals:\n1. Provide absolute emotional support, reassurance, and confirm their reports are completely private and encrypted.\n2. Ask clear, non-intrusive questions to gather essential info: Nature of the incident, date/location, involved suspects/parties, safe contact method.\n3. Keep answers concise, empathetic, and professional. If they indicate immediate danger, advise them to seek physical safety and direct them to emergency hotlines."
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
      replyContent = getLocalChatbotReply(userContent, history.length - 1);
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
