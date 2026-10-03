"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Download,
  ChevronRight,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Check,
  MapPin,
  Phone,
  QrCode
} from "lucide-react"

// Dados extraídos diretamente da Grade Curricular Oficial (PDF IETEO)
const SEMESTERS = [
  {
    number: "1º Semestre",
    badge: "Fundamentos & Prática Ministerial",
    description: "Estruturação bíblica, regras de interpretação das Escrituras e capacitação para proclamação fiel.",
    disciplines: [
      { name: "Hermenêutica", professor: "Jonas Azevedo", desc: "Princípios exegéticos e regras de interpretação contextual do texto sagrado." },
      { name: "Homilética", professor: "Aislan Bastos", desc: "A arte e ciência da preparação, estruturação e proclamação do sermão bíblico." },
      { name: "Seitas e Heresias", professor: "Fabio Barreto", desc: "Apologética cristã, discernimento doutrinário e defesa da fé ortodoxa." },
      { name: "Liderança e Ética Cristã", professor: "Jonas Azevedo", desc: "Princípios ministeriais de conduta, caráter pastoral e integridade eclesiástica." },
      { name: "Evangelismo e Missiologia", professor: "Edilton Barreto", desc: "Estratégias contemporâneas e bíblicas para expansão transcultural do Evangelho." },
      { name: "Teologia do Novo Testamento", professor: "André Fonseca", desc: "Visão panorâmica dos evangelhos, teologia paulina e cartas pastorais." },
    ]
  },
  {
    number: "2º Semestre",
    badge: "Teologia Sistemática & História",
    description: "Aprofundamento nas doutrinas magnas sobre Deus, o Messias, as Escrituras e a trajetória dos santos.",
    disciplines: [
      { name: "História da Igreja", professor: "Adriano Paiva", desc: "Dos primórdios apostólicos, reforma protestante aos desafios contemporâneos." },
      { name: "Paracletologia (Doutrina do Espírito Santo)", professor: "Aislan Bastos", desc: "Pessoa divina, batismo, fruto e manifestações dos dons carismáticos." },
      { name: "Bibliologia (Doutrina das Escrituras)", professor: "Pb. Fábio Barreto", desc: "Canonicidade, inspiração plenária, autoridade e inerrância da Bíblia." },
      { name: "Teontologia (Doutrina de Deus)", professor: "Fernando Campos", desc: "Atributos incomunicáveis, soberania, providência e o mistério da Trindade." },
      { name: "Cristologia (Doutrina de Cristo)", professor: "Nicodemos Glória", desc: "Dupla natureza do Verbo encarnado, ministério terreno e mediação eterna." },
      { name: "Angelologia (Doutrina dos Anjos)", professor: "Roberto Cerqueira", desc: "Natureza angélica bíblica, cosmovisão espiritual e a vitória da cruz." },
    ]
  },
  {
    number: "3º Semestre",
    badge: "Doutrinas do Homem, Salvação & Escatologia",
    description: "Compreensão da condição humana, a redenção suprema em Cristo, gestão e as últimas coisas.",
    disciplines: [
      { name: "Antropologia e Hamartiologia", professor: "Jeferson Pereira", desc: "A criação do ser humano à imagem de Deus, a queda e os efeitos do pecado." },
      { name: "Soteriologia (Doutrina da Salvação)", professor: "Jonas Azevedo", desc: "Graça redentora, eleição, justificação, santificação e glorificação final." },
      { name: "Geografia Bíblica", professor: "Juscelino Lima", desc: "Topografia, arqueologia e rotas dos patriarcas, profetas e apóstolos." },
      { name: "Eclesiologia (Doutrina da Igreja)", professor: "Robison Adorno", desc: "A noiva de Cristo: governo, ordenanças sagradas e chamado ministerial." },
      { name: "Gestão Eclesiástica", professor: "Sirleide Almeida", desc: "Planejamento pastoral estratégico, administração legal e saúde eclesiástica." },
      { name: "Escatologia (Doutrina das últimas coisas)", professor: "Jonas Azevedo", desc: "As profecias bíblicas, o arrebatamento, tribulação, milênio e a Nova Jerusalém." },
    ]
  }
]

