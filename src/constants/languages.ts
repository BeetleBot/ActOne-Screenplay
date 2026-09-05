export interface LanguageInfo {
  code: string;
  native: string;
  example: string;
  rtl?: boolean;
  tokensPerChar?: number;
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  "English": { code: "eng_Latn", native: "English", example: "Hello, how are you?", tokensPerChar: 0.3 },
  "Spanish": { code: "spa_Latn", native: "Español", example: "Hola, ¿cómo estás?", tokensPerChar: 0.35 },
  "French": { code: "fra_Latn", native: "Français", example: "Bonjour, comment allez-vous?", tokensPerChar: 0.35 },
  "German": { code: "deu_Latn", native: "Deutsch", example: "Hallo, wie geht es Ihnen?", tokensPerChar: 0.35 },
  "Italian": { code: "ita_Latn", native: "Italiano", example: "Ciao, come stai?", tokensPerChar: 0.35 },
  "Portuguese": { code: "por_Latn", native: "Português", example: "Olá, como você está?", tokensPerChar: 0.35 },
  "Hindi (Devanagari)": { code: "hin_Deva", native: "हिन्दी", example: "नमस्ते, आप कैसे हैं?", tokensPerChar: 1.2 },
  "Tamil": { code: "tam_Taml", native: "தமிழ்", example: "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?", tokensPerChar: 1.4 },
  "Telugu": { code: "tel_Telu", native: "తెలుగు", example: "నమస్కారం, మీరు ఎలా ఉన్నారు?", tokensPerChar: 1.4 },
  "Kannada": { code: "kan_Knda", native: "ಕನ್ನಡ", example: "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?", tokensPerChar: 1.4 },
  "Malayalam": { code: "mal_Mlym", native: "മലയാളം", example: "നമസ്കാരം, സുഖമാണോ?", tokensPerChar: 1.4 },
  "Japanese": { code: "jpn_Jpan", native: "日本語", example: "こんにちは、お元気ですか？", tokensPerChar: 1.0 },
  "Chinese": { code: "zho_Hans", native: "中文", example: "你好，你怎么样？", tokensPerChar: 1.0 },
  "Korean": { code: "kor_Hang", native: "한국어", example: "안녕하세요, 어떻게 지내세요?", tokensPerChar: 1.0 },
  "Arabic": { code: "ara_Arab", native: "العربية", example: "مرحبًا، كيف حالك؟", rtl: true, tokensPerChar: 0.8 },
  "Russian": { code: "rus_Cyrl", native: "Русский", example: "Здравствуйте, как ваши дела?", tokensPerChar: 0.7 },
  "Turkish": { code: "tur_Latn", native: "Türkçe", example: "Merhaba, nasılsınız?", tokensPerChar: 0.4 },
  "Thai": { code: "tha_Thai", native: "ไทย", example: "สวัสดี คุณสบายดีไหม?", tokensPerChar: 1.3 },
};

export function getLanguageDetails(lang: string): LanguageInfo {
  return LANGUAGE_MAP[lang] || { code: lang, native: lang, example: "" };
}

