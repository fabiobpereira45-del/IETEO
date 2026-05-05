const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const questionsData = [
  {
    text: "1. As duas regras áureas da hermenêutica são: a Bíblia explica a própria Bíblia e a Bíblia jamais se contradiz.",
    type: "true-false",
    options: ["Verdadeiro", "Falso"],
    correct: "Verdadeiro"
  },
  {
    text: "2. A pergunta \"QUANDO\" é importante para entender o contexto de quê?",
    type: "multiple-choice",
    options: ["O estilo literário do autor", "A época em que o texto foi escrito", "O idioma original do livro", "O destinatário da carta"],
    correct: "A época em que o texto foi escrito"
  },
  {
    text: "3. O Novo Testamento foi escrito principalmente em qual versão do grego?",
    type: "multiple-choice",
    options: ["Grego clássico", "Grego koiné", "Grego arcaico", "Grego medieval"],
    correct: "Grego koiné"
  },
  {
    text: "4. O contexto histórico ajuda a entender por que os judeus não se davam com os samaritanos, pois estes eram um povo de origem mista.",
    type: "true-false",
    options: ["Verdadeiro", "Falso"],
    correct: "Verdadeiro"
  },
  {
    text: "5. O que é Exegese?",
    type: "multiple-choice",
    options: ["Inserir o pensamento do leitor no texto", "Extrair o sentido que o texto quer comunicar", "Uma tradução literal da Bíblia", "O estudo das figuras de linguagem"],
    correct: "Extrair o sentido que o texto quer comunicar"
  },
  {
    text: "6. O livro mais recente da Bíblia foi escrito há aproximadamente quantos anos?",
    type: "multiple-choice",
    options: ["500 anos", "1.000 anos", "1.900 anos", "3.500 anos"],
    correct: "1.900 anos"
  },
  {
    text: "7. O que é Eisegese?",
    type: "multiple-choice",
    options: ["A interpretação fiel ao texto original", "Inserir o próprio pensamento no texto bíblico", "O estudo do contexto histórico", "A análise gramatical do texto"],
    correct: "Inserir o próprio pensamento no texto bíblico"
  },
  {
    text: "8. João escreveu sua primeira carta para combater qual heresia?",
    type: "multiple-choice",
    options: ["O arianismo", "O donatismo", "O gnosticismo do primeiro século", "O pelagianismo"],
    correct: "O gnosticismo do primeiro século"
  },
  {
    text: "9. O contexto remoto pode ser encontrado em qual lugar?",
    type: "multiple-choice",
    options: ["Apenas no mesmo versículo", "No mesmo livro ou até em outro livro bíblico", "Somente em dicionários bíblicos", "Apenas em comentários teológicos"],
    correct: "No mesmo livro ou até em outro livro bíblico"
  },
  {
    text: "10. O que é Hermenêutica?",
    type: "multiple-choice",
    options: ["A arte de pregar sermões", "A ciência da interpretação de textos", "O estudo da história da igreja", "A tradução de línguas bíblicas"],
    correct: "A ciência da interpretação de textos"
  }
];

async function createExam() {
  console.log('Finding discipline...');
  let disciplineId = null;
  const { data: dData } = await supabase.from('disciplines').select('id, name').ilike('name', '%hermeneutica%').limit(1).maybeSingle();
  
  if (dData) {
    disciplineId = dData.id;
    console.log('Found discipline:', dData.name, disciplineId);
  } else {
    // Try without accents
    const { data: dData2 } = await supabase.from('disciplines').select('id, name').ilike('name', '%hermenêutica%').limit(1).maybeSingle();
    if (dData2) {
      disciplineId = dData2.id;
      console.log('Found discipline:', dData2.name, disciplineId);
    } else {
      console.log('Discipline not found. Creating a general assessment.');
    }
  }

  const questionIds = [];
  
  console.log('Creating questions...');
  for (const q of questionsData) {
    const qId = uid();
    const dbQuestion = {
      id: qId,
      discipline_id: disciplineId,
      type: q.type,
      text: q.text,
      choices: { options: q.options.map(opt => ({ id: uid(), text: opt })), matchingPairs: [] },
      correct_answer: q.correct,
      points: 1,
      created_at: new Date().toISOString()
    };
    
    const { error: qError } = await supabase.from('questions').insert(dbQuestion);
    if (qError) {
      console.error('Error inserting question:', qError);
      return;
    }
    questionIds.push(qId);
  }
  
  console.log('Creating assessment...');
  const assessment = {
    id: uid(),
    title: 'Avaliação de Hermenêutica (Revisada)',
    discipline_id: disciplineId,
    professor: 'Professor Mestre',
    institution: 'IETEO',
    question_ids: questionIds,
    points_per_question: 1,
    total_points: 10,
    open_at: new Date().toISOString(),
    close_at: null,
    is_published: true,
    shuffle_variants: false,
    modality: 'public',
    created_at: new Date().toISOString()
  };
  
  const { error: aError } = await supabase.from('assessments').insert(assessment);
  if (aError) {
    console.error('Error inserting assessment:', aError);
  } else {
    console.log('Assessment created successfully!');
  }
}

createExam();