const FAQS = [
  {
    question: "Como funciona o pagamento da mensalidade de R$ 79,99?",
    answer: "A mensalidade do IETEO é de valor fixo e acessível (apenas R$ 79,99 mensais). O pagamento pode ser feito com total comodidade via PIX, Cartão de Crédito ou Boleto bancário através da nossa área financeira segura."
  },
  {
    question: "O curso é voltado apenas para pastores ou qualquer membro?",
    answer: "O curso é para todos os cristãos que desejam aprofundar seu conhecimento na Palavra de Deus: líderes, professores de EBD, diáconos, missionários, jovens e todo servo que queira entender com rigor a Teologia Bíblica e Sistemática."
  },
  {
    question: "Recebo certificado ao final do curso?",
    answer: "Sim! Ao concluir com aproveitamento os 3 semestres curriculares, você recebe o Certificado e Histórico Escolar Oficial emitido pelo Instituto de Ensino Teológico (IETEO), atestando sua formação acadêmica e ministerial."
  },
  {
    question: "Como posso estudar (presencial ou online)?",
    answer: "O IETEO disponibiliza turmas nos polos presenciais e também suporte para acompanhamento no formato EAD/Online, com acesso à plataforma onde você acompanha o calendário, avaliações e materiais didáticos."
  },
  {
    question: "Como faço a minha matrícula agora?",
    answer: "Basta clicar em qualquer botão 'Garantir Minha Vaga' ou 'Fazer Matrícula'. Você preencherá seus dados básicos, escolherá a turma/turno do seu polo e já receberá o acesso imediato ao sistema."
  }
]

