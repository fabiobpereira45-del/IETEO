"use client"

import { useState, useEffect } from "react"
import {
        Plus, Pencil, Trash2, GraduationCap, Calculator, Loader2, Save, X, Download, Eye, EyeOff

} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    StudentGrade, getStudentGrades, saveStudentGrade, deleteStudentGrade,
    StudentProfile, getStudents, Discipline, getDisciplines
} from "@/lib/store"
import { printGradesReportPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { Switch } from "@/components/ui/switch"

export function GradesManager({ isMaster }: { isMaster: boolean }) {
    const [grades, setGrades] = useState<StudentGrade[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState<any>({
        studentIdentifier: "",
        studentName: "",
        disciplineId: "",
        isPublic: false,
        examGrade: "",
        worksGrade: "",
        seminarGrade: "",
        participationBonus: "",
        attendanceScore: "",
        customDivisor: "4"
    })

    const loadData = async () => {
        try {
            setLoading(true)
            const [fetchedGrades, fetchedStudents, fetchedDisciplines] = await Promise.all([
                getStudentGrades(),
                getStudents(),
                getDisciplines()
            ])
            setGrades(fetchedGrades)
            setStudents(fetchedStudents)
            setDisciplines(fetchedDisciplines)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.studentName || !formData.studentIdentifier) {
                throw new Error("O nome e identificador do aluno são obrigatórios.")
            }

            const gradeToSave = {
                studentIdentifier: formData.studentIdentifier,
                studentName: formData.studentName,
                disciplineId: formData.disciplineId,
                isPublic: formData.isPublic || false,
                examGrade: parseFloat(formData.examGrade) || 0,
                worksGrade: parseFloat(formData.worksGrade) || 0,
                seminarGrade: parseFloat(formData.seminarGrade) || 0,
                participationBonus: parseFloat(formData.participationBonus) || 0,
                attendanceScore: parseFloat(formData.attendanceScore) || 0,
                customDivisor: parseFloat(formData.customDivisor) || 4
            }

            await saveStudentGrade(
                gradeToSave as Omit<StudentGrade, 'id' | 'createdAt'>,
                isEditing || undefined
            )

            setIsCreating(false)
            setIsEditing(null)
            loadData()
        } catch (err: any) {
            alert("Erro ao salvar notas: " + err.message)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteStudentGrade(id)
            setDeleteConfirm(null)
            loadData()
        } catch (err: any) {
            alert("Erro ao deletar: " + err.message)
        }
    }

    const calculateAverage = (grade: StudentGrade) => {
        // As requested: (Exam + Attendance) / 2
        // We still allow the old way if other grades are present, 
        // but the default for automatic migration will be divisor 2.
        const exam = (parseFloat(grade.examGrade as any) || 0)
        const attendance = (parseFloat(grade.attendanceScore as any) || 0)
        
        // If works/seminar/participation are 0, use the specific formula
        if (grade.worksGrade === 0 && grade.seminarGrade === 0 && grade.participationBonus === 0) {
            return ((exam + attendance) / 2).toFixed(2)
        }

        const total =
            exam +
            (parseFloat(grade.worksGrade as any) || 0) +
            (parseFloat(grade.seminarGrade as any) || 0) +
            (parseFloat(grade.participationBonus as any) || 0) +
            attendance

        const divisor = grade.customDivisor > 0 ? grade.customDivisor : 1;
        return (total / divisor).toFixed(2)
    }

    const toggleRelease = async (grade: StudentGrade) => {
        try {
            await saveStudentGrade({ ...grade, isPublic: !grade.isPublic }, grade.id);
            loadData();
        } catch (err: any) {
            alert("Erro ao alterar visibilidade: " + err.message);
        }
    }


    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                <p className="font-semibold">Erro ao carregar notas</p>
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
                    Tentar Novamente
                </Button>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl flex items-center gap-2 font-bold tracking-tight text-foreground">
                            <GraduationCap className="h-6 w-6 text-primary" />
                            Gestão de Notas e Diários
                        </h2>
                        <p className="text-muted-foreground mt-1">Gere as notas de alunos matriculados e alunos de prova pública.</p>
                    </div>
                    <div className="flex gap-2">
                        {isMaster && (
                            <Button variant="outline" onClick={() => printGradesReportPDF(grades, "Relatório Geral de Notas")} className="border-primary text-primary hover:bg-primary/10">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar PDF
                            </Button>
                        )}
                        <Button onClick={() => {
                            setFormData({
                                studentIdentifier: "", studentName: "", disciplineId: "", isPublic: false,
                                examGrade: "", worksGrade: "", seminarGrade: "", participationBonus: "", attendanceScore: "", customDivisor: "4"
                            })
                            setIsCreating(true)
                            setIsEditing(null)
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Lançar Notas
                        </Button>
                    </div>
                </div>

                {/* Lançamento / Edição de Notas */}
                {(isCreating || isEditing) && (
                    <div className="bg-card border border-border shadow-sm rounded-xl p-6 mb-8">
                        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-3 flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            {isEditing ? "Editar Notas" : "Novo Lançamento"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Aluno</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.studentName || ""}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                        placeholder="Nome"
                                    />
                                    {!formData.isPublic && (
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            onChange={(e) => {
                                                const std = students.find(s => s.id === e.target.value)
                                                if (std) {
                                                    setFormData({ ...formData, studentName: std.name, studentIdentifier: std.cpf || std.enrollment_number || "" })
                                                }
                                            }}
                                        >
                                            <option value="">Buscar Aluno Matriculado...</option>
                                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Identificador (Email, CPF ou Matrícula)</Label>
                                <Input
                                    value={formData.studentIdentifier || ""}
                                    onChange={(e) => setFormData({ ...formData, studentIdentifier: e.target.value })}
                                    placeholder="Para alunos públicos informe um email ou doc único"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Disciplina / Referência</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.disciplineId || ""}
                                    onChange={(e) => setFormData({ ...formData, disciplineId: e.target.value })}
                                >
                                    <option value="">Geral / Indefinido</option>
                                    {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2 flex items-center justify-between border rounded-md p-3">
                                <div>
                                    <Label>Prova Pública?</Label>
                                    <p className="text-xs text-muted-foreground">Marque sim se o aluno não estiver matriculado formalmente.</p>
                                </div>
                                <Switch
                                    checked={formData.isPublic}
                                    onCheckedChange={(c) => setFormData({ ...formData, isPublic: c })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Nota de Prova</Label>
                                <Input type="number" step="0.1" value={formData.examGrade} onChange={(e) => setFormData({ ...formData, examGrade: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Nota de Trabalhos</Label>
                                <Input type="number" step="0.1" value={formData.worksGrade} onChange={(e) => setFormData({ ...formData, worksGrade: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Nota de Seminários / Apresentações</Label>
                                <Input type="number" step="0.1" value={formData.seminarGrade} onChange={(e) => setFormData({ ...formData, seminarGrade: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Bônus de Participação</Label>
                                <Input type="number" step="0.1" value={formData.participationBonus} onChange={(e) => setFormData({ ...formData, participationBonus: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Nota de Presença / Assiduidade</Label>
                                <Input type="number" step="0.1" value={formData.attendanceScore} onChange={(e) => setFormData({ ...formData, attendanceScore: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Divisor para Cálculo de Média</Label>
                                <Input type="number" step="1" min="1" value={formData.customDivisor} onChange={(e) => setFormData({ ...formData, customDivisor: e.target.value })} />
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => { setIsCreating(false); setIsEditing(null); }}>
                                <X className="h-4 w-4 mr-2" /> Cancelar
                            </Button>
                            <Button onClick={handleCreateOrUpdate}>
                                <Save className="h-4 w-4 mr-2" /> Salvar Notas
                            </Button>
                        </div>
                    </div>
                )}

                {/* Listagem de Notas */}
                <div className="space-y-8">
                    {['matriculados', 'publicos'].map((tipo) => {
                        const list = grades.filter(g => tipo === 'publicos' ? g.isPublic : !g.isPublic)
                        if (list.length === 0) return null

                        return (
                            <div key={tipo} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">
                                        {tipo === 'publicos' ? 'Alunos de Prova Pública' : 'Alunos Matriculados'} ({list.length})
                                    </h3>
                                </div>
                                <div className="divide-y divide-border">
                                    {list.map((grade) => (
                                        <div key={grade.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-foreground text-lg">{grade.studentName}</h4>
                                                <p className="text-sm text-muted-foreground font-mono mb-2">ID: {grade.studentIdentifier}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Prova: {grade.examGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Trabalhos: {grade.worksGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Seminário: {grade.seminarGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Partic.: {grade.participationBonus}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Presença: {grade.attendanceScore}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-center bg-muted px-4 py-2 rounded-lg border border-border min-w-[100px]">
                                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Média (/{grade.customDivisor})</div>
                                                    <div className={`text-2xl font-black ${parseFloat(calculateAverage(grade)) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {calculateAverage(grade)}
                                                    </div>
                                                     <div className="flex flex-col gap-2 mt-4">
                                                         <Button 
                                                            variant={grade.isPublic ? "default" : "outline"} 
                                                            size="sm" 
                                                            onClick={() => toggleRelease(grade)}
                                                            className={grade.isPublic ? "bg-green-600 hover:bg-green-700" : ""}
                                                         >
                                                             {grade.isPublic ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                                                             {grade.isPublic ? "Publicado" : "Privado"}
                                                         </Button>
                                                        <Button variant="outline" size="sm" onClick={() => {
                                                            setFormData(grade)
                                                            setIsEditing(grade.id)
                                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                                        }}>
                                                            <Pencil className="h-4 w-4 mr-2" /> Editar
                                                        </Button>
                                                        {isMaster && (
                                                            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(grade.id)}>
                                                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {grades.length === 0 && !isCreating && (
                        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto opacity-20 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma nota lançada.</h3>
                            <p className="text-sm">Clique em "Lançar Notas" para iniciar.</p>
                        </div>
                    )}
                </div>

                <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Notas</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir o boletim deste aluno permanentemente?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">
                                Confirmar Exclusão
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ErrorBoundary>
    )
}
