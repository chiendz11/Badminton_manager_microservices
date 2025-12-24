const NEGATIVE_WORDS = [
  "xấu", "tệ", "bẩn", "kinh", "dở", "đéo", "shit", "ngu",
  "lừa đảo", "chửi", "thất vọng"
];

export const detectNegativeWords = (text) => {
  const lower = text.toLowerCase();
  return NEGATIVE_WORDS.some(word => lower.includes(word));
};
