// Depoimentos exibidos na página inicial.
// IMPORTANTE: estes são textos de exemplo (placeholder). Substitua pelos depoimentos
// reais dos seus alunos antes de divulgar a página — nome, polo e frase.
export type Testimonial = {
  id: string
  name: string
  role: string
  polo: string
  quote: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Aluno(a) do IETEO",
    role: "Turma Presencial",
    polo: "Polo Salvador",
    quote:
      "Substitua por um depoimento real: como o curso tem ajudado na sua caminhada e no seu ministério.",
  },
  {
    id: "t2",
    name: "Aluno(a) do IETEO",
    role: "Turma EAD",
    polo: "Polo Chapada",
    quote:
      "Substitua por um depoimento real: o que mais chamou atenção na estrutura das aulas e dos professores.",
  },
  {
    id: "t3",
    name: "Aluno(a) do IETEO",
    role: "Egresso(a)",
    polo: "Polo Salvador",
    quote:
      "Substitua por um depoimento real: como a formação teológica impactou seu serviço na igreja.",
  },
]
