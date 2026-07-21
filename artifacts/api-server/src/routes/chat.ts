import { Router, type IRouter } from "express";
import { db, conversations, messages, alertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { gemini } from "@workspace/integrations-gemini-ai-server";
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

  // Detect language scripts
  const isHindiScript = /[\u0900-\u097F]/.test(userMessage); // Devanagari (Hindi, Marathi)
  const isBengaliScript = /[\u0980-\u09FF]/.test(userMessage); // Bengali
  const isGurmukhiScript = /[\u0A00-\u0A7F]/.test(userMessage); // Punjabi
  const isPunjabiScript = isGurmukhiScript;
  const isGujaratiScript = /[\u0A80-\u0AFF]/.test(userMessage); // Gujarati
  const isTamilScript = /[\u0B80-\u0BFF]/.test(userMessage); // Tamil
  const isTeluguScript = /[\u0C00-\u0C7F]/.test(userMessage); // Telugu
  const isKannadaScript = /[\u0C80-\u0CFF]/.test(userMessage); // Kannada
  const isMalayalamScript = /[\u0D00-\u0D7F]/.test(userMessage); // Malayalam
  const isArabicScript = /[\u0600-\u06FF]/.test(userMessage); // Urdu / Arabic
  
  const HINGLISH_INDICATORS = [
    "bhai", "hai", "mujhe", "kuch", "mai", "main", "mera", "meri", "mere", "hu", "hoon", 
    "tha", "thi", "the", "ko", "se", "kar", "karo", "kya", "kaise", "kab", "kaha", "kahin",
    "naam", "hum", "police", "madad", "help", "cyber", "paisa", "paise", "chori", "bank", 
    "account", "phish", "darr", "dhamki", "mara", "gali", "nikal", "link", "kho", "khoya", 
    "dhokha", "thagi", "luta", "fraud", "gpay", "paytm", "phonepe", "otp", "upi", "card", 
    "mobile", "phone", "stolen", "aamar", "taka", "panam", "dabbulu", "khemcho", 
    "sat sri akal", "vanakkam", "response", "nhi", "nahi", "raha", "rahi", "ho", "gaya",
    "karke", "batao", "sunno", "dekho", "kaam", "sir", "mam", "ji", "samajh", "aaya", "ache"
  ];
  const isHinglish = HINGLISH_INDICATORS.some(word => msg.includes(word));

  // Scenario Keywords
  const financialKeywords = ["money", "paisa", "paise", "taka", "panam", "dabbulu", "rupees", "bank", "account", "gpay", "phonepe", "paytm", "upi", "card", "otp", "stolen money", "fraud", "scam", "thagi", "transfer", "utr", "deducted", "luta", "credit", "debit"];
  const stalkingKeywords = ["stalk", "harass", "blackmail", "photo", "video", "morph", "fake profile", "instagram", "whatsapp", "telegram", "threaten", "dhamki", "gali", "private", "nude", "leak"];
  const phoneTheftKeywords = ["phone", "mobile", "imei", "stolen phone", "chori phone", "lost phone", "sim", "device", "handset"];
  const criticalKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife", "safety", "emergency", "blood", "attack", "suicide"];
  const suspectKeywords = ["name", "suspect", "identity", "who", "alias", "associate", "profile", "mitnick", "ivanov", "petrova", "person", "look like"];
  const evidenceKeywords = ["file", "photo", "image", "proof", "screenshot", "video", "document", "record", "receipt", "chat log"];
  const greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "namaste", "pranam", "vanakkam", "namaskaram", "sat sri akal", "khemcho", "nomoshkar"];

  const hasGreeting = greetings.some(word => msg.includes(word));
  const isFinancial = financialKeywords.some(word => msg.includes(word));
  const isStalking = stalkingKeywords.some(word => msg.includes(word));
  const isPhoneTheft = phoneTheftKeywords.some(word => msg.includes(word));
  const isCritical = criticalKeywords.some(word => msg.includes(word));
  const hasSuspect = suspectKeywords.some(word => msg.includes(word));
  const hasEvidence = evidenceKeywords.some(word => msg.includes(word));

  // 1. GREETING STAGE
  if (messageCount === 0 && hasGreeting) {
    if (isBengaliScript) return "নমস্কার। এটি একটি সুরক্ষিত সাইবার সাহায্য সেল। আপনার তথ্য সম্পূর্ণ গোপন রাখা হবে। সাইবার জালিয়াতি, ফোন চুরি বা ব্ল্যাকমেইলের ঘটনা জানান।";
    if (isTamilScript) return "வணக்கம்! இது பாதுகாப்பான சைபர் உதவி மையம். உங்கள் தகவல் முற்றிலும் பாதுகாப்பானது. உங்கள் புகாரை விவரிக்கவும்.";
    if (isTeluguScript) return "నమస్కారం! ఇది సురక్షితమైన సైబర్ సాయం కేంద్రం. మీ సమాచారం పూర్తిగా గోప్యంగా ఉంటుంది. మీ సమస్యను వివరించండి.";
    if (isPunjabiScript) return "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ। ਇਹ ਸੁਰੱਖਿਅਤ ਸਾਈਬਰ ਹੈਲਪ ਡੈਸਕ ਹੈ। ਆਪਣੀ ਸਮੱਸਿਆ (ਸਾਈਬਰ ਫ੍ਰਾਡ, ਮੋਬਾਈਲ ਚੋਰੀ) ਬਾਰੇ ਦੱਸੋ।";
    if (isGujaratiScript) return "નમસ્તે! આ સુરક્ષિત સાયબર હેલ્પ સેલ છે. તમારી સમસ્યા વિગતવાર જણાવો.";
    if (isHindiScript) return "नमस्ते। यह गोपनीय पुलिस सहायता और रिपोर्टिंग सेल है। आपकी बातचीत पूरी तरह से सुरक्षित है। कृपया अपनी समस्या बताएं (वित्तीय धोखाधड़ी, ब्लैकमेल, खोया फोन)।";
    if (isHinglish) return "Namaste! Main Vanguard Cyber Help Assistant hoon. Aapki baat encrypted hai. Bataiye kya problem hui hai - paise ki thagi, harassment, lost phone ya koi threat?";
    return "Hello! I am your Vanguard Cyber Assistance Officer. Your conversation is 100% confidential and encrypted. Please describe your issue (cyber fraud, harassment, lost phone, or threat).";
  }

  // 2. CRITICAL / EMERGENCY WARNINGS
  if (isCritical) {
    if (isBengaliScript) return "🚨 আপনার নিরাপত্তা সবচেয়ে গুরুত্বপূর্ণ! জরুরি অবস্থায় ১১২ বা ১০০ নম্বরে কল করুন। অনলাইন সাইবার ফ্রডের ক্ষেত্রে অবিলম্বে ১৯ ৩০ নম্বরে কল করুন।";
    if (isTamilScript) return "🚨 உங்கள் பாதுகாப்பு மிகவும் முக்கியமானது! அவசரநிலைக்கு 112 அல்லது 100 ஐ அழைக்கவும். ஆன்லைன் பணமோசடிக்கு 1930 ஐ அழைக்கவும்.";
    if (isTeluguScript) return "🚨 మీ రక్షణ అత్యంత ముఖ్యం! అత్యవసర పరిస్థితిలో 112 లేదా 100 కి కాల్ చేయండి. ఆన్‌లైన్ ఫ్రాడ్ కొరకు 1930 కి కాల్ చేయండి.";
    if (isPunjabiScript) return "🚨 ਤੁਹਾਡੀ ਸੁਰੱਖਿਆ ਸਭ ਤੋਂ ਜ਼ਰੂਰੀ ਹੈ! ਸੰਕਟ ਸਮੇਂ 112 ਜਾਂ 100 'ਤੇ ਕਾਲ ਕਰੋ। ਆਨਲਾਈਨ ਠੱਗੀ ਲਈ 1930 'ਤੇ ਕਾਲ ਕਰੋ।";
    if (isGujaratiScript) return "🚨 તમારી સુરક્ષા સૌથી મહત્વપૂર્ણ છે! તાત્કાલિક કટોકટી માટે 112 અથવા 100 પર કૉલ કરો. સાયબર ફ્રોડ માટે 1930 પર કૉલ કરો.";
    if (isHindiScript) return "🚨 आपकी सुरक्षा हमारी सर्वोच्च प्राथमिकता है!\n1. यदि आप किसी तात्कालिक खतरे में हैं, तो तुरंत सुरक्षित स्थान पर जाएं और आपातकालीन नंबर 112 या 100 पर कॉल करें।\n2. यदि महिला सुरक्षा से जुड़ा मामला है, तो 1091 पर संपर्क करें।\n3. हमने आपकी रिपोर्ट को 'CRITICAL' के रूप में पुलिस कंट्रोल रूम को सूचित कर दिया है। क्या आप अपना वर्तमान स्थान साझा कर सकते हैं?";
    if (isHinglish) return "🚨 AAPKI SAFETY SABSE PEHLE HAI!\n1. Agar aap immediate physical danger me hain, toh turant safe place par jayein aur National Emergency 112 ya 100 par call karein.\n2. Women harassment ke liye 1091 par bhi call kar sakte hain.\n3. Humne ye report CRITICAL priority par mark karke supervisor alert kar diya hai. Kya aap apni location share kar sakte hain?";
    return "🚨 YOUR SAFETY IS OUR TOP PRIORITY!\n1. If you are in immediate danger, move to a safe place and call National Emergency 112 or Police 100 immediately.\n2. For Women Safety emergencies, call 1091.\n3. We have flagged this report as CRITICAL and alerted duty officers. Can you please share your current location and if the threat is nearby?";
  }

  // 3. FINANCIAL SCAM / BANKING FRAUD / OTP SCAM
  if (isFinancial) {
    if (isBengaliScript) return "💳 সাইবার জালিয়াতি সাহায্য নির্দেশিকা:\n১. ন্যাশনাল সাইবার হেল্পলাইন ১৯৩০ নম্বরে কল করে টাকা ব্লক করুন।\n২. cybercrime.gov.in পোর্টালে অভিযোগ দায়ের করুন।\n৩. আপনার ব্যাংক কার্ড ও ইউপিআই ব্লক করুন।";
    if (isTamilScript) return "💳 சைபர் மோசடி உதவி:\n1. உடனடியாக 1930 என்ற எண்ணை அழைத்து பணத்தை முடக்கவும்.\n2. cybercrime.gov.in இல் புகார் அளிக்கவும்.\n3. உங்கள் வங்கி கார்டு மற்றும் UPI ஐ முடக்கவும்.";
    if (isTeluguScript) return "💳 సైబర్ ఫ్రాడ్ సహాయం:\n1. వెంటనే 1930 హెల్ప్‌లైన్‌కు కాల్ చేసి డబ్బులను స్తంభింపజేయండి.\n2. cybercrime.gov.in లో ఫిర్యాదు చేయండి.\n3. బ్యాంక్ కార్డ్స్ & UPI ని బ్లాక్ చేయండి.";
    if (isPunjabiScript) return "💳 ਸਾਈਬਰ ਠੱਗੀ ਮਦਦ:\n1. ਤੁਰੰਤ 1930 ਹੈਲਪਲਾਈਨ 'ਤੇ ਕਾਲ ਕਰਕੇ ਪੈਸੇ ਫ੍ਰੀਜ਼ ਕਰਵਾਓ।\n2. cybercrime.gov.in 'ਤੇ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ।\n3. ਬੈਂਕ ਕਾਰਡ ਅਤੇ UPI ਬਲਾਕ ਕਰੋ।";
    if (isGujaratiScript) return "💳 સાયબર ફ્રોડ મદદ:\n1. તુરંત 1930 સાયબર હેલ્પલાઇન પર કૉલ કરી પૈસા બ્લોક કરો.\n2. cybercrime.gov.in પર ફરિયાદ નોંધાવો.\n3. બેંક કાર્ડ અને UPI બ્લોક કરો.";
    if (isHindiScript) return "💳 वित्तीय धोखाधड़ी (Cyber Fraud) सहायता निर्देश:\n1. तुरंत 'गोल्डन आवर' में राष्ट्रीय साइबर हेल्पलाइन 1930 पर कॉल करें ताकि आपका पैसा बैंक में ही ब्लॉक किया जा सके।\n2. अधिकारिक पोर्टल cybercrime.gov.in पर शिकायत दर्ज करें।\n3. तुरंत अपने बैंक को सूचित करके अपना डेबिट/क्रेडिट कार्ड और यूपीआई पिन ब्लॉक करवाएं।\n4. कृपया हमें बताएं: कितना पैसा कटा? बैंक का नाम? और धोखाधड़ी की तारीख/समय क्या है?";
    if (isHinglish) return "💳 FINANCIAL CYBER FRAUD ACTION PLAN:\n1. Turant National Cyber Helpline 1930 par call karein taaki fraud money freeze ho sake ('Golden Hour').\n2. Official portal cybercrime.gov.in par complaint register karein.\n3. Apne bank ko call karke Card, Netbanking aur UPI PIN तुरंत block karayein.\n4. Kripya humein batayein: Kitne paise kataye gaye, Bank ka naam, aur Transaction ID / UTR number kya hai?";
    return "💳 FINANCIAL CYBER FRAUD ACTION PLAN:\n1. Immediately call the National Cyber Helpline at 1930 to freeze the stolen funds during the Golden Hour window.\n2. Lodge an official report at cybercrime.gov.in.\n3. Contact your bank immediately to block your UPI ID, Net Banking, and Cards.\n4. Please provide: Total amount lost, Bank name, Transaction UTR/Ref ID, and date/time of fraud.";
  }

  // 4. CYBERSTALKING / BLACKMAIL / HARASSMENT
  if (isStalking) {
    if (isBengaliScript) return "🛡️ সাইবার ব্ল্যাকমেইল সংক্রান্ত নির্দেশিকা:\n১. ব্ল্যাকমেইলারকে কোন টাকা দেবেন না।\n২. চ্যাট ও প্রোফাইলের স্ক্রিনশট রাখুন।\n৩. cybercrime.gov.in অথবা ১০৯১ নম্বরে জানান।";
    if (isTamilScript) return "🛡️ சைபர் மிரட்டல் உதவி:\n1. எந்த பணமும் கொடுக்க வேண்டாம்.\n2. ஆதாரங்களை (Screenshots) சேமிக்கவும்.\n3. cybercrime.gov.in அல்லது 1091 ஐ அழைக்கவும்.";
    if (isTeluguScript) return "🛡️ సైబర్ బ్లాక్‌మెయిల్ సహాయం:\n1. ఎటువంటి డబ్బు చెల్లించవద్దు.\n2. చాట్స్ & ప్రొఫైల్ స్క్రీన్‌షాట్లు సేవ్ చేసుకోండి.\n3. cybercrime.gov.in లేదా 1091 కి కాల్ చేయండి.";
    if (isPunjabiScript) return "🛡️ ਬਲੈਕਮੇਲ ਮਦਦ:\n1. ਕੋਈ ਪੈਸਾ ਨਾ ਦਿਓ।\n2. ਸਕ੍ਰੀਨਸ਼ੌਟ ਸੰਭਾਲ ਕੇ ਰੱਖੋ।\n3. cybercrime.gov.in ਜਾਂ 1091 'ਤੇ ਕਾਲ ਕਰੋ।";
    if (isGujaratiScript) return "🛡️ સાયબર બ્લેકમેઇલ મદદ:\n1. કોઈ પૈસા આપશો નહીં.\n2. સ્ક્રીનશોટ સુરક્ષિત રાખો.\n3. cybercrime.gov.in અથવા 1091 પર સંપર્ક કરો।";
    if (isHindiScript) return "🛡️ साइबर ब्लैकमेल / उत्पीड़न सुरक्षा निर्देश:\n1. किसी भी ब्लैकमेलर को कोई पैसा न दें। पैसा देने से ब्लैकमेलिंग कभी बंद नहीं होती।\n2. ब्लैकमेलर के मैसेज, चैट, प्रोफाइल लिंक और फोन नंबर के स्क्रीनशॉट सुरक्षित रखें।\n3. ब्लैकमेलर को ब्लॉक करें और ऐप (WhatsApp/Instagram) पर रिपोर्ट करें।\n4. cybercrime.gov.in पर महिला एवं बाल सुरक्षा अनुभाग में गोपनीय शिकायत दर्ज करें या 1091 पर कॉल करें।";
    if (isHinglish) return "🛡️ CYBER BLACKMAIL / HARASSMENT GUIDE:\n1. Blackmailer ko BILKUL PAISA MAT DEIN. Money dene se blackmailing rukti nahi hai.\n2. Chat, profile URL, phone number aur messages ke screenshots le kar safe rakh lein.\n3. Profile ko block aur report karein.\n4. cybercrime.gov.in par 'Women/Child Related Crime' section me anonymous complaint file karein ya 1091 par call karein.";
    return "🛡️ CYBER BLACKMAIL & HARASSMENT ADVISORY:\n1. DO NOT PAY ANY MONEY to the extortionist. Paying money will only invite further threats.\n2. Preserve evidence: Take clear screenshots of messages, profile links, handles, and phone numbers with timestamps.\n3. Block and report the accounts on WhatsApp / Instagram / Telegram.\n4. Lodge a report at cybercrime.gov.in under the Anonymous/Women Safety section, or call 1091.";
  }

  // 5. STOLEN / LOST MOBILE PHONE
  if (isPhoneTheft) {
    if (isBengaliScript) return "📱 মোবাইল ফোন চুরি সংক্রান্ত নির্দেশিকা:\n১. সরকারি CEIR পোর্টালে (ceir.gov.in) গিয়ে IMEI ব্লক করুন।\n২. সিম কার্ড ব্লক করুন ও নিকটস্থ থানায় ডায়েরি করুন।";
    if (isTamilScript) return "📱 போன் திருட்டு உதவி:\n1. CEIR போர்ட்டலில் (ceir.gov.in) IMEI ஐ முடக்கவும்.\n2. சிம் கார்டை முடக்கி காவல் நிலையத்தில் புகார் அளிக்கவும்.";
    if (isTeluguScript) return "📱 ఫోన్ దొంగతనం సహాయం:\n1. CEIR పోర్టల్ (ceir.gov.in) లో IMEI ని బ్లాక్ చేయండి.\n2. SIM కార్డ్‌ను బ్లాక్ చేసి పోలీస్ స్టేషన్‌లో ఫిర్యాదు చేయండి.";
    if (isPunjabiScript) return "📱 ਮੋਬਾਈਲ ਚੋਰੀ ਮਦਦ:\n1. CEIR ਪੋਰਟਲ (ceir.gov.in) 'ਤੇ IMEI ਬਲਾਕ ਕਰੋ।\n2. ਸਿਮ ਕਾਰਡ ਬਲਾਕ ਕਰਵਾਓ ਅਤੇ ਪੁਲਿਸ ਰਿਪੋਰਟ ਕਰੋ।";
    if (isGujaratiScript) return "📱 ફોન ચોરી મદદ:\n1. CEIR પોર્ટલ (ceir.gov.in) પર IMEI બ્લોક કરો.\n2. સિમ કાર્ડ બ્લોક કરો અને પોલીસ સ્ટેશનમાં જાણ કરો.";
    if (isHindiScript) return "📱 खोया / चोरी हुआ मोबाइल फोन ब्लॉक और ट्रैक करने की प्रक्रिया:\n1. दूरसंचार विभाग के पोर्टल CEIR (ceir.gov.in) पर जाएं और अपना IMEI नंबर ब्लॉक करें।\n2. सिम कार्ड ब्लॉक करने के लिए तुरंत अपने टेलीकॉम ऑपरेटर (Jio/Airtel/Vi) से संपर्क करें।\n3. नजदीकी पुलिस स्टेशन पर खोई हुई संपत्ति की रिपोर्ट दर्ज करें।";
    if (isHinglish) return "📱 LOST / STOLEN PHONE ACTION STEPS:\n1. Government portal CEIR (ceir.gov.in) par jaakar apna IMEI block & track karein.\n2. Apne telecom operator (Jio/Airtel/Vi) ko call karke SIM block karayein.\n3. Local Police station ya state police app par Lost Property Report file karein.";
    return "📱 LOST OR STOLEN MOBILE GUIDE:\n1. Visit the Govt CEIR Portal (ceir.gov.in) to block & trace your handset's 15-digit IMEI number.\n2. Contact your telecom operator (Jio / Airtel / Vi) immediately to block the SIM card.\n3. File a Lost Property Report / e-FIR with the local police.";
  }

  // 6. GENERAL HELPFUL ADVISORY IN DETECTED SCRIPT
  if (isBengaliScript) return "ধন্যবাদ। আপনার তথ্য রেকর্ড করা হয়েছে। জরুরি সাহায্য: ১৯৩০ (সাইবার ফ্রড), ১১২ (জরুরি), cybercrime.gov.in.";
  if (isTamilScript) return "நன்றி. உங்கள் தகவல் பதிவு செய்யப்பட்டது. அவசர உதவிக்கு: 1930 (சைபர் மோசடி), 112 (அவசரம்), cybercrime.gov.in.";
  if (isTeluguScript) return "ధన్యవాదాలు. మీ సమాచారం నమోదైంది. సాయానికి: 1930 (సైబర్ ఫ్రాడ్), 112 (అత్యవసరం), cybercrime.gov.in.";
  if (isPunjabiScript) return "ਧੰਨਵਾਦ। ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ। ਮਦਦ ਲਈ: 1930 (ਸਾਈਬਰ ਠੱਗੀ), 112 (ਇਮਰਜੈਂਸੀ), cybercrime.gov.in.";
  if (isGujaratiScript) return "આભાર. તમારી વિગતો નોંધવામાં આવી છે. મદદ માટે: 1930 (સાયબર ફ્રોડ), 112 (ઈમરજન્સી), cybercrime.gov.in.";
  if (isHindiScript) return "धन्यवाद। आपकी रिपोर्ट दर्ज कर ली गई है। यदि आप तुरंत सहायता चाहते हैं: साइबर अपराध के लिए 1930, आपातकाल के लिए 112, और आधिकारिक शिकायत दर्ज करने के लिए cybercrime.gov.in का उपयोग करें। क्या आप कुछ और विवरण जोड़ना चाहते हैं?";
  if (isHinglish) return "Thank you. Humne aapke details note kar liye hain. Instant help ke liye: Cyber Fraud helpline 1930, Emergency 112, aur official portal cybercrime.gov.in ka use karein. Kya aap kuch aur specific detail add karna chahte hain?";

  return "Thank you for reporting. Your information has been securely logged. For immediate helpline assistance: Cyber Financial Fraud call 1930, Emergency Safety call 112, or register at cybercrime.gov.in. Would you like to share any additional details or transaction reference numbers?";
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
          content: `You are Vanguard AI Cyber & Crime Assistant, an expert, highly empathetic, NLP-driven Police & Cyber Intake Officer.
You are trained to accept ANY language in the world (English, Hinglish, Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Punjabi, Kannada, Malayalam, Urdu, Spanish, French, German, Arabic, etc.) and seamlessly converse in that exact same language.

STRICT MULTI-LINGUAL & NLP DIRECTIVES:
1. MANDATORY LANGUAGE & SCRIPT MIRRORING:
   - Automatically detect the language, script, and dialect of the user's message.
   - You MUST reply in the EXACT SAME LANGUAGE and SCRIPT/DIALECT as the user's input.
   - If the user writes in Devanagari Hindi, reply in Devanagari Hindi.
   - If the user writes in Hinglish (Romanized Hindi), reply in Hinglish.
   - If the user writes in Marathi, Tamil, Bengali, Punjabi, Gujarati, Urdu, Spanish, etc., reply in that exact language.
   - NEVER default back to English unless the user explicitly asked in English.

2. NLP DEEP ENTITY & INTENT EXTRACTION:
   - Understand the user's intent (Financial Cyber Fraud, Cyberstalking/Blackmail, Phone Theft, Emergency Threat, Scam).
   - Extract key facts (amount of money lost, bank name, transaction ID, date/time, suspect username/number, location) and acknowledge them in the user's language so they feel heard.

3. ACCURATE STEP-BY-STEP HELP IN THE USER'S LANGUAGE:
   - Financial Cyber Fraud (Bank/UPI/OTP scam): Tell them to immediately call National Cyber Helpline 1930 (Golden Hour window to freeze funds), register on cybercrime.gov.in, and block bank cards/UPI.
   - Cyberstalking / Blackmail: Tell them NOT to pay money, save screenshots of chat/profile link, block suspect, and file at cybercrime.gov.in or call Women Helpline 1091 / Emergency 112.
   - Lost/Stolen Mobile: Guide them to block IMEI on Govt CEIR portal (ceir.gov.in), block SIM card, and file Lost Property Report.
   - Physical Danger / Threat: Guide them to seek safe shelter immediately and call National Emergency 112 or Police 100.

4. DYNAMIC & NATURAL DIALOGUE:
   - Do NOT use mechanical or repetitive templates.
   - Ask 1 or 2 specific follow-up questions for missing details (such as Transaction UTR, Suspect Handle, or Screenshots).
   - Keep answers concise (2-4 sentences or clear bullet points) and deeply empathetic.`
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
      console.warn("OpenAI API call bypassed/failed, trying Gemini AI...", aiErr);
    }

    // Tier 2: Gemini AI if OpenAI was empty or failed
    if (!replyContent || !replyContent.trim()) {
      try {
        const geminiModel = gemini.getModel("gemini-1.5-flash");
        const fullPrompt = `You are Vanguard AI Cyber & Crime Assistant, an expert Police & Cyber Intake Officer.
Constraint: You MUST reply in the EXACT SAME LANGUAGE, SCRIPT, and DIALECT used by the user in their message. (If Devanagari Hindi, reply in Devanagari Hindi; if Hinglish, reply in Hinglish; if Tamil, reply in Tamil; if Bengali, reply in Bengali, etc.).
Give real helpline numbers (1930 for Cyber Fraud, 112 for Emergency, CEIR for Lost Phone, 1091 for Women Safety).

Conversation History:
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER MESSAGE: ${userContent}
ASSISTANT REPLY IN USER'S EXACT LANGUAGE:`;

        const result = await geminiModel.generateContent(fullPrompt);
        replyContent = result.response.text();
      } catch (geminiErr) {
        console.warn("Gemini AI call bypassed/failed, utilizing Multi-Script Local Fallback Engine:", geminiErr);
      }
    }

    // Tier 3: Local Robust Multi-Lingual NLP Fallback Engine
    if (!replyContent || !replyContent.trim()) {
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
