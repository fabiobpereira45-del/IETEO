"use client"

import { useState, useEffect } from "react"
import {
        Plus, Pencil, Trash2, GraduationCap, Calculator, Loader2, Save, X, Download, Eye, EyeOff, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    StudentGrade, getStudentGrades, saveStudentGrade, deleteStudentGrade, releaseAllGrades,
    StudentProfile, getStudents, Discipline, getDisciplines, bulkSyncGrades, getClasses, ClassRoom,
    getGradeSettings, calculateGlobalAverage, type GradeSettings
} from "@/lib/store"
import { printGradesReportPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { Switch } from "@/components/ui/switch"

export function GradesManager({ isMaster }: { isMaster: boolean }) {
    const [grades, setGrades] = useState<StudentGrade[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [loading, setLoading] = useState(true)
    const [syncLoading, setSyncLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [selectedClassId, setSelectedClassId] = useState<string>("all")
    const [releasing, setReleasing] = useState(false)
    const [gradeSettings, setGradeSettings] = useState<GradeSettings | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 20

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
            const [fetchedGrades, fetchedStudents, fetchedDisciplines, fetchedClasses, fetchedSettings] = await Promise.all([
                getStudentGrades(),
                getStudents(),
                getDisciplines(),
                getClasses(),
                getGradeSettings()
            ])
            setGrades(fetchedGrades)
            setStudents(fetchedStudents)
            setDisciplines(fetchedDisciplines)
            setClasses(fetchedClasses)
            setGradeSettings(fetchedSettings)
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
            if (!formData.disciplineId) {
                throw new Error("Selecione uma disciplina. O lançamento geral não é permitido no momento.")
            }

            const gradeToSave = {
                studentIdentifier: formData.studentIdentifier,
                studentId: formData.studentId, // Ensure UUID is passed
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
                gradeToSave as any,
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
        if (!gradeSettings) return "0.00"
        return calculateGlobalAverage(grade, gradeSettings)
    }

    const toggleRelease = async (grade: StudentGrade) => {
        try {
            await saveStudentGrade({ ...grade, isPublic: !grade.isPublic }, grade.id);
            loadData();
        } catch (err: any) {
            alert("Erro ao alterar visibilidade: " + err.message);
        }
    }

    const handleSync = async () => {
        try {
            setSyncLoading(true)
            const { totalAffected } = await bulkSyncGrades()
            alert(`Sincronização concluída! ${totalAffected} registros foram vinculados com sucesso.`)
            loadData()
        } catch (err: any) {
            alert("Erro na sincronização: " + err.message)
        } finally {
            setSyncLoading(false)
        }
    }

    const handleReleaseAll = async () => {
        const msg = selectedClassId === "all" 
            ? "Deseja liberar as notas e médias de TODOS os alunos para visualização?"
            : "Deseja liberar as notas de TODOS os alunos da TURMA SELECIONADA?"
        if (!confirm(msg)) return
        try {
            setReleasing(true)
            await releaseAllGrades(selectedClassId)
            await loadData()
            alert("Notas liberadas com sucesso!")
        } catch (err: any) {
            alert("Erro ao liberar todas as notas: " + err.message)
        } finally {
            setReleasing(false)
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
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Filtrar Turma:</span>
                            <select
                                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                <option value="all">Todas as Turmas</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {isMaster && (
                            <Button 
                                variant="outline" 
                                onClick={handleSync} 
                                disabled={syncLoading}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                {syncLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                Sincronizar Vínculos
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            onClick={handleReleaseAll} 
                            disabled={releasing}
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            {releasing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                            Liberar Todas
                        </Button>
                        <Button variant="outline" onClick={() => printGradesReportPDF(grades, "Relatório Geral de Notas")} className="border-primary text-primary hover:bg-primary/10">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar PDF
                        </Button>
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
                                                    setFormData({ 
                                                        ...formData, 
                                                        studentName: std.name, 
                                                        studentId: std.id, // Store UUID
                                                        studentIdentifier: std.cpf || std.enrollment_number || "" 
                                                    })
                                                }
                                            }}
                                        >
                                            <option value="">Buscar Aluno Matriculado...</option>
                                            {students
                                                .filter(s => selectedClassId === "all" || s.class_id === selectedClassId)
                                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                                <Label>Nota de Testes</Label>
                                <Input type="number" step="0.1" value={formData.seminarGrade} onChange={(e) => setFormData({ ...formData, seminarGrade: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Outras Notas / Bônus</Label>
                                <Input type="number" step="0.1" value={formData.participationBonus} onChange={(e) => setFormData({ ...formData, participationBonus: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Nota de Presença (Auto ou Manual)</Label>
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
                        let list = grades.filter(g => tipo === 'publicos' ? g.isPublic : !g.isPublic)
                        
                        // Apply Turma Filter
                        if (selectedClassId !== "all" && tipo === 'matriculados') {
                            list = list.filter(g => {
                                const student = students.find(s => 
                                    s.cpf === g.studentIdentifier || 
                                    s.enrollment_number === g.studentIdentifier || 
                                    s.email === g.studentIdentifier
                                )
                                return student?.class_id === selectedClassId
                            })
                        }
                        if (list.length === 0) return null

                        // Paginate
                        const totalPages = Math.ceil(list.length / PAGE_SIZE)
                        const start = (currentPage - 1) * PAGE_SIZE
                        const paginated = list.slice(start, start + PAGE_SIZE)

                        return (
                            <div key={tipo} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">
                                        {tipo === 'publicos' ? 'Alunos de Prova Pública' : 'Alunos Matriculados'} ({list.length})
                                    </h3>
                                </div>
                                <div className="divide-y divide-border">
                                    {paginated.map((grade) => (
                                        <div key={grade.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-foreground text-lg">{grade.studentName}</h4>
                                                <p className="text-sm text-muted-foreground font-mono mb-2">ID: {grade.studentIdentifier}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                        Prova: {grade.examGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                        Presença: {grade.attendanceScore}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Trabalhos: {grade.worksGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Testes: {grade.seminarGrade}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                        Outros: {grade.participationBonus}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-center bg-muted px-4 py-2 rounded-lg border border-border min-w-[100px]">
                                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Média (/{gradeSettings?.divisor || grade.customDivisor})</div>
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

                    {/* Pagination Controls */}
                    {grades.length > PAGE_SIZE && (
                        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
                            <span className="text-sm text-muted-foreground">
                                Exibindo {Math.min((currentPage - 1) * PAGE_SIZE + 1, grades.length)}–{Math.min(currentPage * PAGE_SIZE, grades.length)} de {grades.length} registros
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                    ← Anterior
                                </Button>
                                <Button variant="outline" size="sm" disabled={currentPage * PAGE_SIZE >= grades.length} onClick={() => setCurrentPage(p => p + 1)}>
                                    Próxima →
                                </Button>
                            </div>
                        </div>
                    )}

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
