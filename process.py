import re
import json
import uuid
from datetime import datetime

raw_text = """Unidade 1 - O Livro de Jó
Capítulo 1: O Livro de Jó – Uma Análise Teológica e Literária
Múltipla Escolha: De acordo com a etimologia do nome Jó, quais são os dois principais sentidos atribuídos ao termo derivado do hebraico 'iyvov'?  a) "Abençoado" e "Restaurado". b) "Retorno" (arrependimento) e "Odiado" (perseguido). c) "Justo" e "Provado". d) "Guerreiro" e "Vitorioso".

Múltipla Escolha: Qual hipótese de autoria é tradicionalmente atribuída pela tradição judaica, sugerindo que o autor conheceu a história durante seu tempo em Midiã?  a) Eliú. b) Salomão. c) Moisés. d) O próprio Jó.

Múltipla Escolha: A estrutura literária do livro de Jó é composta por uma "moldura" e um "núcleo". Como esses elementos são divididos?  a) Moldura em poesia e núcleo em prosa. b) Moldura em prosa (Prólogo/Epílogo) e núcleo em poesia (Diálogos). c) Todo o livro é escrito em prosa histórica. d) O livro não possui divisões literárias claras.

Múltipla Escolha: Em qual seção do livro de Jó ocorre a manifestação divina através do redemoinho?  a) Capítulos 1-2 (Provação). b) Capítulos 3-27 (Diálogos). c) Capítulos 38-41 (Resposta de Deus). d) Capítulo 42 (Restauração).

Alternativa INCORRETA: Sobre o contexto histórico e a composição de Jó, assinale a opção INCORRETA:  a) Jó é situado no período patriarcal, evidenciado por sua longevidade e riqueza medida em gados. b) O livro apresenta um estilo de vida nômade, sem a estrutura do sacerdócio levítico. c) A obra utiliza recursos poéticos como antíteses e paralelismos complexos. d) O livro foi escrito obrigatoriamente durante o exílio babilônico para explicar o sofrimento do povo.

Capítulo 2: O Sofrimento do Justo
Múltipla Escolha: Os termos hebraicos Tam e Yashar descrevem o caráter de Jó. O que eles significam, respectivamente?  a) Próspero e Rico. b) Íntegro (sem dolo) e Reto (sem sinuosidades). c) Sábio e Conhecido. d) Paciente e Resiliente.

Múltipla Escolha: Quais grupos foram responsáveis pelos ataques coordenados que dizimaram os bens e servos de Jó?  a) Egípcios e Filisteus. b) Assírios e Babilônios. c) Sabeus e Caldeus. d) Midianitas e Amonitas.

Múltipla Escolha: Qual foi a atitude imediata de Jó após receber a notícia da morte de seus dez filhos?  a) Ele amaldiçoou o dia de seu nascimento. b) Ele buscou vingança contra os sabeus. c) Ele prostrou-se em terra e adorou, reconhecendo a soberania de Deus. d) Ele questionou imediatamente a justiça divina com seus amigos.

Múltipla Escolha: Jó ensina que a verdadeira devoção transcende circunstâncias favoráveis. Qual frase resume sua teologia da soberania em meio à dor física?  a) "Pele por pele, e tudo quanto o homem tem dará pela sua vida." b) "Receberemos o bem de Deus, e não receberíamos o mal?" c) "Onde estava Deus quando eu nasci?" d) "Minha justiça é maior que a de Deus."

Verdadeiro ou Falso: Diante da aflição física e do isolamento, Jó cedeu à sugestão de sua esposa e pecou com seus lábios contra Deus. ( )

Capítulo 3: A Teologia da Acusação
Múltipla Escolha: Qual é a chamada "sétima calamidade" enfrentada por Jó, segundo o material?  a) A perda da saúde física. b) O julgamento teológico de seus amigos. c) O abandono de sua esposa. d) A destruição de sua casa pelo vento.

Múltipla Escolha: Qual era o argumento central de Elifaz em seus discursos?  a) A Teologia da Graça Incondicional. b) A Teologia da Retribuição (sofrimento como resultado direto de pecados). c) O Deísmo (Deus não se importa com os homens). d) A Teologia da Restauração Imediata.

Múltipla Escolha: Qual foi a astuta acusação de Satanás contra Jó no conselho celestial?  a) Que Jó era um pecador oculto. b) Que Jó odiava seus amigos. c) Que sua integridade era uma transação comercial baseada em favores divinos. d) Que Jó não cuidava dos órfãos e viúvas.

Múltipla Escolha: Como o material descreve a visão de Zofar sobre a relação entre Deus e o homem?
a) Deus é imanente e caminha com o homem.
b) Deus é tão transcendente que seria impossível qualquer contato direto ou preocupação com o sofrimento humano.
c) O sofrimento é sempre pedagógico.
d) O homem pode alcançar a perfeição do Todo-Poderoso por esforço próprio.

Alternativa INCORRETA: Sobre as acusações dos amigos de Jó, assinale a opção INCORRETA:  a) Elifaz acusou Jó de cometer grandes maldades contra viúvas e órfãos sem base factual. b) Os amigos tentaram enquadrar a justiça de Deus em um sistema humano de mérito. c) Seus discursos eram repletos de empatia e consolo espiritual. d) As acusações assemelhavam-se, em natureza, às calúnias de Satanás.

Capítulo 4: A Teologia de Jó
Múltipla Escolha: Jó desafia a visão simplista de seus amigos. O que ele clama em Jó 6:2-3 ao sentir que sua dor foi ignorada?  a) Por perdão por pecados ocultos. b) Por uma avaliação honesta de sua mágoa em uma balança. c) Pela morte imediata. d) Pela destruição de seus acusadores.

Múltipla Escolha: No processo de seu sofrimento, Jó utiliza uma metáfora de mineração para descrever o resultado de sua provação. Qual é ela?  a) "Sairei como o ferro forjado." b) "Sairei como a prata refinada." c) "Provando-me ele, sairei como o ouro." d) "Sairei como o diamante bruto."

Múltipla Escolha: Jó reconhece a limitação humana diante da majestade de Deus. Como ele descreve todo o conhecimento humano em relação ao poder divino?  a) Como a sabedoria dos séculos. b) Como apenas a "orla dos Seus caminhos". c) Como um livro aberto diante do Criador. d) Como uma luz que brilha nas trevas.

Múltipla Escolha: Segundo Jó 28:28, onde se encontra a verdadeira sabedoria e inteligência?
a) Na exploração de minas de ouro e pedras preciosas.
b) No estudo das tradições dos antepassados.
c) No temor do Senhor e no apartar-se do mal.
d) No sucesso material e na ausência de sofrimento.

Verdadeiro ou Falso: Em sua defesa final (capítulos 29-31), Jó admite ter cometido pecados como opressão aos pobres e idolatria, justificando assim seu sofrimento. ( )

Capítulo 5: A Soberania de Deus
Múltipla Escolha: Qual é o significado do nome de Eliú e qual sua principal contribuição teológica?  a) "Meu Deus é forte"; defende a retribuição imediata. b) "Ele é nosso Deus"; defende o sofrimento como ferramenta pedagógica. c) "Amigo de Deus"; foca na restauração material. d) "Filho de Barachel"; foca na tradição dos anciãos.

Múltipla Escolha: Quando Deus finalmente responde a Jó, Ele o faz através de:  a) Uma lista de pecados que Jó deveria confessar. b) Uma explicação lógica detalhada sobre o motivo de sua perda. c) Uma série de perguntas retóricas que revelam Sua majestade e a limitação humana. d) Um silêncio prolongado que confirma a inocência de Jó.

Múltipla Escolha: Qual foi a mudança radical na visão de Jó sobre Deus após a Teofania?
a) Ele passou a crer que Deus não se envolve nos assuntos humanos.
b) Ele percebeu que a religiosidade teórica ("ouvir falar") foi substituída por uma experiência real ("agora te veem os meus olhos").
c) Ele concluiu que o sofrimento é sempre injusto.
d) Ele decidiu nunca mais falar com seus amigos.

Múltipla Escolha: O que Jó reconhece sobre os planos de Deus no capítulo 42:2?
a) Que os planos de Deus dependem da fidelidade humana.
b) Que o homem pode frustrar a vontade divina com seu pecado.
c) Que Deus tudo pode e nenhum de Seus planos pode ser frustrado.
d) Que Deus altera Seus planos conforme as orações dos justos.

Alternativa INCORRETA: Sobre a restauração final de Jó, assinale a opção INCORRETA:
a) Deus repreendeu os amigos de Jó por não falarem o que era reto.
b) A restauração de Jó ocorreu somente após ele interceder por seus amigos.
c) Jó recebeu o dobro de tudo o que possuía anteriormente.
d) Jó nunca recuperou a alegria familiar, permanecendo solitário até a morte.

Unidade 2 - O Livro dos Salmos
Capítulo 1: O Livro dos Salmos no Cânon Bíblico
Múltipla Escolha: O Livro de Salmos ocupa a primeira posição em qual divisão da Bíblia Hebraica?  a) Torá (Lei). b) Nevi'im (Profetas). c) Ketuvim (Escritos). d) Pentateuco.

Múltipla Escolha: Qual é o significado do termo hebraico Tehillim?  a) Cânticos de Lamento. b) Louvores ou Cântico de Louvores. c) Poemas Históricos. d) Instruções de Sabedoria.

Múltipla Escolha: O Saltério é organizado em cinco livros menores. Essa estrutura é frequentemente comparada a qual outra seção da Bíblia?  a) Aos quatro Evangelhos. b) Ao Pentateuco (Torá). c) Aos Profetas Menores. d) Às Epístolas Paulinas.

Múltipla Escolha: Como são chamadas as expressões de adoração profunda que marcam o encerramento de cada um dos cinco livros de Salmos?  a) Antífonas. b) Salmos de Ascensão. c) Doxologias. d) Mictão.

Verdadeiro ou Falso: Embora Davi seja a figura central com 73 salmos atribuídos a ele, o Livro de Salmos contém vozes de outros autores como Asafe, os Filhos de Coré, Salomão e até autores anônimos. ( )

Capítulo 2: Estrutura Poética e Literária
Múltipla Escolha: Qual é o mecanismo central da poesia hebraica, identificado por Robert Lowth?  a) Rima sonora no final dos versos. b) Métrica rigorosa baseada em sílabas tônicas. c) Paralelismo (rima de pensamento/ideias). d) Uso obrigatório de acrósticos alfabéticos.

Múltipla Escolha: O termo técnico Selá, que ocorre 71 vezes no Saltério, indica:  a) O fim de um salmo. b) Um interlúdio musical ou pausa para meditação. c) O nome do instrumento utilizado. d) Que o salmo deve ser cantado em voz alta.

Múltipla Escolha: Como é classificado o salmo focado na instrução espiritual e na transmissão de sabedoria?  a) Mictão. b) Sigaiom. c) Masquil. d) Tefilah.

Múltipla Escolha: O termo litúrgico Neginote refere-se ao acompanhamento por qual tipo de instrumento?  a) Instrumentos de sopro (flautas). b) Instrumentos de percussão (tambores). c) Instrumentos de corda (harpas e liras). d) Apenas vozes masculinas.

Alternativa INCORRETA: Sobre os tipos de paralelismo na poesia dos Salmos, assinale a opção INCORRETA:  a) Sinonímico: A segunda linha reafirma o pensamento da primeira com termos diferentes. b) Antitético: Apresenta uma oposição direta para destacar uma verdade pelo contraste. c) Sintético: A segunda linha apenas repete as mesmas palavras da primeira sem adicionar informações. d) Climático: Eleva o pensamento até um ponto culminante de exaltação.

PDF 1: Em Busca da Sabedoria
Múltipla Escolha: Qual termo hebraico refere-se especificamente à "habilidade prática em diversas áreas"? a) Binah b) Da’at c) Hokma  d) Sekel

Múltipla Escolha: Segundo o documento, qual é o "ponto de partida" para a verdadeira sabedoria bíblica? a) O estudo das tradições do Egito e Babilônia b) O Temor do Senhor (reverência e submissão) c) A acumulação de riquezas como a de Salomão d) A intuição moral e prudência

Múltipla Escolha: Como é definida a sabedoria "Contemplativa"? a) Regras práticas para a felicidade diária b) Reflexões sobre o sofrimento e o sentido da vida c) Habilidade técnica para construção de templos d) Conhecimento teórico sem aplicação prática

Alternativa INCORRETA: Sobre a história da sabedoria em Israel, assinale a opção falsa: a) Evoluiu dos conselhos tribais para uma classe de sábios na corte real b) É um fio condutor na Lei, nos Profetas e na esperança futura c) A Queda foi a tentativa de obter entendimento dependente de Deus d) José é citado como exemplo de sabedoria prática em crises

Verdadeiro ou Falso: A sabedoria de Salomão era reconhecida como superior à de todos os homens do Oriente e de seus vizinhos.

PDF 2: O Livro de Provérbios
Múltipla Escolha: Qual a missão principal do Livro de Provérbios segundo o PDF? a) Ensinar apenas técnicas de oratória b) Anunciar o significado de estar à plena disposição de Deus c) Catalogar leis civis exclusivas para o povo de Israel  d) Debater filosofias gregas sobre a virtude

Múltipla Escolha: Além de Salomão, quem são citados como outros autores ou colaboradores de Provérbios? a) Davi e Moisés b) Agur, Lemuel e os "sábios"  c) Apenas os escribas de Ezequias d) Profetas do exílio babilônico

Múltipla Escolha: Na organização do livro, o que compreende os capítulos 1:1 a 9:18? a) Palavras de Agur b) Coletânea de Ezequias c) Título, Prólogo e Epílogo  d) Somente os provérbios de Lemuel

Alternativa INCORRETA: Sobre a estrutura do livro, é incorreto afirmar: a) Contém palavras dos sábios (22:17-24:22) b) Inclui uma coletânea organizada pelos homens de Ezequias c) É um manual prático que aborda temas como língua, dinheiro e família d) Foi escrito integralmente por Salomão sem ajuda de editores posteriores

Múltipla Escolha: Quem é o público-alvo principal mencionado para o livro? a) Apenas os idosos e governantes b) Somente os pecadores que buscam arrependimento c) Jovens e sábios que buscam crescer no conhecimento  d) Estrangeiros que não conhecem a lei mosaica

PDF 3: Teologia em Provérbios
Múltipla Escolha: O termo "YHWH" (Senhor) é citado em quantos versículos no livro de Provérbios? a) 50 versículos b) 94 versículos  c) 120 versículos d) 35 versículos

Múltipla Escolha: Qual conceito define Deus como "pessoal e próximo de Sua criação"? a) Transcendência b) Onipotência c) Imanência d) Teontologia

Múltipla Escolha: Na antropologia de Provérbios, qual termo representa o "coração como centro de controle"? a) Nephesh b) Ruah c) Lev d) Adam

Múltipla Escolha: A "unidade psicossomática" do homem em Provérbios é composta por: a) Corpo e mente apenas b) Nephesh, Lev e Ruah  c) Razão e emoção puras d) Intelecto e força física

Verdadeiro ou Falso: O termo "Elohim" em Provérbios é usado prioritariamente para representar o poder e a transcendência divina.

PDF 4: Ensino Para Vida
Múltipla Escolha: Como o livro descreve a insensatez do tipo "simples"? a) Como uma maldade premeditada b) Como ingenuidade e falta de filtro para o que se ouve  c) Como uma sabedoria oculta d) Como uma condição intelectual incurável

Múltipla Escolha: Qual animal é usado como exemplo para envergonhar a negligência humana e ensinar diligência? a) O leão b) A formiga  c) A águia d) A ovelha

Alternativa INCORRETA: Sobre o casamento e família em Provérbios, assinale a errada: a) Recomenda a união monogâmica e fidelidade exclusiva b) A educação dos filhos exige unidade de discurso dos pais c) A disciplina deve ser aplicada apenas com rigor físico, sem afeto d) A mulher sábia é descrita como pilar de estabilidade para o lar

Múltipla Escolha: O que caracteriza a insensatez do tipo "Kesil"? a) Simplicidade infantil b) Obstinação e crença de que sua visão é absoluta  c) Desejo sincero de aprender d) Timidez social excessiva

Múltipla Escolha: Qual é o objetivo central do amadurecimento do crente segundo este PDF? a) Apenas o crescimento financeiro b) O desenvolvimento relacional, ético e espiritual  c) A conquista de cargos políticos d) O isolamento do mundo secular

PDF 11: O Livro de Eclesiastes (Cap 1)
Múltipla Escolha: O que significa o termo hebraico "Qoheleth"? a) Rei de Israel b) Aquele que convoca uma congregação ou Pregador  c) O buscador de tesouros d) O profeta do deserto

Múltipla Escolha: Quantas vezes a expressão "debaixo do sol" aparece no livro? a) 12 vezes b) 29 vezes  c) 35 vezes d) 7 vezes

Múltipla Escolha: Qual o significado da palavra "Hebel" (vaidade) no contexto de Eclesiastes? a) Orgulho e arrogância humana b) Sopro, vapor ou algo passageiro e frágil  c) Pecado imperdoável d) Mentira e falsidade

Múltipla Escolha: Segundo o PDF, qual a conclusão de Eclesiastes 2:24 sobre o trabalho e o prazer? a) São distrações inúteis b) São fardos impostos pelo pecado c) São dons de Deus para serem desfrutados com gratidão  d) Devem ser evitados em busca da espiritualidade

Alternativa INCORRETA: Sobre a autoria de Eclesiastes, o texto afirma que: a) A tradição identifica o Rei Salomão em sua maturidade b) O autor se apresenta como "filho de Davi, rei em Jerusalém" c) A evidência interna de grande riqueza e obras coincide com Salomão d) O livro foi escrito por um autor desconhecido que nunca viveu em Jerusalém

PDF 12: A Vida Debaixo do Sol (Cap 2)
Múltipla Escolha: Como o Pregador descreve o ciclo da natureza para enfatizar a transitoriedade? a) Como algo que evolui constantemente b) Através do sol, vento e rios que giram continuamente sem novidade  c) Como um caos sem ordem divina d) Como uma prova da evolução das espécies

Múltipla Escolha: Qual a advertência dada ao jovem em Eclesiastes 11:9? a) Que ele deve evitar qualquer tipo de alegria b) Que Deus trará a juízo todas as suas ações  c) Que a juventude nunca termina d) Que ele não precisa prestar contas de nada

Múltipla Escolha: Na metáfora da velhice (Ecl 12), o que representam as "janelas" que se escurecem? a) As portas da casa b) Os olhos que perdem a visão  c) A falta de luz nas cidades d) O esquecimento mental

Múltipla Escolha: O que o termo "cordão de prata" e "copo de ouro" simbolizam em Ecl 12:6? a) A riqueza acumulada pelo homem b) O valor da vida e a fragilidade de sua sustentação  c) Presentes dados a reis d) Instrumentos de culto no templo

Verdadeiro ou Falso: De acordo com o PDF, a mente humana é perfeitamente capaz de transpor todas as anomalias da vida e criar um sistema explicativo perfeito sem Deus.

PDF 13: Excelência da Vida (Cap 3)
Múltipla Escolha: Qual é o "antídoto para a frustração existencial" mencionado no texto? a) O acúmulo de bens materiais b) O Temor do Senhor  c) O isolamento social d) A busca pelo prazer sem limites

Múltipla Escolha: Como o trabalho é redefinido nesta perspectiva teológica? a) Como uma punição divina b) Como um fardo pesado para o homem c) Como um dom divino e ato de adoração  d) Como um meio de alcançar autonomia egoísta

Múltipla Escolha: O que significa dizer que Deus "pôs a eternidade no coração do homem"? a) Que o homem viverá para sempre na terra b) Que existe um anseio intrínseco pelo que é transcendente  c) Que o homem sabe tudo o que vai acontecer d) Que a memória humana é infinita

Múltipla Escolha: Qual é o segredo para lidar com as riquezas de forma saudável? a) Escondê-las de todos b) Crer que tudo depende da generosidade de Deus e usá-las para Seus propósitos  c) Gastá-las o mais rápido possível d) Considerá-las fruto exclusivo do esforço próprio

Múltipla Escolha: Qual a conclusão final de todo o livro (Ecl 12:13) apresentada no PDF? a) Buscar a felicidade a qualquer custo b) Temer a Deus e guardar Seus mandamentos  c) Estudar todas as filosofias do mundo d) Fugir das responsabilidades da vida sob o sol
"""

