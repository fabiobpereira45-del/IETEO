import type { Assessment, Question, StudentAnswer, StudentSubmission } from "./store"

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

