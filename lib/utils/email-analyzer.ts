import type { ResultStatus } from '../types/application';

interface KeywordGroup {
  status: ResultStatus;
  keywords: string[];
  weight: number;
}

const KEYWORD_GROUPS: KeywordGroup[] = [
  {
    status: 'offer',
    keywords: ['offer', 'офер', 'пропозиція', 'congratulations', 'вітаємо', 'job offer', 'accepted'],
    weight: 3,
  },
  {
    status: 'interview',
    keywords: ['interview', 'співбесіда', 'інтерв\'ю', 'schedule a call', 'запрошуємо', 'зустріч', 'calendar invite', 'zoom', 'google meet'],
    weight: 2,
  },
  {
    status: 'test task',
    keywords: ['test task', 'тестове', 'home assignment', 'technical assessment', 'coding challenge', 'take-home'],
    weight: 2,
  },
  {
    status: 'rejected',
    keywords: ['unfortunately', 'на жаль', 'відмова', 'not moving forward', 'other candidates', 'інші кандидати', 'not selected', 'regret', 'decided not to'],
    weight: 2,
  },
];

const CONFIDENCE_THRESHOLD = 0.4;

export function analyzeEmail(subject: string, from: string, snippet: string): ResultStatus | null {
  const text = `${subject} ${snippet}`.toLowerCase();
  let bestMatch: { status: ResultStatus; score: number } | null = null;

  for (const group of KEYWORD_GROUPS) {
    let score = 0;
    for (const keyword of group.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += group.weight;
      }
    }

    const normalizedScore = Math.min(score / (group.weight * 2), 1);

    if (normalizedScore >= CONFIDENCE_THRESHOLD && (!bestMatch || normalizedScore > bestMatch.score)) {
      bestMatch = { status: group.status, score: normalizedScore };
    }
  }

  return bestMatch?.status ?? null;
}
