import { useEffect, useState } from "react"
import { FileText, Award, CalendarCheck, Loader2, Calculator, CheckCircle2, Clock } from "lucide-react"
import {
    type Discipline, type Semester, type StudentSubmission, type Attendance, type Assessment, type StudentGrade,
    getDisciplines, getSemesters, getSubmissions, getAttendances, getAssessments, getStudentGrades
} from "@/lib/store"

interface Props {
    studentId: string
    studentEmail: string
}

export function StudentGradesView({ studentId, studentEmail }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [officialGrades, setOfficialGrades] = useState<StudentGrade[]>([])
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
    const [attendances, setAttendances] = useState<Attendance[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [d, sem, sub, allGrades] = await Promise.all([
                    getDisciplines(),
                    getSemesters(),
                    getSubmissions(),
                    getStudentGrades()
                ])

                setDisciplines(d)
                setSemesters(sem)

                // Filter official grades by student identifier (Show all, we will mask exam score if not public)
                const myGrades = allGrades.filter(g =>
                    g.studentIdentifier === studentEmail || g.studentIdentifier === studentId
                )
                setOfficialGrades(myGrades)

                // Fetch assessments to link submissions to disciplines
                const assessments = await getAssessments()

                // Filter submissions and check release status
                const mySubs = sub.filter(s => {
                    if (s.studentEmail !== studentEmail) return false
                    
                    // Find the discipline for this submission
                    const assessment = assessments.find(a => a.id === s.assessmentId)
                    if (!assessment) return false
                    
                    // Check if there is a released official grade for this discipline
                    const grade = myGrades.find(g => g.disciplineId === assessment.disciplineId)
                    return grade?.isPublic === true
                })
                setSubmissions(mySubs)

                // Attendances
                const attPromises = d.map(disc => getAttendances(disc.id))
                const allAttsArray = await Promise.all(attPromises)
                const flatAtts = allAttsArray.flat().filter(a => a.studentId === studentId)
                setAttendances(flatAtts)

            } catch (err) {
                console.error("Erro ao carregar notas:", err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [studentId, studentEmail])

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    const calculateAverage = (grade: StudentGrade) => {
        // As requested: (Exam + Attendance) / 2
        // We still allow the old way if other grades are present
        const exam = (grade.examGrade || 0)
        const attendance = (grade.attendanceScore || 0)

        if (grade.worksGrade === 0 && grade.seminarGrade === 0 && grade.participationBonus === 0) {
            return ((exam + attendance) / 2).toFixed(2)
        }

        const total =
            exam +
            (grade.worksGrade || 0) +
            (grade.seminarGrade || 0) +
            (grade.participationBonus || 0) +
            attendance

        const divisor = grade.customDivisor > 0 ? grade.customDivisor : 1;
        return (total / divisor).toFixed(2)
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Resumo de Destaque */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                <div className="h-16 w-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
                    <Award className="h-8 w-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-foreground">Meu Desempenho Oficial</h3>
                    <p className="text-sm text-muted-foreground">Aqui você encontra as notas finais lançadas e validadas pela secretaria e professores.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Disciplinas</div>
                        <div className="text-2xl font-black text-primary">{officialGrades.length}</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold font-serif text-foreground border-b border-border pb-2 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Boletim de Notas
                </h3>

                {officialGrades.length === 0 ? (
                    <div className="bg-card border border-border border-dashed rounded-xl p-10 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto opacity-20 mb-3" />
                        <p className="text-sm">Nenhuma nota oficial lançada até o momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {officialGrades.map(grade => {
                            const disc = disciplines.find(d => d.id === grade.disciplineId)
                            const avg = parseFloat(calculateAverage(grade))

                            return (
                                <div key={grade.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg text-foreground">{disc?.name || "Disciplina Geral"}</h4>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Semestre: {semesters.find(s => s.id === disc?.semesterId)?.name || "N/A"}</p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border">
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Média Final</div>
                                                <div className={`text-2xl font-black ${grade.isPublic ? (avg >= 7 ? 'text-green-600' : 'text-amber-600') : 'text-muted-foreground opacity-50'}`}>
                                                    {grade.isPublic ? avg.toFixed(2) : "--"}
                                                </div>
                                            </div>
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${grade.isPublic ? (avg >= 7 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-700') : 'bg-muted text-muted-foreground'}`}>
                                                {grade.isPublic ? (avg >= 7 ? <CheckCircle2 className="h-6 w-6" /> : <Award className="h-6 w-6" />) : <Clock className="h-6 w-6" />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
                                        {[
                                            { label: "Prova", val: grade.examGrade, isSecret: !grade.isPublic },
                                            { label: "Trabalhos", val: grade.worksGrade, isSecret: false },
                                            { label: "Seminários", val: grade.seminarGrade, isSecret: false },
                                            { label: "Participação", val: grade.participationBonus, isSecret: false },
                                            { label: "Presença", val: grade.attendanceScore, isSecret: false },
                                        ].map(item => (
                                            <div key={item.label} className={`bg-background border border-border rounded-lg p-3 text-center ${item.isSecret ? 'opacity-60 bg-muted/20' : ''}`}>
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{item.label}</div>
                                                <div className="font-bold text-foreground">
                                                    {item.isSecret ? "🔒" : item.val.toFixed(1)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {!grade.isPublic && (
                                        <div className="mt-4 text-[10px] bg-amber-50 text-amber-700 p-2 rounded-md border border-amber-100 flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            A nota da prova online e a média final serão liberadas após a correção do professor.
                                        </div>
                                    )}
                                    <div className="mt-4 text-[10px] text-muted-foreground text-right italic">
                                        Cálculo: (Soma das notas) / {grade.customDivisor}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Histórico de Tentativas (Submissões de Prova) */}
            {submissions.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-lg font-bold text-foreground mb-4 opacity-70">Histórico de Respostas (Simulados/Provas Online)</h4>
                    <div className="space-y-3">
                        {submissions.map(sub => (
                            <div key={sub.id} className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-semibold text-foreground">Resultado de Prova Online</p>
                                    <p className="text-xs text-muted-foreground">Enviado em {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{sub.score} / {sub.totalPoints} pts</div>
                                    <div className="text-xs text-primary">{sub.percentage}% de acerto</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
