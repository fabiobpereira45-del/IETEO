import type { 
  Assessment, Question, StudentAnswer, StudentSubmission, 
  Semester, Discipline, ProfessorAccount, ProfessorDiscipline, 
  FinancialCharge, StudentProfile, StudentGrade, Attendance 
} from "./store"

interface PDFData {
  submission: StudentSubmission
  assessment: Assessment
  questions: Question[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}min ${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getAnswerLabel(answer: string, question: Question): string {
  if (question.type === "true-false") {
    return answer === "true" ? "Verdadeiro" : answer === "false" ? "Falso" : "—"
  }
  if (question.type === "discursive") {
    return answer || "—"
  }
  const choice = question.choices.find((c) => c.id === answer)
  return choice ? choice.text : "—"
}

function getCorrectLabel(question: Question): string {
  if (question.type === "true-false") {
    return question.correctAnswer === "true" ? "Verdadeiro" : "Falso"
  }
  if (question.type === "discursive") {
    return "Questão discursiva — correção manual"
  }
  const choice = question.choices.find((c) => c.id === question.correctAnswer)
  return choice ? choice.text : "—"
}

function typeLabel(type: Question["type"]): string {
  if (type === "multiple-choice") return "Múltipla Escolha"
  if (type === "true-false") return "Verdadeiro ou Falso"
  return "Discursiva"
}

export function printStudentPDF({ submission, assessment, questions }: PDFData): void {
  const orderedQuestions = assessment.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as Question[]

  const rows = orderedQuestions
    .map((q, i) => {
      const studentAns = submission.answers.find((a) => a.questionId === q.id)
      const studentLabel = studentAns ? getAnswerLabel(studentAns.answer, q) : "—"
      const correctLabel = getCorrectLabel(q)
      const isDiscursive = q.type === "discursive"
      const isCorrect = !isDiscursive && studentAns?.answer === q.correctAnswer
      const statusColor = isDiscursive ? "#6b7280" : isCorrect ? "#16a34a" : "#dc2626"
      const statusText = isDiscursive ? "Discursiva" : isCorrect ? "Correta" : "Incorreta"

      const choicesHTML =
        q.type === "multiple-choice"
          ? `<ul style="margin:4px 0 0 0;padding:0;list-style:none;">
              ${q.choices
            .map(
              (c) =>
                `<li style="margin:2px 0;padding:3px 6px;border-radius:4px;font-size:12px;
                    background:${c.id === q.correctAnswer ? "#dcfce7" : c.id === studentAns?.answer && !isCorrect ? "#fee2e2" : "#f9fafb"};
                    color:${c.id === q.correctAnswer ? "#166534" : c.id === studentAns?.answer && !isCorrect ? "#991b1b" : "#374151"}">
                    ${c.text}${c.id === q.correctAnswer ? " ✓" : ""}${c.id === studentAns?.answer && !isCorrect ? " ✗" : ""}
                    </li>`
            )
            .join("")}
             </ul>`
          : ""

      const discursiveHTML =
        q.type === "discursive"
          ? `<div style="margin-top:6px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;color:#374151;min-height:40px;">
              ${studentLabel}
             </div>`
          : ""

      return `
        <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">
              Questão ${i + 1} &nbsp;·&nbsp; ${typeLabel(q.type)} &nbsp;·&nbsp; ${assessment.pointsPerQuestion} pt${assessment.pointsPerQuestion !== 1 ? "s" : ""}
            </span>
            <span style="font-size:11px;font-weight:700;color:${statusColor};text-transform:uppercase;">${statusText}</span>
          </div>
          <p style="margin:0 0 6px 0;font-size:13px;color:#111827;line-height:1.5;">${q.text}</p>
          ${choicesHTML}
          ${discursiveHTML}
          ${q.type === "true-false"
          ? `<div style="margin-top:6px;display:flex;gap:8px;">
                  <span style="padding:3px 10px;border-radius:4px;font-size:12px;background:${studentAns?.answer === "true" && !isCorrect ? "#fee2e2" : studentAns?.answer === "true" ? "#dcfce7" : "#f3f4f6"};color:${studentAns?.answer === "true" && !isCorrect ? "#991b1b" : studentAns?.answer === "true" ? "#166534" : "#374151"}">Verdadeiro${q.correctAnswer === "true" ? " ✓" : ""}${studentAns?.answer === "true" && !isCorrect ? " ✗" : ""}</span>
                  <span style="padding:3px 10px;border-radius:4px;font-size:12px;background:${studentAns?.answer === "false" && !isCorrect ? "#fee2e2" : studentAns?.answer === "false" ? "#dcfce7" : "#f3f4f6"};color:${studentAns?.answer === "false" && !isCorrect ? "#991b1b" : studentAns?.answer === "false" ? "#166534" : "#374151"}">Falso${q.correctAnswer === "false" ? " ✓" : ""}${studentAns?.answer === "false" && !isCorrect ? " ✗" : ""}</span>
                 </div>`
          : ""
        }
          ${!isDiscursive
          ? `<div style="margin-top:8px;font-size:12px;color:#166534;font-weight:600;">
                  Gabarito: ${correctLabel}
                </div>`
          : ""
        }
        </div>`
    })
    .join("")

  const gabaritoRows = orderedQuestions
    .filter((q) => q.type !== "discursive")
    .map((q, i) => {
      const num = orderedQuestions.findIndex((oq) => oq.id === q.id) + 1
      return `<tr>
        <td style="padding:5px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${num}</td>
        <td style="padding:5px 10px;border:1px solid #e5e7eb;font-size:12px;">${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""}</td>
        <td style="padding:5px 10px;border:1px solid #e5e7eb;font-size:12px;color:#166534;font-weight:600;">${getCorrectLabel(q)}</td>
      </tr>`
    })
    .join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Prova — ${submission.studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 24px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1px;">${assessment.institution}</div>
        <h1 style="font-size:20px;font-weight:800;color:#1e3a5f;margin:4px 0;">${assessment.title}</h1>
        <div style="font-size:12px;color:#6b7280;">Professor: ${assessment.professor}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#6b7280;">Data de entrega</div>
        <div style="font-size:13px;font-weight:600;">${formatDate(submission.submittedAt)}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;">Tempo: ${formatTime(submission.timeElapsedSeconds)}</div>
      </div>
    </div>
  </div>

  <!-- Student info + Score -->
  <div style="display:flex;gap:16px;margin-bottom:24px;">
    <div style="flex:1;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Aluno</div>
      <div style="font-size:16px;font-weight:700;color:#1e3a5f;">${submission.studentName}</div>
      <div style="font-size:12px;color:#6b7280;">${submission.studentEmail}</div>
    </div>
    <div style="padding:12px 24px;background:#1e3a5f;border-radius:8px;text-align:center;min-width:120px;">
      <div style="font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Nota Final</div>
      <div style="font-size:32px;font-weight:800;color:#fff;">${submission.score.toFixed(1)}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.7);">de ${submission.totalPoints.toFixed(1)} pts (${submission.percentage}%)</div>
    </div>
  </div>

  <!-- Questions -->
  <h2 style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Respostas do Aluno</h2>
  ${rows}

  <!-- Gabarito table -->
  ${gabaritoRows
      ? `<div style="margin-top:24px;page-break-before:always;">
          <h2 style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;border-bottom:2px solid #1e3a5f;padding-bottom:8px;">Gabarito Oficial</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#1e3a5f;color:#fff;">
                <th style="padding:8px 10px;border:1px solid #1e3a5f;width:60px;">Nº</th>
                <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:left;">Questão</th>
                <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:left;">Resposta Correta</th>
              </tr>
            </thead>
            <tbody>${gabaritoRows}</tbody>
          </table>
        </div>`
      : ""
    }

  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    Documento gerado pelo Sistema de Avaliações IETEO — ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

export function printBlankAssessmentPDF({ assessment, questions }: Omit<PDFData, "submission">): void {
  const versions = assessment.shuffleVariants ? [
    { type: 'A', qs: [...assessment.questionIds] },
    { type: 'B', qs: [...assessment.questionIds].sort(() => Math.random() - 0.5) },
    { type: 'C', qs: [...assessment.questionIds].sort(() => Math.random() - 0.5) },
  ] : [
    { type: '', qs: [...assessment.questionIds] }
  ]

  const pagesHtml = versions.map((version, versionIdx) => {
    const orderedQuestions = version.qs
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean) as Question[]

    const rows = orderedQuestions
      .map((q, i) => {
        const choicesHTML =
          q.type === "multiple-choice"
            ? `<ul style="margin:8px 0 0 0;padding:0;list-style:none;">
                ${q.choices
              .map(
                (c) =>
                  `<li style="margin:4px 0;padding:4px 6px;font-size:13px;color:#374151;">
                        <span style="display:inline-block;width:14px;height:14px;border:1px solid #9ca3af;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>
                        ${c.text}
                      </li>`
              )
              .join("")}
               </ul>`
            : ""

        const discursiveSpaceHTML =
          q.type === "discursive"
            ? `<div style="margin-top:10px;height:100px;border-bottom:1px solid #d1d5db;background:repeating-linear-gradient(transparent,transparent 24px,#e5e7eb 24px,#e5e7eb 25px);"></div>`
            : ""

        const tfSpaceHTML =
          q.type === "true-false"
            ? `<div style="margin-top:10px;display:flex;gap:12px;font-size:13px;color:#374151;">
                <span>(&nbsp;&nbsp;&nbsp;) Verdadeiro</span>
                <span>(&nbsp;&nbsp;&nbsp;) Falso</span>
               </div>`
            : ""

        return `
          <div style="margin-bottom:24px;break-inside:avoid;">
            <div style="font-size:14px;font-weight:600;color:#111827;line-height:1.5;margin-bottom:4px;">
              ${i + 1}. ${q.text} <span style="font-weight:normal;color:#6b7280;font-size:11px;">(${assessment.pointsPerQuestion} pt${assessment.pointsPerQuestion !== 1 ? "s" : ""})</span>
            </div>
            ${choicesHTML}
            ${tfSpaceHTML}
            ${discursiveSpaceHTML}
          </div>`
      })
      .join("")

    const header = `
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
          ${assessment.logoBase64
        ? `<img src="${assessment.logoBase64}" style="max-width:80px;max-height:80px;object-fit:contain;" alt="Logo"/>`
        : ""
      }
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${assessment.institution || 'Instituto de Ensino Teológico - IETEO'}</div>
                <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px 0;">${assessment.title}</h1>
                <div style="font-size:13px;color:#475569;">Professor(a): <span style="font-weight:600;">${assessment.professor}</span></div>
              </div>
              ${version.type ? `<div style="font-size:24px;font-weight:900;color:#1e3a5f;border:2px solid #1e3a5f;border-radius:8px;padding:4px 12px;">TIPO ${version.type}</div>` : ''}
            </div>
          </div>
        </div>
        
        <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px;">
          <div style="display:flex;gap:16px;margin-bottom:12px;">
            <div style="flex:1;font-size:14px;color:#334155;">
              Aluno(a): ______________________________________________________________
            </div>
            <div style="font-size:14px;color:#334155;white-space:nowrap;">
              Data: ___/___/_______
            </div>
          </div>
          <div style="display:flex;gap:16px;">
            <div style="font-size:14px;color:#334155;white-space:nowrap;">
              Polo: ___________________________________
            </div>
            <div style="font-size:14px;color:#334155;white-space:nowrap;">
              Nota: __________
            </div>
          </div>
        </div>

        ${assessment.rules
        ? `<div style="margin-top:16px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;color:#475569;">
                 <strong style="color:#0f172a;">Instruções:</strong> ${assessment.rules.replace(/\n/g, '<br/>')}
               </div>`
        : ""
      }
      </div>`

    return `
      <div style="${versionIdx > 0 ? 'page-break-before: always;' : ''}">
        ${header}
        <div style="margin-top:24px;">
          ${rows}
        </div>
        <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;">
          Documento gerado pelo Sistema de Avaliações IETEO — Bom desempenho!
        </div>
      </div>
    `
  }).join("\n")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${assessment.title} - Em Branco</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 24px; max-width:800px; margin: 0 auto; }
    @media print { body { padding: 0; margin: 0; } }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

export function printCompiledSubmissionsPDF({ submissions, assessment, questions }: { submissions: StudentSubmission[], assessment: Assessment, questions: Question[] }): void {
  const allSubmissionsHtml = submissions.map((submission, index) => {
    const orderedQuestions = assessment.questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean) as Question[]

    const rows = orderedQuestions
      .map((q, i) => {
        const studentAns = submission.answers.find((a) => a.questionId === q.id)
        const studentLabel = studentAns ? getAnswerLabel(studentAns.answer, q) : "—"
        const correctLabel = getCorrectLabel(q)
        const isDiscursive = q.type === "discursive"
        const isCorrect = !isDiscursive && studentAns?.answer === q.correctAnswer
        const statusColor = isDiscursive ? "#6b7280" : isCorrect ? "#16a34a" : "#dc2626"
        const statusText = isDiscursive ? "Discursiva" : isCorrect ? "Correta" : "Incorreta"

        const choicesHTML =
          q.type === "multiple-choice"
            ? `<ul style="margin:4px 0 0 0;padding:0;list-style:none;">
                ${q.choices
              .map(
                (c) =>
                  `<li style="margin:2px 0;padding:3px 6px;border-radius:4px;font-size:12px;
                      background:${c.id === q.correctAnswer ? "#dcfce7" : c.id === studentAns?.answer && !isCorrect ? "#fee2e2" : "#f9fafb"};
                      color:${c.id === q.correctAnswer ? "#166534" : c.id === studentAns?.answer && !isCorrect ? "#991b1b" : "#374151"}">
                      ${c.text}${c.id === q.correctAnswer ? " ✓" : ""}${c.id === studentAns?.answer && !isCorrect ? " ✗" : ""}
                      </li>`
              )
              .join("")}
               </ul>`
            : ""

        const discursiveHTML =
          q.type === "discursive"
            ? `<div style="margin-top:6px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;color:#374151;min-height:40px;">
                ${studentLabel}
               </div>`
            : ""

        return `
          <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">
                Questão ${i + 1} &nbsp;·&nbsp; ${typeLabel(q.type)} &nbsp;·&nbsp; ${assessment.pointsPerQuestion} pt${assessment.pointsPerQuestion !== 1 ? "s" : ""}
              </span>
              <span style="font-size:11px;font-weight:700;color:${statusColor};text-transform:uppercase;">${statusText}</span>
            </div>
            <p style="margin:0 0 6px 0;font-size:13px;color:#111827;line-height:1.5;">${q.text}</p>
            ${choicesHTML}
            ${discursiveHTML}
            ${q.type === "true-false"
            ? `<div style="margin-top:6px;display:flex;gap:8px;">
                    <span style="padding:3px 10px;border-radius:4px;font-size:12px;background:${studentAns?.answer === "true" && !isCorrect ? "#fee2e2" : studentAns?.answer === "true" ? "#dcfce7" : "#f3f4f6"};color:${studentAns?.answer === "true" && !isCorrect ? "#991b1b" : studentAns?.answer === "true" ? "#166534" : "#374151"}">Verdadeiro${q.correctAnswer === "true" ? " ✓" : ""}${studentAns?.answer === "true" && !isCorrect ? " ✗" : ""}</span>
                    <span style="padding:3px 10px;border-radius:4px;font-size:12px;background:${studentAns?.answer === "false" && !isCorrect ? "#fee2e2" : studentAns?.answer === "false" ? "#dcfce7" : "#f3f4f6"};color:${studentAns?.answer === "false" && !isCorrect ? "#991b1b" : studentAns?.answer === "false" ? "#166534" : "#374151"}">Falso${q.correctAnswer === "false" ? " ✓" : ""}${studentAns?.answer === "false" && !isCorrect ? " ✗" : ""}</span>
                   </div>`
            : ""
          }
            ${!isDiscursive
            ? `<div style="margin-top:8px;font-size:12px;color:#166534;font-weight:600;">
                    Gabarito: ${correctLabel}
                  </div>`
            : ""
          }
          </div>`
      })
      .join("")

    return `
      <div style="${index > 0 ? 'page-break-before: always; margin-top: 40px;' : ''}">
        <!-- Header -->
        <div style="border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1px;">${assessment.institution}</div>
              <h1 style="font-size:20px;font-weight:800;color:#1e3a5f;margin:4px 0;">${assessment.title}</h1>
              <div style="font-size:12px;color:#6b7280;">Professor: ${assessment.professor}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#6b7280;">Data de entrega</div>
              <div style="font-size:13px;font-weight:600;">${formatDate(submission.submittedAt)}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:4px;">Tempo: ${formatTime(submission.timeElapsedSeconds)}</div>
            </div>
          </div>
        </div>

        <!-- Student info + Score -->
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Aluno</div>
            <div style="font-size:16px;font-weight:700;color:#1e3a5f;">${submission.studentName}</div>
            <div style="font-size:12px;color:#6b7280;">${submission.studentEmail}</div>
          </div>
          <div style="padding:12px 24px;background:#1e3a5f;border-radius:8px;text-align:center;min-width:120px;">
            <div style="font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Nota Final</div>
            <div style="font-size:32px;font-weight:800;color:#fff;">${submission.score.toFixed(1)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,.7);">de ${submission.totalPoints.toFixed(1)} pts (${submission.percentage}%)</div>
          </div>
        </div>

        <!-- Questions -->
        <h2 style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Respostas do Aluno</h2>
        ${rows}
      </div>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Compilado de Provas — ${assessment.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 24px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${allSubmissionsHtml}
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    Documento gerado pelo Sistema de Avaliações IETEO — ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

export function printOverviewPDF({ assessments, submissions, questions }: { assessments: Assessment[], submissions: StudentSubmission[], questions: Question[] }): void {
  const totalStudents = submissions.length
  const avgScore = totalStudents > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / totalStudents)
    : 0
  const passing = submissions.filter((s) => s.percentage >= 70).length

  const activeAssessment = assessments[0]
  const activeSubs = activeAssessment ? submissions.filter(s => s.assessmentId === activeAssessment.id) : []
  const activeQuestions = activeAssessment
    ? activeAssessment.questionIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean) as Question[]
    : []

  const questionStats = activeQuestions.map((q, i) => {
    const total = activeSubs.length
    const correct = activeSubs.filter((s) => s.answers.find((a) => a.questionId === q.id)?.answer === q.correctAnswer).length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return {
      number: i + 1,
      text: q.text,
      correct,
      errors: total - correct,
      total,
      pct,
    }
  })

  const statsHtml = questionStats.map((stat) => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;break-inside:avoid;">
      <span style="font-size:12px;font-weight:700;color:#6b7280;width:25px;text-align:right;">${stat.number}</span>
      <div style="flex:1;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${stat.pct}%;background:${stat.pct >= 70 ? "#16a34a" : stat.pct >= 50 ? "#d97706" : "#dc2626"};"></div>
      </div>
      <span style="font-size:12px;font-weight:700;width:40px;text-align:right;">${stat.pct}%</span>
      <span style="font-size:12px;color:#4b5563;flex:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${stat.text}</span>
      <span style="font-size:11px;color:#9ca3af;width:80px;text-align:right;">${stat.correct}/${stat.total} acertos</span>
    </div>
  `).join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Visão Geral — IETEO</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; padding: 40px; }
    .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:20px; }
    .stat-bar { height:12px; background:#e5e7eb; border-radius:6px; overflow:hidden; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:40px;">
    <div style="font-size:12px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Instituto de Ensino Teológico - IETEO</div>
    <h1 style="font-size:28px;font-weight:800;color:#1e3a5f;">Relatório Geral de Desempenho</h1>
    <div style="font-size:14px;color:#6b7280;margin-top:8px;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:40px;">
    <div class="card">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Alunos Avaliados</div>
      <div style="font-size:24px;font-weight:800;color:#1e3a5f;">${totalStudents}</div>
    </div>
    <div class="card">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Média Geral</div>
      <div style="font-size:24px;font-weight:800;color:${avgScore >= 70 ? "#16a34a" : "#d97706"};">${avgScore}%</div>
    </div>
    <div class="card">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Aprovados (≥70%)</div>
      <div style="font-size:24px;font-weight:800;color:#16a34a;">${passing}</div>
    </div>
    <div class="card">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Provas Criadas</div>
      <div style="font-size:24px;font-weight:800;color:#1e3a5f;">${assessments.length}</div>
    </div>
  </div>

  ${activeAssessment ? `
    <div style="margin-bottom:30px;">
      <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin-bottom:20px;border-bottom:2px solid #1e3a5f;padding-bottom:10px;">
        Desempenho por Questão — ${activeAssessment.title}
      </h2>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        ${statsHtml}
      </div>
    </div>
  ` : ""}

  <div style="margin-top:60px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    Documento oficial do Sistema de Gestão Acadêmica IETEO
  </div>
</body>
</html>`

  const win = window.open("", "_blank", "width=1000,height=800")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

export function printAnswerKeyPDF({ assessment, questions }: { assessment: Assessment, questions: Question[] }): void {
  const orderedQuestions = assessment.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as Question[]

  const rows = orderedQuestions.map((q, i) => {
    const correctLabel = getCorrectLabel(q)
    const isDiscursive = q.type === "discursive"

    let optionsHTML = ""
    if (q.type === "multiple-choice") {
      optionsHTML = `<ul style="margin:8px 0 0 0;padding:0;list-style:none;">
        ${q.choices.map(c => `
          <li style="margin:4px 0;padding:6px 12px;border-radius:6px;font-size:13px;
              background:${c.id === q.correctAnswer ? "#dcfce7" : "#f9fafb"};
              color:${c.id === q.correctAnswer ? "#166534" : "#374151"};
              border:1px solid ${c.id === q.correctAnswer ? "#166534" : "#e5e7eb"}">
              ${c.text}${c.id === q.correctAnswer ? " (Correta)" : ""}
          </li>
        `).join("")}
      </ul>`
    } else if (q.type === "true-false") {
      optionsHTML = `<div style="margin-top:8px;display:flex;gap:12px;">
        <span style="padding:4px 12px;border-radius:6px;font-size:13px;background:${q.correctAnswer === "true" ? "#dcfce7" : "#f3f4f6"};color:${q.correctAnswer === "true" ? "#166534" : "#374151"};border:1px solid ${q.correctAnswer === "true" ? "#166534" : "#e5e7eb"}">Verdadeiro ${q.correctAnswer === "true" ? "✓" : ""}</span>
        <span style="padding:4px 12px;border-radius:6px;font-size:13px;background:${q.correctAnswer === "false" ? "#dcfce7" : "#f3f4f6"};color:${q.correctAnswer === "false" ? "#166534" : "#374151"};border:1px solid ${q.correctAnswer === "false" ? "#166534" : "#e5e7eb"}">Falso ${q.correctAnswer === "false" ? "✓" : ""}</span>
      </div>`
    }

    return `
      <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;break-inside:avoid;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:12px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;">
            Questão ${i + 1} &nbsp;·&nbsp; ${typeLabel(q.type)}
          </span>
          <span style="font-size:11px;color:#6b7280;font-weight:600;">GABARITO OFICIAL</span>
        </div>
        <p style="margin:0 0 12px 0;font-size:14px;color:#111827;line-height:1.6;font-weight:500;">${q.text}</p>
        ${optionsHTML}
        ${isDiscursive ? `
          <div style="margin-top:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#1e3a5f;font-weight:600;font-style:italic;">
            Nota: Questão discursiva. Requer correção manual baseada no conteúdo ensinado.
          </div>
        ` : `
          <div style="margin-top:12px;padding:10px 14px;background:#dcfce7;border-radius:8px;font-size:13px;color:#166534;font-weight:700;display:inline-block;">
            Resposta Correta: ${correctLabel}
          </div>
        `}
      </div>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Gabarito — ${assessment.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #f3f4f6; padding: 40px; }
    @media print { 
      body { padding: 0; background: #fff; } 
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="border-bottom:4px solid #1e3a5f;padding-bottom:20px;margin-bottom:30px;text-align:center;">
      <div style="font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${assessment.institution || "IETEO"}</div>
      <h1 style="font-size:26px;font-weight:800;color:#1e3a5f;margin:0;">GABARITO OFICIAL</h1>
      <div style="font-size:18px;color:#4b5563;margin-top:4px;font-weight:600;">${assessment.title}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:8px;">Professor: ${assessment.professor} &nbsp;·&nbsp; Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
    </div>

    <!-- Content -->
    ${rows}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      Documento gerado pelo Sistema de Avaliações IETEO — Página 1 de 1
    </div>
  </div>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=800")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}
export function printSubmissionsTablePDF({ submissions, assessment }: { submissions: StudentSubmission[], assessment: Assessment }): void {
  const rows = submissions.map((s, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; font-size: 13px; color: #111827; text-align: center;">${i + 1}</td>
      <td style="padding: 12px; font-size: 13px; color: #111827;">
        <div style="font-weight: 600;">${s.studentName}</div>
        <div style="font-size: 11px; color: #6b7280;">${s.studentEmail}</div>
      </td>
      <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #1e3a5f; text-align: center;">
        ${s.score.toFixed(1)} <span style="font-size: 11px; font-weight: 400; color: #6b7280;">/ ${s.totalPoints}</span>
      </td>
      <td style="padding: 12px; font-size: 13px; color: #111827; text-align: center;">${formatTime(s.timeElapsedSeconds)}</td>
      <td style="padding: 12px; font-size: 13px; color: #111827; text-align: center;">${formatDate(s.submittedAt)}</td>
    </tr>
  `).join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Resumo de Notas — ${assessment.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 40px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; background: #f8fafc; padding: 12px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div style="border-bottom: 4px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 12px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">${assessment.institution || "IETEO"}</div>
        <h1 style="font-size: 24px; font-weight: 800; color: #1e3a5f; margin: 0;">Resumo de Notas</h1>
        <div style="font-size: 16px; color: #4b5563; margin-top: 4px; font-weight: 600;">${assessment.title}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #6b7280;">Total de Envios: <strong>${submissions.length}</strong></div>
        <div style="font-size: 12px; color: #6b7280;">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Aluno / E-mail</th>
        <th style="text-align: center;">Nota</th>
        <th style="text-align: center;">Tempo</th>
        <th style="text-align: center;">Enviado em</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
    Documento gerado pelo Sistema de Avaliações IETEO — Gerado em ${new Date().toLocaleString("pt-BR")}
  </div>
</body>
</html>`

  const win = window.open("", "_blank", "width=1000,height=800")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

export function printCurriculumPDF(semesters: Semester[], disciplines: Discipline[]): void {
  const semestersHtml = semesters.sort((a,b) => a.order - b.order).map(s => {
    const sDisciplines = disciplines.filter(d => d.semesterId === s.id).sort((a,b) => a.order - b.order)
    const rows = sDisciplines.map(d => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-size: 13px;">${d.name}</td>
        <td style="padding: 10px; font-size: 13px; color: #666;">${d.professorName || 'Não atribuído'}</td>
      </tr>
    `).join('')

    return `
      <div style="margin-bottom: 30px; break-inside: avoid;">
        <h3 style="background: #f1f5f9; padding: 10px; border-left: 4px solid #1e3a5f; margin: 0; font-size: 15px; color: #1e3a5f;">${s.name}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; background: #fafafa; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #64748b;">Disciplina</th>
              <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #64748b;">Professor</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Grade Curricular - IETEO</title><style>body{font-family: Arial, sans-serif; padding: 40px; color: #334155;} @media print { body { padding: 0; } }</style></head>
  <body>
    <div style="text-align: center; margin-bottom: 40px; border-bottom: 4px solid #1e3a5f; padding-bottom: 20px;">
      <h1 style="margin: 0; color: #1e3a5f;">Grade Curricular</h1>
      <p style="margin: 5px 0 0 0; color: #64748b;">Instituto de Ensino Teológico — IETEO</p>
    </div>
    ${semestersHtml}
    <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`

  const win = window.open("", "_blank")
  if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}

export function printProfessorsPDF(professors: ProfessorAccount[], assignments: ProfessorDiscipline[], disciplines: Discipline[]): void {
  const rows = professors.map(p => {
    const pDisciplines = assignments.filter(a => a.professorId === p.id)
      .map(a => disciplines.find(d => d.id === a.disciplineId)?.name)
      .filter(Boolean).join(', ')

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-size: 12px; font-weight: 600;">${p.name}</td>
        <td style="padding: 10px; font-size: 11px;">${p.email}</td>
        <td style="padding: 10px; font-size: 11px;">${p.active ? '<span style="color: green;">Ativo</span>' : '<span style="color: red;">Inativo</span>'}</td>
        <td style="padding: 10px; font-size: 10px; color: #64748b;">${pDisciplines || 'Sem disciplinas'}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Corpo Docente - IETEO</title><style>body{font-family: Arial, sans-serif; padding: 40px;} @media print { body { padding: 0; } }</style></head>
  <body>
    <div style="border-bottom: 4px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 20px;">
      <h1 style="margin: 0; color: #1e3a5f;">Corpo Docente e Mestres</h1>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
          <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Nome</th>
          <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">E-mail</th>
          <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Status</th>
          <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Disciplinas</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`

  const win = window.open("", "_blank"); if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}

export function printFinancialReportPDF(charges: FinancialCharge[], students: StudentProfile[]): void {
  const total = charges.reduce((acc, c) => acc + c.amount, 0)
  const paid = charges.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.amount, 0)
  const pending = total - paid

  interface StudentStat { name: string; paid: number; pending: number; status: string; statusColor: string }
  
  const statsMap: Record<string, StudentStat> = {}
  
  charges.forEach(c => {
    if (!statsMap[c.studentId]) {
      const student = students.find(s => s.id === c.studentId)
      statsMap[c.studentId] = {
        name: student?.name || 'N/A',
        paid: 0,
        pending: 0,
        status: '',
        statusColor: ''
      }
    }
    
    if (c.status === 'paid') statsMap[c.studentId].paid += c.amount
    else statsMap[c.studentId].pending += c.amount
  })

  const sortedStats = Object.values(statsMap).sort((a, b) => a.name.localeCompare(b.name))

  const rows = sortedStats.map(s => {
    const statusText = s.pending === 0 ? 'PAGO' : 'PENDENTE'
    const statusColor = s.pending === 0 ? 'green' : '#d97706'
    
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-size: 13px; font-weight: 600;">${s.name}</td>
        <td style="padding: 10px; font-size: 13px; color: green; font-weight: 700;">R$ ${s.paid.toFixed(2)}</td>
        <td style="padding: 10px; font-size: 13px; color: #dc2626; font-weight: 700;">R$ ${s.pending.toFixed(2)}</td>
        <td style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: bold; color: ${statusColor}">${statusText}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Financeiro Consolidado</title><style>body{font-family: Arial, sans-serif; padding: 30px;} @media print { body { padding: 0; } }</style></head>
  <body>
    <div style="border-bottom: 5px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 12px; font-weight: bold; color: #f97316; text-transform: uppercase; margin-bottom: 4px;">Instituto de Ensino Teológico — IETEO</div>
        <h1 style="margin: 0; color: #1e3a5f; font-size: 28px;">Relatório Financeiro por Aluno</h1>
      </div>
      <div style="text-align: right; font-size: 14px;">
        <div style="margin-bottom: 2px;">Total Geral: <strong>R$ ${total.toFixed(2)}</strong></div>
        <div style="color: green; margin-bottom: 2px;">Total Recebido: <strong>R$ ${paid.toFixed(2)}</strong></div>
        <div style="color: red;">Total Pendente: <strong>R$ ${pending.toFixed(2)}</strong></div>
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="text-align: left; background: #f1f5f9; border-bottom: 3px solid #1e3a5f;">
        <th style="padding: 12px; font-size: 11px; text-transform: uppercase;">ALUNO</th>
        <th style="padding: 12px; font-size: 11px; text-transform: uppercase;">VALOR PAGO (RECEBIDO)</th>
        <th style="padding: 12px; font-size: 11px; text-transform: uppercase;">VALOR DEVEDOR (PENDENTE)</th>
        <th style="padding: 12px; font-size: 11px; text-transform: uppercase;">SITUAÇÃO</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px;">
      Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </body></html>`

  const win = window.open("", "_blank"); if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}

export function printGradesReportPDF(grades: StudentGrade[], disciplineName: string): void {
  const rows = grades.map(g => {
    const final = (g.examGrade + g.worksGrade + g.seminarGrade + (g.participationBonus || 0)) / (g.customDivisor || 3)
    const status = final >= 7 ? '<span style="color: green;">APROVADO</span>' : '<span style="color: red;">REPROVADO</span>'
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-size: 12px;">${g.studentName}</td>
        <td style="padding: 8px; font-size: 12px; text-align: center;">${g.examGrade.toFixed(1)}</td>
        <td style="padding: 8px; font-size: 12px; text-align: center;">${g.worksGrade.toFixed(1)}</td>
        <td style="padding: 8px; font-size: 12px; text-align: center;">${g.seminarGrade.toFixed(1)}</td>
        <td style="padding: 8px; font-size: 12px; text-align: center; font-weight: bold;">${final.toFixed(1)}</td>
        <td style="padding: 8px; font-size: 10px; text-align: center; font-weight: bold;">${status}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diário de Notas</title><style>body{font-family: Arial, sans-serif; padding: 30px;} @media print { body { padding: 0; } }</style></head>
  <body>
    <div style="border-bottom: 4px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 20px;">
      <h1 style="margin: 0; color: #1e3a5f; font-size: 22px;">Diário de Notas: ${disciplineName}</h1>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 10px; font-size: 10px;">ALUNO</th>
        <th style="padding: 10px; font-size: 10px; text-align: center;">PROVA</th>
        <th style="padding: 10px; font-size: 10px; text-align: center;">TRABALHO</th>
        <th style="padding: 10px; font-size: 10px; text-align: center;">SEMINÁRIO</th>
        <th style="padding: 10px; font-size: 10px; text-align: center;">MÉDIA</th>
        <th style="padding: 10px; font-size: 10px; text-align: center;">SITUAÇÃO</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`

  const win = window.open("", "_blank"); if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}

export function printAttendanceReportPDF(attendances: Attendance[], students: StudentProfile[], disciplineName: string): void {
  const logs = students.map(s => {
    const sAtt = attendances.filter(a => a.studentId === s.id)
    const presents = sAtt.filter(a => a.isPresent).length
    const total = sAtt.length
    const pct = total > 0 ? (presents/total)*100 : 0
    return { name: s.name, presents, total, pct }
  })

  const rows = logs.map(l => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 8px; font-size: 12px;">${l.name}</td>
      <td style="padding: 8px; font-size: 12px; text-align: center;">${l.presents} / ${l.total}</td>
      <td style="padding: 8px; font-size: 12px; text-align: center; font-weight: bold; color: ${l.pct < 75 ? 'red' : 'inherit'}">${l.pct.toFixed(0)}%</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório de Frequência</title><style>body{font-family: Arial, sans-serif; padding: 30px;} @media print { body { padding: 0; } }</style></head>
  <body>
    <div style="border-bottom: 4px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 20px;">
      <h1 style="margin: 0; color: #1e3a5f; font-size: 22px;">Folha de Frequência: ${disciplineName}</h1>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 10px; font-size: 11px;">ALUNO</th>
        <th style="padding: 10px; font-size: 11px; text-align: center;">PRESENÇAS</th>
        <th style="padding: 10px; font-size: 11px; text-align: center;">% FREQUÊNCIA</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top: 30px; font-size: 11px; color: #666;">* Frequência mínima recomendada: 75%</div>
  </body></html>`

  const win = window.open("", "_blank"); if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}

export function printDailyAttendancePDF(date: string, disciplineName: string, students: StudentProfile[], attendanceMap: Record<string, boolean>): void {
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  
  const rows = students.sort((a, b) => a.name.localeCompare(b.name)).map((s, i) => {
    const isPresent = attendanceMap[s.id] === true;
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-size: 11px; text-align: center; color: #64748b;">${(i+1).toString().padStart(2, '0')}</td>
        <td style="padding: 10px; font-size: 13px; font-weight: 600;">${s.name}</td>
        <td style="padding: 10px; font-size: 11px; color: #64748b;">${s.enrollment_number}</td>
        <td style="padding: 10px; font-size: 12px; text-align: center;">
          <span style="font-weight: bold; color: ${isPresent ? '#16a34a' : '#dc2626'}">
            ${isPresent ? 'PRESENTE' : 'FALTOU'}
          </span>
        </td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Chamada do Dia - ${formattedDate}</title><style>
    body{font-family: Arial, sans-serif; padding: 40px; color: #1e293b;}
    @media print { body { padding: 0; } }
    .header { border-bottom: 4px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #64748b; }
  </style></head>
  <body>
    <div class="header">
      <div>
        <div style="font-size: 12px; font-weight: bold; color: #f97316; text-transform: uppercase; margin-bottom: 4px;">Instituto de Ensino Teológico — IETEO</div>
        <h1 style="margin: 0; color: #1e3a5f; font-size: 24px;">Diário de Classe: Chamada do Dia</h1>
        <div style="margin-top: 5px; font-size: 15px; color: #475569;">Disciplina: <strong>${disciplineName}</strong></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: 800; color: #1e3a5f;">${formattedDate}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Alunos na Lista: ${students.length}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th style="width: 40px; text-align: center;">Nº</th>
        <th>NOME DO ALUNO</th>
        <th>MATRÍCULA</th>
        <th style="text-align: center;">STATUS</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
      <div style="width: 250px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 11px;">Assinatura do Professor</div>
      <div style="width: 200px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 11px;">Secretaria Acadêmica</div>
    </div>
    <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8;">
      Gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </body></html>`

  const win = window.open("", "_blank"); if (!win) return; win.document.write(html); win.document.close(); win.onload = () => win.print()
}
