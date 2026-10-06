import aula1 from "../bora/assets/taina-aula1.webp";
import aula2 from "../bora/assets/taina-aula2.webp";
import aula3 from "../bora/assets/taina-aula3.webp";
import aula4 from "../bora/assets/taina-aula4.webp";
import avatar from "../bora/assets/taina-avatar.webp";
import cover from "../bora/assets/taina-cover.webp";
import type { Step } from "./store";

export const VIDEO_COVER = cover;

export const TEACHER = { name: "Tainá Soares", role: "Economista", avatar };

/** Captions for the simulated lesson video, keyed by the fraction of playback where they start. */
export const CAPTIONS: [number, string][] = [
  [0, "Oi! Eu sou a Tainá, economista."],
  [0.18, "Bem-estar financeiro é diferente para cada pessoa."],
  [0.4, "Mas algumas premissas valem para todo mundo:"],
  [0.6, "controle, liberdade, foco e proteção."],
  [0.82, "Bora começar?"],
];

export const TRILHA = {
  n: 1,
  name: "Educação Financeira",
  description:
    "Educação financeira é o processo de aprendizagem sobre como gerenciar suas finanças pessoais, incluindo como economizar, investir e gastar dinheiro de forma inteligente.",
};

export const AULAS = [
  { n: 1, name: "Bem-Estar Financeiro", thumb: aula1 },
  { n: 2, name: "Inteligência Financeira", thumb: aula2 },
  { n: 3, name: "Dívidas e Fontes de Renda", thumb: aula3 },
  { n: 4, name: "Orçamento", thumb: aula4 },
];

export const AULA1_DESCRIPTION =
  "O que significa bem-estar financeiro para você? Esse conceito pode ser muito subjetivo. Nesta aula, a economista Tainá Soares apresenta premissas que são necessárias para alcançar o bem-estar financeiro, independentemente do que ele signifique para você.";

export const LOCKED_TRILHAS = [
  { n: 2, name: "Objetivos e Planejamento" },
  { n: 3, name: "Investimentos: Básico" },
  { n: 4, name: "Renda Fixa" },
  { n: 5, name: "Renda Variável e a Bolsa de Valores" },
];

export const STEP_INFO: Record<Step, { title: string; sub: string; icon: string; verb: string; cta: string }> = {
  video: { title: "Assistir à aula", sub: "Vídeo · 4 min", icon: "play-circle", verb: "assistir à aula", cta: "Assistir à aula" },
  artigo: { title: "Ler artigo", sub: "Método 50-30-20", icon: "file-alt", verb: "ler artigo", cta: "Ler artigo" },
  exercicio: { title: "Exercício prático", sub: "Divida um salário", icon: "edit-alt", verb: "fazer o exercício", cta: "Fazer exercício" },
  quiz: { title: "Quiz", sub: "3 perguntas", icon: "question-circle", verb: "responder ao", cta: "Responder ao quiz" },
};

/** The bold name after "A seguir: …" on the Home card, per step. */
export const STEP_NEXT_NAME: Record<Step, string> = {
  video: "Bem-Estar Financeiro",
  artigo: "Método 50-30-20",
  exercicio: "Divida seu salário",
  quiz: "Quiz da Aula 1",
};

export type Index = { name: string; value: number; format: (v: number) => string; change: number };

const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const one = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const INDICES: Index[] = [
  { name: "IBOV", value: 115409, format: int, change: 0.37 },
  { name: "BTC/BRL", value: 131.4, format: (v) => `${one(v)} mil`, change: -8.48 },
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
    title: "Ibovespa fecha no azul e registra a primeira alta do mês",
    source: "TradeMap",
    date: "11/08/2023",
    tone: "green",
    body: [
      "O principal índice da bolsa brasileira encerrou o pregão em leve alta de 0,37%, aos 115.409 pontos, interrompendo uma sequência de quedas no início do mês.",
      "O movimento foi puxado por empresas de commodities e bancos, enquanto o mercado acompanhava a divulgação de dados de inflação nos Estados Unidos.",
      "Para quem está começando: uma alta de um dia diz pouco sobre a tendência de longo prazo. O que importa para o investidor iniciante é entender o próprio objetivo e o prazo de cada investimento.",
    ],
  },
  {
    id: "g20",
    title: "Brasil aprova documento do G20 sobre economia digital",
    source: "Agência Brasil",
    date: "05/08/2023",
    tone: "purple",
    body: [
      "O documento reúne diretrizes sobre inclusão digital, proteção de dados e o uso de tecnologia em serviços financeiros.",
      "Na prática, temas como Pix, open finance e segurança digital devem ganhar ainda mais espaço na agenda econômica dos próximos anos.",
    ],
  },
  {
    id: "expectativas",
    title: "A importância das expectativas de mercado",
    source: "BoraInvest Explica",
    date: "08/08/2023",
    tone: "yellow",
    body: [
      "Preços de ações e taxas de juros não reagem só ao que acontece hoje, mas ao que o mercado espera que aconteça amanhã.",
      "Por isso, uma notícia boa pode derrubar uma ação, se o resultado vier abaixo do esperado. Entender essa lógica ajuda a ler o noticiário com mais calma.",
    ],
  },
  {
    id: "fundamentos",
    title: "Fundamentos de mercado",
    source: "BoraInvest Explica",
    date: "01/08/2023",
    tone: "gray",
    body: [
      "Receita, lucro, dívida e geração de caixa são alguns dos fundamentos que mostram a saúde de uma empresa.",
      "Na Trilha 5, Renda Variável e a Bolsa de Valores, você aprende a ler esses números passo a passo.",
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
    question: "Bem-estar financeiro é",
    options: [
      "Investir todo o dinheiro em um único lugar",
      "Comprar coisas caras para se sentir bem",
      "Controle sobre as finanças, liberdade para aproveitar a vida, foco nos objetivos e proteção contra imprevistos",
      "Trabalhar o máximo possível, mesmo que isso signifique sacrificar o tempo livre",
    ],
    answer: 2,
    explain: "Bem-estar financeiro tem menos a ver com quanto você ganha e mais com controle, liberdade e segurança.",
  },
  {
    color: "#B93815",
    question: "O que é o método 50‑30‑20?",
    options: [
      "Estratégia para dividir nossa receita líquida em três partes, garantindo equilíbrio financeiro",
      "Uma estratégia de investimento para iniciantes",
      "Uma técnica de contabilidade para empresas",
      "Um método para medir o desempenho financeiro de uma empresa",
    ],
    answer: 0,
    explain: "50% para necessidades, 30% para desejos e 20% para poupar e investir.",
  },
  {
    color: "#53389E",
    question: "Com R$ 3.000 de renda, quanto vai para poupar e investir?",
    options: ["R$ 300", "R$ 600", "R$ 900", "R$ 1.500"],
    answer: 1,
    explain: "20% de R$ 3.000 são R$ 600. Pequeno ou grande, o que importa é o hábito.",
  },
];