answers1 = ["b", "c", "b", "c", "d", "b", "c", "c", "b", "Falso", "b", "b", "c", "b", "c", "b", "c", "b", "c", "Falso", "b", "c", "b", "c", "d", "c", "b", "b", "c", "Verdadeiro", "c", "b", "c", "c", "c"]
answers2 = ["c", "b", "b", "c", "Verdadeiro", "b", "b", "c", "d", "c", "b", "c", "c", "b", "Verdadeiro", "b", "b", "c", "b", "b", "b", "b", "b", "c", "d", "b", "b", "b", "b", "Falso", "b", "c", "b", "b", "b"]
answers = answers1 + answers2

parsed = []
questions_str = [q for q in re.split(r'\\n\\s*\\n', raw_text) if q.strip() and not q.startswith("Capítulo") and not q.startswith("Unidade") and not q.startswith("PDF")]

question_idx = 0
for q in questions_str:
    q = q.replace('\\n', ' ')
    if q.startswith("Múltipla Escolha") or q.startswith("Alternativa INCORRETA"):
        text = re.sub(r'^(Múltipla Escolha|Alternativa INCORRETA):\\s*', '', q)
        # remove options
        text_only = re.split(r'\\s*a\\)', text)[0].strip()
        
        choices_str = text[len(text_only):].strip()
        a_match = re.search(r'a\\)(.*?)(b\\)|c\\)|d\\)|$)', choices_str)
        b_match = re.search(r'b\\)(.*?)(c\\)|d\\)|$)', choices_str)
        c_match = re.search(r'c\\)(.*?)(d\\)|$)', choices_str)
        d_match = re.search(r'd\\)(.*?)$', choices_str)
        
        choices = []
        if a_match: choices.append({"id": f"c-{question_idx}-a", "text": a_match.group(1).strip()})
        if b_match: choices.append({"id": f"c-{question_idx}-b", "text": b_match.group(1).strip()})
        if c_match: choices.append({"id": f"c-{question_idx}-c", "text": c_match.group(1).strip()})
        if d_match: choices.append({"id": f"c-{question_idx}-d", "text": d_match.group(1).strip()})
        
        ans_key = answers[question_idx].lower()
        if ans_key.startswith('a'): correct_ans = choices[0]['id']
        elif ans_key.startswith('b'): correct_ans = choices[1]['id']
        elif ans_key.startswith('c'): correct_ans = choices[2]['id']
        elif ans_key.startswith('d') and len(choices) > 3: correct_ans = choices[3]['id']
        else: correct_ans = choices[0]['id']
        
        parsed.append({
            "id": f"q-livros-poeticos-{question_idx}",
            "disciplineId": "disc-17",
            "type": "multiple-choice",
            "text": text_only,
            "choices": choices,
            "correctAnswer": correct_ans,
            "points": 1,
            "createdAt": datetime.now().isoformat()
        })
        question_idx += 1
    elif q.startswith("Verdadeiro ou Falso"):
        text = re.sub(r'^Verdadeiro ou Falso:\\s*', '', q).replace('( )', '').strip()
        ans_key = answers[question_idx].lower()
        correct_ans = 'true' if ans_key.startswith('v') else 'false'
        
        parsed.append({
            "id": f"q-livros-poeticos-{question_idx}",
            "disciplineId": "disc-17",
            "type": "true-false",
            "text": text,
            "choices": [],
            "correctAnswer": correct_ans,
            "points": 1,
            "createdAt": datetime.now().isoformat()
        })
        question_idx += 1

print(f"Parsed {len(parsed)} questions. Writing to JSON.")

# Write the final export code to store.ts directly!
with open("e:/Projetos AntiGrafity/ESCOLA DE TEOLOGIA/Escola de Teologia/IETEO/public/seed_livros_poeticos.json", "w", encoding='utf-8') as f:
    json.dump(parsed, f, indent=2, ensure_ascii=False)