export default function CursoLandingPage() {
  const [activeSemester, setActiveSemester] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-amber-600 selection:text-white font-sans">
      
      {/* Barra de Aviso Superior */}
      <div className="bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#450a0a] border-b border-amber-500/20 text-center py-2 px-4 text-xs sm:text-sm font-semibold text-amber-200 tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
        <span>MATRÍCULAS ABERTAS PARA A NOVA TURMA — Vagas limitadas por polo com valor promocional!</span>
      </div>

      {/* Header Navegação */}
      <header className="sticky top-0 z-50 bg-[#0b1220]/95 backdrop-blur-md border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-16 h-16 shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/ieteo-logo-transparent.png"
                alt="Brasão Oficial IETEO"
                className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]"
              />
            </div>
            <div>
              <span className="block text-xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                IETEO
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-amber-400/90 font-medium">
                Instituto de Ensino Teológico
              </span>
              <span className="block text-[10px] text-slate-500">
                Aleteia · Sophia · Pistis
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#sobre" className="hover:text-amber-400 transition-colors">O Instituto</a>
            <a href="#grade" className="hover:text-amber-400 transition-colors">Grade Curricular</a>
            <a href="#cartaz" className="hover:text-amber-400 transition-colors">Cartaz Oficial</a>
            <a href="#investimento" className="hover:text-amber-400 transition-colors">Mensalidade</a>
            <a href="#duvidas" className="hover:text-amber-400 transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            >
              Área do Aluno
            </Link>
            <Link
              href="/registrar"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Matricule-se Já</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 overflow-hidden">
        {/* Background Gradients & Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#7f1d1d]/30 via-amber-700/10 to-transparent blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-950/40 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Texto Hero */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Formação Ministerial & Teológica Rigorosa</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
                Aprofunde sua vocação e conheça as Escrituras com <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">autoridade bíblica</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                O <strong>Instituto de Ensino Teológico (IETEO)</strong> capacita líderes, obreiros e estudantes da Palavra com fidelidade exegética, ortodoxia teológica e prática eclesiástica transformadora.
              </p>

              {/* Destaque da Mensalidade Hero */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#172033] to-[#1e131d] border border-amber-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-wider text-amber-300/80 font-bold">Investimento Acessível</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-white">R$ 79,99</span>
                      <span className="text-xs sm:text-sm text-slate-400 font-medium">/ mês</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-300 text-center sm:text-right space-y-1">
                  <div className="text-[11px] text-slate-400">18 mensalidades · R$ 79,99/mês</div>
                  <div className="text-[11px] text-amber-400/80">+ Taxa de matrícula: R$ 79,99 (única)</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/registrar"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base px-8 py-4 rounded-xl shadow-[0_10px_30px_rgba(245,158,11,0.35)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5"
                >
                  <span>Matricule-se Já</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#grade"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 font-semibold text-base px-6 py-4 rounded-xl transition-all"
                >
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>Ver Grade Curricular</span>
                </a>
              </div>

              {/* Polos e Contato */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">Polos: Salvador &amp; Chapada</span>
                </div>
                <div className="h-3 w-px bg-slate-700" />
                <a href="tel:71987483103" className="flex items-center gap-1.5 hover:text-amber-300 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>(71) 98748-3103</span>
                </a>
              </div>

              {/* Selos de Confiança */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs text-slate-400 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Certificado Válido</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Professores Qualificados</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Presencial ou Online</span>
                </div>
              </div>

            </div>

            {/* Imagem / Cartaz Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group max-w-sm sm:max-w-md w-full">
                
                {/* Glow de fundo */}
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-[#7f1d1d] rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
                
                {/* Cartaz Container */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-[#0d1527] shadow-2xl">
                  <div className="relative aspect-[3/4] w-full">
                    <img
                      src="/cartaz-ieteo-oficial.jpg"
                      alt="Cartaz Oficial do Curso IETEO com Brasão e Mensalidade R$ 79,99"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Barra de ação sob o cartaz */}
                  <div className="p-4 bg-[#0a0f1d] border-t border-amber-500/20 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cartaz Oficial de Divulgação</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Download em alta qualidade</div>
                    </div>
                    <a
                      href="/cartaz-ieteo-oficial.jpg"
                      download="Cartaz_IETEO_Matriculas_Abertas.jpg"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* NÚMEROS E IMPACTO */}
      <section className="border-y border-white/10 bg-[#0a101d]/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">18</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">Disciplinas Teológicas</div>
              <div className="text-[11px] text-slate-500">Exegese, História e Doutrinas</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">3</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">Semestres Completos</div>
              <div className="text-[11px] text-slate-500">Grade curricular balanceada</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">R$ 79,99</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">Mensalidade Única</div>
              <div className="text-[11px] text-slate-500">Valor fixo sem reajustes ocultos</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">100%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">Fidelidade Bíblica</div>
              <div className="text-[11px] text-slate-500">Ortodoxia cristã inegociável</div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS / SOBRE */}
      <section id="sobre" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            Compromisso com o Reino
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Por que escolher a formação no IETEO?
          </h2>
          <p className="text-slate-400 text-base">
            O Instituto de Ensino Teológico alia a solidez dos pais da fé à didática moderna necessária para os desafios da igreja no século XXI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-2xl bg-[#0f172a]/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Ortodoxia & Teologia Pura</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sem modismos ou heresias contemporâneas. Nosso currículo abrange Hermenêutica rigorosa, Bibliologia, Teontologia, Cristologia e Escatologia bíblica.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0f172a]/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Corpo Docente de Referência</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Aulas ministradas por pastores, presbíteros e professores dedicados com ampla experiência no ministério da palavra, pregação e cuidado pastoral.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0f172a]/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Capacitação Eclesiástica Real</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Você não apenas aprende teorias, mas desenvolve Homilética prática, Liderança, Evangelismo, Missões e Gestão Eclesiástica para sua congregação.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0f172a]/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Material Didático Incluso</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              O aluno recebe <strong className="text-amber-300">6 livros físicos</strong>, cada um com 3 disciplinas, contemplando todo o curso. O material é <strong className="text-amber-300">vitalício</strong>: fica definitivamente com o aluno para compor sua biblioteca pessoal.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0f172a]/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Biblioteca Física — Polo Salvador</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              O Instituto mantém uma <strong className="text-amber-300">biblioteca física</strong> no Polo Salvador, disponível exclusivamente para retirada presencial pelos alunos matriculados neste polo.
            </p>
            <div className="mt-4 text-[11px] text-amber-400/70 font-medium flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span>Apenas retirada presencial — Polo Salvador</span>
            </div>
          </div>

        </div>
      </section>

      {/* GRADE CURRICULAR COMPLETA (Extraída do PDF) */}
      <section id="grade" className="py-20 bg-[#080d17] border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              Estrutura Pedagógica Completa
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Grade Curricular dos 3 Semestres
            </h2>
            <p className="text-slate-400 text-base">
              Conheça exatamente as matérias e os respectivos professores de cada etapa do seu curso.
            </p>

            {/* Seletor de Semestres */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
              {SEMESTERS.map((sem, idx) => (
                <button
                  key={sem.number}
                  onClick={() => setActiveSemester(idx)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    activeSemester === idx
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105"
                      : "bg-[#11192b] text-slate-300 hover:bg-[#1a253d] border border-white/10"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{sem.number}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo do Semestre Ativo */}
          <div className="mt-8 bg-[#0f172a]/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/10 gap-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 block mb-1">
                  {SEMESTERS[activeSemester].number}
                </span>
                <h3 className="text-2xl font-black text-white">
                  {SEMESTERS[activeSemester].badge}
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xl">
                  {SEMESTERS[activeSemester].description}
                </p>
              </div>
              <div className="shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center">
                <div>6 Disciplinas neste Semestre</div>
                <div className="text-[10px] text-amber-400/70 font-medium mt-0.5">+12 nos outros semestres (18 no total)</div>
              </div>
            </div>

            {/* Grid das Disciplinas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SEMESTERS[activeSemester].disciplines.map((d, index) => (
                <div
                  key={d.name}
                  className="p-5 rounded-2xl bg-[#090f1d] border border-white/10 hover:border-amber-500/50 hover:bg-[#0c1426] transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-mono text-amber-400 font-bold">Módulo 0{index + 1}</span>
                      <BookOpen className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <h4 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                      {d.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {d.desc}
                    </p>
                  </div>
                  
                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Docente:</span>
                    <span className="font-semibold text-amber-300/90">{d.professor}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400 text-center sm:text-left">
                Todas as disciplinas acompanham apostilas digitais e testes de fixação teológica.
              </span>
              <Link
                href="/registrar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                <span>Inscrever-se Nesta Grade</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* SEÇÃO DO CARTAZ OFICIAL EM DESTAQUE */}
      <section id="cartaz" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#1b090f] via-[#0f172a] to-[#0c1322] border-2 border-amber-500/40 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider">
                Material Promocional do Instituto
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Ajude a divulgar o Instituto em sua igreja e redes sociais!
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Desenvolvemos o cartaz oficial do IETEO com a identidade visual nobre em azul marinho, bordô e dourado, destacando o brasão oficial, as principais matérias e o valor promocional de <strong>R$ 79,99</strong>.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Ideal para compartilhar nos grupos de WhatsApp e congregações.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Pronto para impressão em formato cartaz A4 ou A3 para o mural da igreja.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Comprovado para atrair novos alunos e vocacionados.</span>
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="/cartaz-ieteo-oficial.jpg"
                  download="Cartaz_Oficial_IETEO.jpg"
                  className="inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 rounded-xl shadow-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>Baixar Cartaz em Alta Resolução</span>
                </a>
                <Link
                  href="/registrar"
                  className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 font-bold px-4 py-3 text-sm underline underline-offset-4"
                >
                  <span>Ir direto para formulário de inscrição</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="relative max-w-xs rounded-2xl overflow-hidden shadow-2xl border border-amber-500/50 hover:scale-105 transition-transform duration-300">
                <img
                  src="/cartaz-ieteo-oficial.jpg"
                  alt="Cartaz IETEO"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PLANO & INVESTIMENTO */}
      <section id="investimento" className="py-20 bg-[#070b13] border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="space-y-4 mb-12">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
              Transparência e Acessibilidade
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Investimento no seu Ministério
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Teologia de alta qualidade acessível a todos os irmãos e líderes.
            </p>
          </div>

          {/* Card Principal de Preço */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#131b2e] to-[#0c1220] border-2 border-amber-500/60 p-8 sm:p-12 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase px-5 py-2 rounded-full tracking-wider shadow-lg">
              Condição Especial para Nova Turma
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Mensalidade Regular do Curso
              </div>
              <div className="flex items-center justify-center gap-2 my-4">
                <span className="text-2xl sm:text-3xl font-bold text-amber-400">R$</span>
                <span className="text-6xl sm:text-7xl font-black text-white tracking-tight">79</span>
                <div className="text-left">
                  <span className="text-2xl sm:text-3xl font-black text-white">,99</span>
                  <span className="block text-xs text-slate-400 font-medium">/ ao mês</span>
                </div>
              </div>
              <p className="text-xs text-amber-300 font-medium mb-4">
                Sem taxa surpresa • Sem fidelidade abusiva • Acesso a todas as 18 disciplinas
              </p>

              {/* Detalhamento de pagamento */}
              <div className="bg-[#0a0f1c] border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-400">
                <div className="font-semibold text-slate-300 text-sm mb-3">Resumo do investimento total:</div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span>18 mensalidades de R$ 79,99</span>
                  <span className="text-white font-bold">R$ 1.439,82</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa de matrícula <span className="text-amber-400/80">(única, não recorrente)</span></span>
                  <span className="text-white font-bold">R$ 79,99</span>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-slate-500 leading-relaxed">
                  * As mensalidades correspondem às 18 disciplinas distribuídas em 3 semestres (6 disciplinas por semestre). A taxa de matrícula é paga uma única vez no ato da inscrição.
                </div>
              </div>
            </div>

            {/* Material Didático */}
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-5 text-left mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="font-bold text-white text-sm">Material Didático Incluso</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cada aluno recebe <strong className="text-amber-300">6 livros físicos</strong> — um por semestre, com 3 disciplinas cada — cobrindo todo o conteúdo do curso. O material é <strong className="text-amber-300">vitalício</strong>: fica definitivamente com o aluno para compor sua biblioteca pessoal.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 font-medium">6 livros físicos</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 font-medium">3 disciplinas por livro</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-medium">Seu para sempre ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-10 py-8 border-y border-white/10 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>18 Disciplinas teológicas completas</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Professores pastores e mestres</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>6 livros didáticos físicos inclusos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Avaliações e testes de conhecimento</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Certificado e Histórico de Conclusão</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Pagamento facilitado no PIX ou Cartão</span>
              </div>
            </div>

            <Link
              href="/registrar"
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-lg px-8 py-5 rounded-2xl shadow-[0_10px_35px_rgba(245,158,11,0.4)] transition-all transform hover:-translate-y-1"
            >
              <span>Fazer Minha Matrícula Agora</span>
              <ArrowRight className="w-6 h-6" />
            </Link>

            <div className="mt-4 text-[12px] text-slate-500">
              Processamento seguro e garantia de vaga imediata na turma selecionada.
            </div>

          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="duvidas" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl font-black text-white">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-white/10 bg-[#0f172a]/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-slate-200 hover:text-white"
                >
                  <span>{faq.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-amber-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* BANNER FINAL CTA */}
      <section className="py-16 bg-gradient-to-r from-[#450a0a] via-[#1e293b] to-[#0f172a] border-t border-amber-500/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            {/* Texto CTA */}
            <div className="lg:col-span-2 space-y-5 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Pronto para dar o próximo passo na sua jornada bíblica?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base">
                As turmas estão com matrículas abertas. Garanta sua vaga e comece a estudar com quem ama e ensina a Palavra com profundidade.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Polo Salvador</span>
                </div>
                <div className="h-4 w-px bg-slate-600" />
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Polo Chapada</span>
                </div>
                <div className="h-4 w-px bg-slate-600" />
                <a href="tel:71987483103" className="flex items-center gap-2 text-amber-300 hover:text-amber-200 font-semibold">
                  <Phone className="w-4 h-4" />
                  <span>(71) 98748-3103</span>
                </a>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
                <Link
                  href="/registrar"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-8 py-4 rounded-xl text-base shadow-xl transition-all"
                >
                  <span>Matricule-se Já — R$ 79,99/mês</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-4 rounded-xl text-sm border border-white/20 transition-all"
                >
                  <span>Acessar Painel Principal</span>
                </Link>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-amber-500/60">
                {/* QR Code via API pública — aponta para ieteo.vercel.app */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://ieteo.vercel.app/&color=0f172a&bgcolor=ffffff"
                  alt="QR Code IETEO — ieteo.vercel.app"
                  width={160}
                  height={160}
                  className="block"
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Acesse pelo celular</div>
                <div className="text-[11px] text-slate-400 mt-0.5">ieteo.vercel.app</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#050811] py-10 border-t border-white/10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo + Nome */}
            <div className="flex items-center gap-3">
              <img
                src="/ieteo-logo-transparent.png"
                alt="Brasão IETEO"
                className="w-14 h-14 object-contain"
              />
              <div>
                <div className="text-slate-300 font-bold text-sm">IETEO — Instituto de Ensino Teológico</div>
                <div className="text-[11px] text-amber-500/80 mt-0.5">Aleteia · Sophia · Pistis</div>
              </div>
            </div>

            {/* Contato e Polos */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-[12px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                <span>Polo Salvador &amp; Polo Chapada</span>
              </div>
              <div className="hidden sm:block h-3 w-px bg-slate-700" />
              <a href="tel:71987483103" className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors">
                <Phone className="w-3.5 h-3.5 text-amber-500/70" />
                <span>(71) 98748-3103</span>
              </a>
              <div className="hidden sm:block h-3 w-px bg-slate-700" />
              <a href="https://ieteo.vercel.app" target="_blank" rel="noopener noreferrer" className="text-amber-500/70 hover:text-amber-400 transition-colors">
                ieteo.vercel.app
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center sm:text-right">
              <div>© {new Date().getFullYear()} IETEO. Todos os direitos reservados.</div>
              <div className="mt-1 text-[11px] text-slate-600">
                Formação Teológica Cristã com Base nas Sagradas Escrituras.
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
