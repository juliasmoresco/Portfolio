import aula1 from "./assets/taina-aula1.webp";
import aula2 from "./assets/taina-aula2.webp";
import aula3 from "./assets/taina-aula3.webp";
import aula4 from "./assets/taina-aula4.webp";
import avatar from "./assets/taina-avatar.webp";
import cover from "./assets/taina-cover.webp";
import type { Step } from "./store";

export const VIDEO_COVER = cover;

export const TEACHER = { name: "Tainá Soares", role: "Economist", avatar };

/** Captions for the simulated lesson video, keyed by the fraction of playback where they start. */
export const CAPTIONS: [number, string][] = [
  [0, "Hi! I'm Tainá, an economist."],
  [0.18, "Financial wellbeing looks different for everyone."],
  [0.4, "But a few basics hold for all of us:"],
  [0.6, "control, freedom, focus and protection."],
  [0.82, "Shall we start?"],
];

export const TRILHA = {
  n: 1,
  name: "Financial Education",
  description:
    "Financial education is learning how to manage your personal finances, including how to save, invest and spend money wisely.",
};

export const AULAS = [
  { n: 1, name: "Financial Wellbeing", thumb: aula1 },
  { n: 2, name: "Financial Intelligence", thumb: aula2 },
  { n: 3, name: "Debt and Sources of Income", thumb: aula3 },
  { n: 4, name: "Budgeting", thumb: aula4 },
];

export const AULA1_DESCRIPTION =
  "What does financial wellbeing mean to you? It can be very personal. In this lesson, economist Tainá Soares shares the basics you need to reach it, whatever it means for you.";

export const LOCKED_TRILHAS = [
  { n: 2, name: "Goals and Planning" },
  { n: 3, name: "Investing: The Basics" },
  { n: 4, name: "Fixed Income" },
  { n: 5, name: "Stocks and the Stock Exchange" },
];

export const STEP_INFO: Record<Step, { title: string; sub: string; icon: string; verb: string; cta: string }> = {
  video: { title: "Watch the lesson", sub: "Video · 4 min", icon: "play-circle", verb: "watch", cta: "Watch the lesson" },
  artigo: { title: "Read the article", sub: "The 50-30-20 rule", icon: "file-alt", verb: "read", cta: "Read the article" },
  exercicio: { title: "Practice exercise", sub: "Split a salary", icon: "edit-alt", verb: "try", cta: "Do the exercise" },
  quiz: { title: "Quiz", sub: "3 questions", icon: "question-circle", verb: "take the", cta: "Take the quiz" },
};

/** The bold name after "Next: …" on the Home card, per step. */
export const STEP_NEXT_NAME: Record<Step, string> = {
  video: "Financial Wellbeing",
  artigo: "The 50-30-20 rule",
  exercicio: "Split your salary",
  quiz: "Lesson 1 quiz",
};

export type Index = { name: string; value: number; format: (v: number) => string; change: number };

const int = (v: number) => Math.round(v).toLocaleString("en-US");
const one = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const INDICES: Index[] = [
  { name: "IBOV", value: 115409, format: int, change: 0.37 },
  { name: "BTC/BRL", value: 131.4, format: (v) => `${one(v)}K`, change: -8.48 },
  { name: "CDI", value: 13.1, format: one, change: 0.04 },
  { name: "USD/BRL", value: 4.91, format: two, change: -0.22 },
];

export const pct = (v: number) => `${v >= 0 ? "+" : "−"}${two(Math.abs(v))}%`;

export type News = {
  id: string;
  title: string;
  source: string;
  date: string;
  tone: "green" | "purple" | "yellow" | "gray";
  body: string[];
};

export const NEWS: News[] = [
  {
    id: "ibov",
    title: "Ibovespa closes in the green with its first gain of the month",
    source: "TradeMap",
    date: "Aug 11, 2023",
    tone: "green",
    body: [
      "Brazil's main stock index ended the session up 0.37% at 115,409 points, breaking a run of losses at the start of the month.",
      "Commodity companies and banks led the move, while the market watched new inflation data from the United States.",
      "If you're just starting: one day's gain says little about the long-term trend. What matters for a new investor is knowing your own goal and the time frame of each investment.",
    ],
  },
  {
    id: "g20",
    title: "Brazil approves G20 document on the digital economy",
    source: "Agência Brasil",
    date: "Aug 5, 2023",
    tone: "purple",
    body: [
      "The document brings together guidelines on digital inclusion, data protection and the use of technology in financial services.",
      "In practice, topics like Pix, open finance and digital security should take up even more of the economic agenda in the coming years.",
    ],
  },
  {
    id: "expectativas",
    title: "Why market expectations matter",
    source: "BoraInvest Explains",
    date: "Aug 8, 2023",
    tone: "yellow",
    body: [
      "Stock prices and interest rates don't just react to what happens today, but to what the market expects to happen tomorrow.",
      "That's why good news can push a stock down if the result falls short of expectations. Understanding this helps you read the news more calmly.",
    ],
  },
  {
    id: "fundamentos",
    title: "Market fundamentals",
    source: "BoraInvest Explains",
    date: "Aug 1, 2023",
    tone: "gray",
    body: [
      "Revenue, profit, debt and cash flow are some of the fundamentals that show how healthy a company is.",
      "In Track 5, Stocks and the Stock Exchange, you learn to read these numbers step by step.",
    ],
  },
];

export type Question = {
  color: string;
  question: string;
  options: string[];
  answer: number;
  explain: string;
};

export const QUIZ: Question[] = [
  {
    color: "#3538CD",
    question: "What is financial wellbeing?",
    options: [
      "Putting all your money in one place",
      "Buying expensive things to feel good",
      "Control over your money, freedom to enjoy life, focus on your goals and protection against the unexpected",
      "Working as much as possible, even if it means giving up your free time",
    ],
    answer: 2,
    explain: "Financial wellbeing has less to do with how much you earn and more with control, freedom and security.",
  },
  {
    color: "#B93815",
    question: "What is the 50‑30‑20 rule?",
    options: [
      "A way to split your take-home pay into three parts, keeping your finances balanced",
      "An investment strategy for beginners",
      "An accounting technique for companies",
      "A way to measure a company's financial performance",
    ],
    answer: 0,
    explain: "50% for needs, 30% for wants and 20% for saving and investing.",
  },
  {
    color: "#53389E",
    question: "With an income of R$ 3,000, how much goes to saving and investing?",
    options: ["R$ 300", "R$ 600", "R$ 900", "R$ 1,500"],
    answer: 1,
    explain: "20% of R$ 3,000 is R$ 600. Small or large, what matters is the habit.",
  },
];
