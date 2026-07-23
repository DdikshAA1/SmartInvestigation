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

  // Detect language scripts & dialects
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

  const INDIC_ROMAN_WORDS = [
    "hai", "ho", "hu", "tha", "thi", "the", "me", "mein", "pe", "par", "ne", "se", "ko", 
    "mera", "meri", "mere", "mujhe", "mujhko", "hum", "humne", "aap", "aapka", "aapne", 
    "bhai", "sir", "mam", "madad", "help", "chori", "paise", "paisa", "rupees", "rs", 
    "bank", "upi", "fraud", "scam", "thagi", "link", "account", "gpay", "paytm", "phonepe", 
    "otp", "call", "number", "threat", "dhamki", "police", "complaint", "report", "lost", 
    "mobile", "phone", "photo", "video", "viral", "hack", "hacked", "hacking", "aamar", 
    "taka", "panam", "dabbulu", "khemcho", "sat sri akal", "vanakkam", "response", "nhi", 
    "nahi", "raha", "rahi", "ho", "gaya", "karke", "batao", "sunno", "dekho", "kaam", 
    "sir", "mam", "ji", "samajh", "aaya", "ache"
  ];
  
  // If no native Indic script was detected, check if Romanized Indic or Hinglish
  const isHinglish = !isHindiScript && !isBengaliScript && !isTamilScript && !isTeluguScript && 
                    !isGujaratiScript && !isPunjabiScript && !isKannadaScript && !isMalayalamScript && !isArabicScript &&
                    INDIC_ROMAN_WORDS.some(word => msg.includes(word));

  // Determine Primary Target Language
  let lang = "english";
  if (isHindiScript) lang = "hindi";
  else if (isHinglish) lang = "hinglish";
  else if (isBengaliScript) lang = "bengali";
  else if (isTamilScript) lang = "tamil";
  else if (isTeluguScript) lang = "telugu";
  else if (isGujaratiScript) lang = "gujarati";
  else if (isPunjabiScript) lang = "punjabi";
  else if (isKannadaScript) lang = "kannada";
  else if (isMalayalamScript) lang = "malayalam";
  else if (isArabicScript) lang = "urdu";

  // Category Triggers
  const financialKeywords = ["money", "paisa", "paise", "taka", "panam", "dabbulu", "rupees", "rs", "bank", "account", "gpay", "phonepe", "paytm", "upi", "card", "otp", "stolen money", "fraud", "scam", "thagi", "transfer", "utr", "deducted", "luta", "credit", "debit", "kat", "hacked"];
  const stalkingKeywords = ["stalk", "harass", "blackmail", "photo", "video", "morph", "fake profile", "instagram", "whatsapp", "telegram", "threaten", "dhamki", "gali", "private", "nude", "leak", "viral"];
  const phoneTheftKeywords = ["phone", "mobile", "imei", "stolen phone", "chori phone", "lost phone", "sim", "device", "handset", "chori"];
  const criticalKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault", "rape", "gun", "knife", "safety", "emergency", "blood", "attack", "suicide", "mara", "dhamki"];

  const isFinancial = financialKeywords.some(word => msg.includes(word));
  const isStalking = stalkingKeywords.some(word => msg.includes(word));
  const isPhoneTheft = phoneTheftKeywords.some(word => msg.includes(word));
  const isCritical = criticalKeywords.some(word => msg.includes(word));

  // Empathetic Openings
  const openings: Record<string, string[]> = {
    english: [
      "We understand this is stressful. We are here to guide you step-by-step.",
      "Thank you for reaching out securely. Your safety and privacy are our top priorities.",
      "We have logged your description. Rest assured, this workspace is secure.",
      "Let's work together to resolve this issue as quickly as possible."
    ],
    hindi: [
      "हम समझते हैं कि यह समय आपके लिए तनावपूर्ण है। हम आपकी पूरी सहायता करेंगे।",
      "सुरक्षित रूप से संपर्क करने के लिए धन्यवाद। आपकी सुरक्षा और गोपनीयता हमारी प्राथमिकता है।",
      "आपकी समस्या दर्ज कर ली गई है। कृपया बिल्कुल भी न घबराएं।",
      "हम इस संकट की घड़ी में आपके साथ हैं और आपको सही सलाह देंगे।"
    ],
    hinglish: [
      "Hum samajhte hain ye situation stressful hai, but don't worry, hum poori help karenge.",
      "Securely contact karne ke liye thank you. Aapki privacy humari top priority hai.",
      "Aapke details note kar liye gaye hain. Bilkul chinta mat kijiye.",
      "Hum aapko step-by-step guide karenge taaki ye issue jald solve ho sake."
    ],
    bengali: [
      "আমরা বুঝতে পারছি এটি আপনার জন্য উদ্বেগের বিষয়। আমরা আপনাকে সাহায্য করব।",
      "নিরাপদে যোগাযোগ করার জন্য ধন্যবাদ। আপনার তথ্য সম্পূর্ণ গোপন থাকবে।"
    ],
    tamil: [
      "நாங்கள் உங்களுக்கு உதவ இங்கே இருக்கிறோம். உங்கள் தகவல் பாதுகாப்பானது.",
      "தொடர்பு கொண்டதற்கு நன்றி. உங்கள் பாதுகாப்பே எங்களது முக்கிய நோக்கம்."
    ],
    telugu: [
      "మేము మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాము. మీ సమాచారం సురક્ષితం.",
      "మమ్మల్ని సంప్రదించినందుకు ధన్యవాదాలు. మీ భద్రత మా ప్రాధాన్యత."
    ],
    gujarati: [
      "અમે તમારી ચિંતા સમજી શકીએ છીએ. અમે તમને સંપૂર્ણ માર્ગદર્શન આપીશું.",
      "સંપર્ક કરવા બદલ આભાર. તમારી સુરક્ષા અને ગોપનીયતા અમારી પ્રાથમિકતા છે."
    ],
    punjabi: [
      "ਅਸੀਂ ਸਮਝਦੇ ਹਾਂ ਕਿ ਇਹ ਸਮਾਂ ਚਿੰਤਾਜਨਕ ਹੈ। ਅਸੀਂ ਤੁਹਾਡੀ ਪੂਰੀ ਮਦਦ ਕਰਾਂਗੇ।",
      "ਸੰਪਰਕ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਤੁਹਾਡੀ ਸੁਰੱਖਿਆ ਸਾਡੀ ਪਹਿਲ ਹੈ।"
    ],
    kannada: [
      "ನಾವು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇವೆ. ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ."
    ],
    malayalam: [
      "ഞങ്ങൾ നിങ്ങളെ സഹായിക്കാൻ ഇവിടെയുണ്ട്. നിങ്ങളുടെ വിവരങ്ങൾ സുരക്ഷിതമാണ്."
    ],
    urdu: [
      "ہم سمجھتے ہیں کہ یہ پریشانی کا وقت ہے۔ ہم آپ کی پوری رہنمائی کریں گے۔"
    ]
  };

  // Scenario Actions
  const actions: Record<string, Record<string, string>> = {
    critical: {
      english: "🚨 CRITICAL THREAT WARNING:\n1. If you are in physical danger, call Emergency 112 or 100 immediately.\n2. For women's safety assistance, call 1091.\n3. We have flagged this report as CRITICAL for swift duty officer intake.",
      hindi: "🚨 आपातकालीन सुरक्षा चेतावनी:\n1. यदि आप किसी खतरे में हैं, तो तुरंत 112 या 100 नंबर डायल करें।\n2. महिला सुरक्षा सहायता के लिए 1091 पर संपर्क करें।\n3. हमने इस मामले को 'अत्यंत गंभीर' श्रेणी में कंट्रोल रूम को सूचित कर दिया है।",
      hinglish: "🚨 EMERGENCY ALERT:\n1. Agar immediate physical danger hai, toh turant 112 ya 100 call karein.\n2. Women assistance ke liye helpline 1091 active hai.\n3. Humne ye report CRITICAL priority par mark karke supervisor ko alert kar diya hai.",
      bengali: "🚨 জরুরি সতর্কতা: শারীরিক বিপদে অবিলম্বে ১১২ বা ১০০ নম্বরে কল করুন। নারী সুরক্ষার জন্য ১০৯১ নম্বরে যোগাযোগ করুন।",
      tamil: "🚨 அவசர எச்சரிக்கை: உடனடி ஆபத்தில் இருந்தால் 112 அல்லது 100 ஐ அழைக்கவும். பெண்கள் உதவிக்கு 1091 ஐ அழைக்கவும்.",
      telugu: "🚨 అత్యవసర హెచ్చరిక: ప్రమాదంలో ఉంటే వెంటనే 112 లేదా 100 కి కాల్ చేయండి. మహిళల సహాయానికి 1091 కి కాల్ చేయండి.",
      gujarati: "🚨 કટોકટી ચેતવણી: જો શારીરિક જોખમ હોય તો તાત્કાલિક 112 અથવા 100 પર કૉล કરો. મહિલા મદદ માટે 1091 પર કૉલ કરો.",
      punjabi: "🚨 ਸੰਕਟ ਚੇਤਾਵਨੀ: ਜੇਕਰ ਕੋਈ ਖ਼ਤਰਾ ਹੈ ਤਾਂ ਤੁਰੰਤ 112 ਜਾਂ 100 'ਤੇ ਕਾਲ ਕਰੋ। ਔਰਤਾਂ ਦੀ ਸੁਰੱਖਿਆ ਲਈ 1091 'ਤੇ ਕਾਲ ਕਰੋ।"
    },
    financial: {
      english: "💳 CYBER FINANCIAL FRAUD ACTION PLAN:\n1. Call National Cyber Helpline 1930 immediately (freeze money in Golden Hour).\n2. Register an official complaint on cybercrime.gov.in.\n3. Block your Bank cards, Netbanking, and UPI credentials immediately.",
      hindi: "💳 साइबर वित्तीय धोखाधड़ी निवारण योजना:\n1. तुरंत साइबर हेल्पलाइन 1930 डायल करें (गोल्डन आवर में पैसे फ्रीज कराने के लिए)।\n2. आधिकारिक पोर्टल cybercrime.gov.in पर शिकायत दर्ज करें।\n3. तुरंत बैंक से संपर्क कर अपने कार्ड, नेटबैंकिंग और यूपीआई ब्लॉक कराएं।",
      hinglish: "💳 FINANCIAL SCAM RESOLUTION STEPS:\n1. Turant National Cyber Helpline 1930 par call karein taaki transactions freeze ho sakein ('Golden Hour').\n2. Official portal cybercrime.gov.in par apni complaint register karein.\n3. Apne bank cards, netbanking aur UPI accounts block karayein.",
      bengali: "💳 সাইবার ফ্রড অ্যাকশন প্ল্যান: অবিলম্বে সাইবার হেল্পলাইন ১৯৩০ নম্বরে কল করে টাকা ফ্রিজ করুন এবং cybercrime.gov.in-এ অভিযোগ দায়ের করুন।",
      tamil: "💳 சைபர் மோசடி உதவி: உடனடியாக 1930 ஐ அழைத்து பணத்தை முடக்கவும். cybercrime.gov.in இல் புகார் அளிக்கவும்.",
      telugu: "💳 சைபர் ఫ్రాడ్ సహాయం: వెంటనే 1930 హెల్ప్‌లైన్‌కు కాల్ చేసి డబ్బులను బ్లాక్ చేయండి. cybercrime.gov.in లో ఫిర్యాదు చేయండి.",
      gujarati: "💳 સાયબર નાણાકીય ફ્રોડ મદદ: તુરંત 1930 સાયબર હેલ્પલાઇન પર કૉલ કરી પૈસા ફ્રીઝ કરાવો અને cybercrime.gov.in પર ફરિયાદ કરો.",
      punjabi: "💳 ਸਾਈਬਰ ਵਿੱਤੀ ਠੱਗੀ ਮਦਦ: ਤੁਰੰਤ 1930 'ਤੇ ਕਾਲ ਕਰਕੇ ਪੈਸੇ ਫ੍ਰੀਜ਼ ਕਰਵਾਓ ਅਤੇ cybercrime.gov.in 'ਤੇ ਸ਼ਿਕायत ਦਰਜ ਕਰੋ।"
    },
    stalking: {
      english: "🛡️ CYBERSTALKING & BLACKMAIL ADVISORY:\n1. DO NOT PAY ANY MONEY. Extortionists never stop after the first payment.\n2. Save screenshots of all chat logs, suspect usernames, and links.\n3. Lodge a report confidentially at cybercrime.gov.in or call Women Safety 1091.",
      hindi: "🛡️ साइबर ब्लैकमेल और उत्पीड़न सुरक्षा निर्देश:\n1. आरोपी को कोई पैसा न दें। पैसा देने से ब्लैकमेलिंग कभी बंद नहीं होती।\n2. सभी चैट, संदेही के प्रोफाइल लिंक और स्क्रीनशॉट सुरक्षित रखें।\n3. cybercrime.gov.in पर रिपोर्ट दर्ज करें या 1091 महिला हेल्पलाइन पर कॉल करें।",
      hinglish: "🛡️ CYBER HARASSMENT / BLACKMAIL ADVISORY:\n1. Blackmailer ko ek bhi paisa mat dena. Paisa dene se blackmailing badhti hai.\n2. Chat screenshots, call recordings aur social profile links safe rakhein.\n3. Confidential complaint cybercrime.gov.in par register karein ya 1091 par call karein.",
      bengali: "🛡️ সাইবার ব্ল্যাকমেইল নির্দেশিকা: কোনো টাকা দেবেন না। সমস্ত চ্যাট ও প্রোফাইল স্ক্রিনশট রাখুন এবং cybercrime.gov.in-এ অভিযোগ জানান।",
      tamil: "🛡️ சைபர் மிரட்டல் உதவி: பணம் கொடுக்க வேண்டாம். சாட் ஸ்கிரீன்ஷாட்களை சேமித்து cybercrime.gov.in இல் புகார் அளிக்கவும்.",
      telugu: "🛡️ సైబర్ బ్లాక్‌మెయిల్ సహాయం: డబ్బు చెల్లించవద్దు. స్క్రీన్‌షాట్లు సేవ్ చేసుకొని cybercrime.gov.in లో ఫిర్యాదు చేయండి.",
      gujarati: "🛡️ સાયબર બ્લેકમેઇલ મદદ: પૈસા આપશો નહીં. સ્ક્રીનશોટ સાચવીને રાખવા અને cybercrime.gov.in પર ફરિયાદ નોંધાવો.",
      punjabi: "🛡️ ਬਲੈਕਮੇਲ ਮਦਦ: ਕੋਈ ਪੈਸਾ ਨਾ ਦਿਓ। ਸਕ੍ਰੀਨਸ਼ੌਟ ਸੰਭਾਲ ਕੇ ਰੱਖੋ ਅਤੇ cybercrime.gov.in 'ਤੇ ਸ਼ਿਕायत ਕਰੋ।"
    },
    phoneTheft: {
      english: "📱 LOST/STOLEN PHONE INTEL:\n1. Block your IMEI on the Central Equipment Identity Register (ceir.gov.in).\n2. Block your SIM card with your operator to prevent OTP misuse.\n3. File a Stolen Property Report with your local state police station/app.",
      hindi: "📱 खोया या चोरी हुआ मोबाइल फोन:\n1. दूरसंचार विभाग के CEIR पोर्टल (ceir.gov.in) पर जाकर अपना IMEI ब्लॉक करें।\n2. ऑपरेटर से संपर्क कर तुरंत सिम कार्ड ब्लॉक कराएं ताकि ओटीपी चोरी न हो।\n3. नजदीकी पुलिस स्टेशन में खोई हुई संपत्ति की ऑनलाइन या ऑफलाइन रिपोर्ट दर्ज करें।",
      hinglish: "📱 STOLEN/LOST PHONE INSTRUCTIONS:\n1. Telecom Department ke CEIR portal (ceir.gov.in) par jaakar IMEI block karein.\n2. SIM block karayein taaki koi OTP misue na kar sake.\n3. State police app ya local station par Lost/Stolen report file karein.",
      bengali: "📱 মোবাইল চুরি নির্দেশিকা: ceir.gov.in পোর্টালে গিয়ে IMEI ব্লক করুন এবং থানায় হারিয়ে যাওয়া ডায়েরি করুন।",
      tamil: "📱 போன் திருட்டு உதவி: ceir.gov.in போர்ட்டலில் IMEI ஐ முடக்கவும். காவல் நிலையத்தில் புகார் அளிக்கவும்.",
      telugu: "📱 ఫోన్ దొంగతనం సహాయం: ceir.gov.in లో IMEI ని బ్లాక్ చేయండి మరియు పోలీస్ స్టేషన్‌లో ఫిర్యాదు చేయండి.",
      gujarati: "📱 ફોન ચોરી મદદ: ceir.gov.in પોર્ટલ પર IMEI બ્લોક કરો અને પોલીસ સ્ટેશનમાં જાણ કરો.",
      punjabi: "📱 ਮੋਬਾਈਲ ਚੋਰੀ ਮਦਦ: ceir.gov.in 'ਤੇ IMEI ਬਲਾਕ ਕਰੋ ਅਤੇ ਪੁਲਿਸ ਸਟੇਸ਼ਨ ਵਿੱਚ ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ।"
    },
    general: {
      english: "ℹ️ GENERAL SECURE ASSISTANCE:\n1. For online financial scams, report instantly at National Cyber Helpline 1930.\n2. For immediate safety risks, call 112.\n3. File a detailed case record at official cybercrime.gov.in portal.",
      hindi: "ℹ️ सामान्य साइबर सहायता दिशानिर्देश:\n1. साइबर ठगी (वित्तीय) की रिपोर्ट तुरंत 1930 पर कॉल करके दर्ज कराएं।\n2. तात्कालिक शारीरिक संकट में पुलिस सहायता के लिए 112 डायल करें।\n3. अपनी शिकायत का पूरा विवरण cybercrime.gov.in पर दर्ज करें।",
      hinglish: "ℹ️ GENERAL ADVISORY:\n1. Cyber fraud case me turant 1930 helpline number par inform karein.\n2. Emergency safety issue ho toh call 112 immediately.\n3. Official complaints ke liye cybercrime.gov.in portal visit karein.",
      bengali: "ℹ️ সাধারণ নির্দেশিকা: সাইবার জালিয়াতির ক্ষেত্রে ১৯৩০ নম্বরে এবং জরুরি সুরক্ষা সহায়তায় ১১২ নম্বরে কল করুন।",
      tamil: "ℹ️ பொது உதவி: சைபர் மோசடிக்கு 1930 ஐயும், அவசர உதவிக்கு 112 ஐயும் அழைக்கவும்.",
      telugu: "ℹ️ సాధారణ సహాయం: సైబర్ మోసాలకు 1930 కి, అత్యవసర సహాయానికి 112 కి కాల్ చేయండి.",
      gujarati: "ℹ️ સામાન્ય માર્ગદર્શન: સાયબર ફ્રોડ માટે 1930 અને કટોકટી સુરક્ષા માટે 112 પર સંપર્ક કરો.",
      punjabi: "ℹ️ ਆਮ ਮਦਦ: ਸਾਈਬਰ ਧੋਖਾਧੜੀ ਲਈ 1930 ਅਤੇ ਐਮਰਜੈਂਸੀ ਲਈ 112 'ਤੇ ਕਾਲ ਕਰੋ।"
    }
  };

  // Dynamic Questions
  const questionPool: Record<string, string[]> = {
    english: [
      "Can you please provide the total amount involved or transaction transaction IDs/UTRs if any?",
      "Which platform (e.g. WhatsApp, Instagram, Telegram, GPay) was primarily used by the suspect?",
      "Do you have the phone number, profile URL, or bank details of the person involved?",
      "Can you mention when exactly this incident occurred (date and time)?"
    ],
    hindi: [
      "क्या आप हमें कुल नुकसान राशि या कोई ट्रांजैक्शन आईडी (UTR) बता सकते हैं?",
      "धोखाधड़ी में किस सोशल मीडिया प्लेटफॉर्म (जैसे WhatsApp, Instagram, GPay) का मुख्य उपयोग किया गया?",
      "क्या आपके पास संदेही का मोबाइल नंबर, यूजरनेम या बैंक अकाउंट नंबर उपलब्ध है?",
      "यह घटना किस तारीख और समय पर हुई, कृपया बताएं?"
    ],
    hinglish: [
      "Kya aap total lost amount ya transaction reference/UTR number share kar sakte hain?",
      "Suspect ne contact karne ke liye kaunsa platform use kiya tha (like WhatsApp, Instagram, GPay)?",
      "Kya aapke paas suspect ka mobile number, social handle, bank details ya screenshots hain?",
      "Ye incident kis date aur time par hua tha, kya aap bata sakte hain?"
    ],
    bengali: [
      "অনুগ্রহ করে মোট কত টাকা এবং কোনো লেনদেনের তথ্য (Transaction UTR) থাকলে জানান।",
      "অভিযুক্তের কোনো ফোন নম্বর বা সোশাল মিডিয়া আইডি আপনার কাছে আছে কি?"
    ],
    tamil: [
      "மோசடியில் இழந்த தொகை அல்லது பரிவர்த்தனை எண் (UTR) ஏதேனும் இருந்தால் குறிப்பிடவும்.",
      "சந்தேக நபரின் தொடர்பு எண் அல்லது சமூக வலைதள பக்கம் ஏதேனும் உள்ளதா?"
    ],
    telugu: [
      "దయచేసి మొత్తం నష్టం విలువ లేదా ట్రాన్సాక్షన్ నంబర్ (UTR) వివరాలు చెప్పండి.",
      "సందేహస్పద వ్యక్తి యొక్క మొబైల్ నంబర్ లేదా సోషల్ మీడియా ఐడి ఉందా?"
    ],
    gujarati: [
      "કૃપા કરીને કુલ કેટલું નુકસાન થયું છે અને કોઈ ટ્રાન્ઝેક્શન વિગત (UTR) હોય તો જણાવો.",
      "શું તમારી પાસે આરોપીનો ફોન નંબર, યુઝરનેમ અથવા કોઈ સ્ક્રીનશોट છે?"
    ],
    punjabi: [
      "ਕਿਰਪਾ ਕਰਕੇ ਕੁੱਲ ਨੁਕਸਾਨ ਦੀ ਰਕਮ ਜਾਂ ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਆਈਡੀ (UTR) ਸਾਂਝੀ ਕਰੋ।",
      "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਮੁਲਜ਼ਮ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਜਾਂ ਸੋਸ਼ਲ ਮੀਡੀਆ ਪ੍ਰੋਫਾਈਲ ਲਿੰਕ ਹੈ?"
    ]
  };

  // Select Scenario
  let scenario = "general";
  if (isCritical) scenario = "critical";
  else if (isFinancial) scenario = "financial";
  else if (isStalking) scenario = "stalking";
  else if (isPhoneTheft) scenario = "phoneTheft";

  // Build response components
  const langOpenings = openings[lang] || openings["english"];
  const scenarioActions = actions[scenario] || actions["general"];
  const actionText = scenarioActions[lang] || scenarioActions["english"] || actions[scenario]["english"];
  
  // Pick opening based on length hash to ensure deterministic but varied response per conversation turn
  const openingIdx = (messageCount + history.length) % langOpenings.length;
  const openingText = langOpenings[openingIdx];

  // Pick question based on hash
  const langQuestions = questionPool[lang] || questionPool["english"];
  const questionIdx = (messageCount + history.length + 3) % langQuestions.length;
  const questionText = langQuestions[questionIdx];

  // Combine into a premium, empathetic, structured output
  return `💬 [Vanguard Support System]

${openingText}

${actionText}

❓ ${questionText}`;
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
    const welcomeText = `🔒 SECURE INTENTION & INTAKE PORTAL / सुरक्षित रिपोर्टिंग पोर्टल

Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure.
आप अपनी शिकायत किसी भी भाषा (English, Hindi, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, Punjabi) में लिख सकते हैं।

Quick Helplines / त्वरित सहायता:
• Cyber Financial Fraud (साइबर धोखाधड़ी): Call 1930 / cybercrime.gov.in
• Stolen/Lost Phone (मोबाइल चोरी): ceir.gov.in
• Emergency Safety (आपातकालीन सुरक्षा): Call 112
• Women Safety (महिला सुरक्षा): Call 1091

Please describe your issue below in detail / कृपया अपनी समस्या का विवरण नीचे लिखें:`;
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
      const welcomeText = `🔒 SECURE INTENTION & INTAKE PORTAL / सुरक्षित रिपोर्टिंग पोर्टल

Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure.
आप अपनी शिकायत किसी भी भाषा (English, Hindi, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, Punjabi) में लिख सकते हैं।

Quick Helplines / त्वरित सहायता:
• Cyber Financial Fraud (साइबर धोखाधड़ी): Call 1930 / cybercrime.gov.in
• Stolen/Lost Phone (मोबाइल चोरी): ceir.gov.in
• Emergency Safety (आपातकालीन सुरक्षा): Call 112
• Women Safety (महिला सुरक्षा): Call 1091

Please describe your issue below in detail / कृपया अपनी समस्या का विवरण नीचे लिखें:`;
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

      const welcomeText = `🔒 SECURE INTENTION & INTAKE PORTAL / सुरक्षित रिपोर्टिंग पोर्टल

Welcome to the Confidential Reporting Workspace. Your session is fully encrypted and secure.
आप अपनी शिकायत किसी भी भाषा (English, Hindi, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, Punjabi) में लिख सकते हैं।

Quick Helplines / त्वरित सहायता:
• Cyber Financial Fraud (साइबर धोखाधड़ी): Call 1930 / cybercrime.gov.in
• Stolen/Lost Phone (मोबाइल चोरी): ceir.gov.in
• Emergency Safety (आपातकालीन सुरक्षा): Call 112
• Women Safety (महिला सुरक्षा): Call 1091

Please describe your issue below in detail / कृपया अपनी समस्या का विवरण नीचे लिखें:`;
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

    // Detect language script/dialect for userContent
    const isHindiScript = /[\u0900-\u097F]/.test(userContent);
    const isBengaliScript = /[\u0980-\u09FF]/.test(userContent);
    const isGurmukhiScript = /[\u0A00-\u0A7F]/.test(userContent);
    const isGujaratiScript = /[\u0A80-\u0AFF]/.test(userContent);
    const isTamilScript = /[\u0B80-\u0BFF]/.test(userContent);
    const isTeluguScript = /[\u0C00-\u0C7F]/.test(userContent);
    const isKannadaScript = /[\u0C80-\u0CFF]/.test(userContent);
    const isMalayalamScript = /[\u0D00-\u0D7F]/.test(userContent);
    const isArabicScript = /[\u0600-\u06FF]/.test(userContent);

    const INDIC_ROMAN_WORDS = [
      "hai", "ho", "hu", "tha", "thi", "the", "me", "mein", "pe", "par", "ne", "se", "ko", 
      "mera", "meri", "mere", "mujhe", "mujhko", "hum", "humne", "aap", "aapka", "aapne", 
      "bhai", "sir", "mam", "madad", "help", "chori", "paise", "paisa", "rupees", "rs", 
      "bank", "upi", "fraud", "scam", "thagi", "link", "account", "gpay", "paytm", "phonepe", 
      "otp", "call", "number", "threat", "dhamki", "police", "complaint", "report", "lost", 
      "mobile", "phone", "photo", "video", "viral", "hack", "hacked", "hacking", "aamar", 
      "taka", "panam", "dabbulu", "khemcho", "sat sri akal", "vanakkam", "response", "nhi", 
      "nahi", "raha", "rahi", "ho", "gaya", "karke", "batao", "sunno", "dekho", "kaam", 
      "sir", "mam", "ji", "samajh", "aaya", "ache"
    ];
    const isHinglish = !isHindiScript && !isBengaliScript && !isTamilScript && !isTeluguScript && 
                      !isGujaratiScript && !isGurmukhiScript && !isKannadaScript && !isMalayalamScript && !isArabicScript &&
                      INDIC_ROMAN_WORDS.some(word => userContent.toLowerCase().includes(word));

    let detectedLang = "english";
    if (isHindiScript) detectedLang = "hindi";
    else if (isHinglish) detectedLang = "hinglish";
    else if (isBengaliScript) detectedLang = "bengali";
    else if (isTamilScript) detectedLang = "tamil";
    else if (isTeluguScript) detectedLang = "telugu";
    else if (isGujaratiScript) detectedLang = "gujarati";
    else if (isGurmukhiScript) detectedLang = "punjabi";
    else if (isKannadaScript) detectedLang = "kannada";
    else if (isMalayalamScript) detectedLang = "malayalam";
    else if (isArabicScript) detectedLang = "urdu";

    // 5. Generate reply via OpenAI or Local Fallback
    let replyContent = "";
    try {
      const messagesPrompt = [
        {
          role: "system" as const,
          content: `You are Vanguard AI Cyber & Crime Assistant, an expert, highly empathetic, NLP-driven Police & Cyber Intake Officer.

STRICT LANGUAGE & SCRIPT MIRRORING CONSTRAINT:
- The user's input language has been pre-detected as: ${detectedLang.toUpperCase()}.
- You MUST reply in the EXACT SAME LANGUAGE and SCRIPT/DIALECT as detected.
- If HINGLISH, you MUST write your entire response in Romanized Hindi/Hinglish (e.g., "Aap bilkul chinta mat kijiye. Hum aapki poori help karenge. Kya aapka paisa online transaction se fraud hua hai?"). Do NOT use Hindi script and do NOT respond in English.
- If HINDI, write in Devanagari Hindi script.
- If BENGALI, TAMIL, TELUGU, GUJARATI, PUNJABI, etc., write in that exact script.
- NEVER reply in English unless the detected language is English.

Provide real, practical helpline assistance (1930 for Cyber Financial Fraud, 112 for Emergency, CEIR for Lost Phone, 1091 for Women Safety) and ask 1-2 key follow-up questions.`
        },
        ...history.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        })),
        {
          role: "system" as const,
          content: `STRICT REQUIREMENT: The user's last message is written in ${detectedLang.toUpperCase()}. You MUST compose your entire response in ${detectedLang.toUpperCase()}. If HINGLISH, you must write only in Romanized Hindi (Hinglish). Do NOT reply in English.`
        }
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
Constraint: You MUST reply in the EXACT SAME LANGUAGE, SCRIPT, and DIALECT used by the user in their message.
The user's message is in: ${detectedLang.toUpperCase()}.
Give real helpline numbers (1930 for Cyber Fraud, 112 for Emergency, CEIR for Lost Phone, 1091 for Women Safety).

Conversation History:
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER MESSAGE: ${userContent}
STRICT INSTRUCTION: Respond in ${detectedLang.toUpperCase()} ONLY. Do NOT use English unless the detected language is English.
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
