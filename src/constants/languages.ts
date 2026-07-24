const LANGUAGE_MAP: Record<string, { code: string; native: string; example: string }> = {
  "English": { code: "eng_Latn", native: "English", example: "Hello, how are you?" },
  "Spanish": { code: "spa_Latn", native: "Español", example: "Hola, ¿cómo estás?" },
  "French": { code: "fra_Latn", native: "Français", example: "Bonjour, comment allez-vous?" },
  "German": { code: "deu_Latn", native: "Deutsch", example: "Hallo, wie geht es Ihnen?" },
  "Italian": { code: "ita_Latn", native: "Italiano", example: "Ciao, come stai?" },
  "Portuguese": { code: "por_Latn", native: "Português", example: "Olá, como você está?" },
  "Hindi (Devanagari)": { code: "hin_Deva", native: "हिन्दी", example: "नमस्ते, आप कैसे हैं?" },
  "Tamil": { code: "tam_Taml", native: "தமிழ்", example: "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?" },
  "Japanese": { code: "jpn_Jpan", native: "日本語", example: "こんにちは、お元気ですか？" },
  "Chinese": { code: "zho_Hans", native: "中文", example: "你好，你怎么样？" },
};

export function getLanguageDetails(lang: string) {
  return LANGUAGE_MAP[lang] || { code: lang, native: lang, example: "" };
}
