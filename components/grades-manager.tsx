"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
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
    StudentGrade, getStudentGrades, saveStudentGrade, deleteStudentGrade, releaseAllGrades, blockAllGrades,
    StudentProfile, getStudents, Discipline, getDisciplines, bulkSyncGrades, syncAllAttendanceScores, getClasses, ClassRoom,
    getGradeSettings, calculateGlobalAverage, type GradeSettings
} from "@/lib/store"
import { printGradesReportPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// --- Sub-components for better performance ---

const GradeRow = memo(({ 
    grade, 
    gradeSettings, 
    onToggleRelease, 
    onEdit, 
    onDelete, 
    isMaster,
    calculateAverage
}: { 
    grade: StudentGrade, 
    gradeSettings: GradeSettings | null, 
    onToggleRelease: (g: StudentGrade) => void, 
    onEdit: (g: StudentGrade) => void, 
    onDelete: (id: string) => void, 
    isMaster: boolean,
    calculateAverage: (g: StudentGrade) => string
}) => {
    const average = calculateAverage(grade);
    const isPassing = parseFloat(average) >= 7.0;
    const presenceCount = Math.round(grade.attendanceScore / 2.5);

    return (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex-1">
                <h4 className="font-bold text-foreground text-lg">{grade.studentName}</h4>
                <p className="text-[10px] text-muted-foreground font-mono mb-3 uppercase tracking-wider">ID: {grade.studentIdentifier}</p>
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter">Presença e Frequência</span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                            {grade.attendanceScore.toFixed(1)} pts ({presenceCount} presenças)
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-primary tracking-tighter">Nota da Prova</span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/5 text-primary border border-primary/20 shadow-sm">
                            {grade.examGrade.toFixed(1)} pts
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-center bg-card px-5 py-3 rounded-2xl border-2 border-border/50 min-w-[140px] shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">
                        Média Final
                    </div>
                    <div className={`text-3xl font-black ${isPassing ? 'text-green-600' : 'text-amber-600'}`}>
                        {average}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
                        (Pres + Prova) / 2
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button 
                            variant={grade.isPublic ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => onToggleRelease(grade)}
                            className={cn("h-8 rounded-lg text-[10px] font-bold uppercase px-3", grade.isPublic ? "bg-green-600 hover:bg-green-700" : "")}
                        >
                            {grade.isPublic ? <Eye className="h-3 w-3 mr-1.5" /> : <EyeOff className="h-3 w-3 mr-1.5" />}
                            {grade.isPublic ? "Publicado" : "Privado"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEdit(grade)} className="h-8 rounded-lg text-[10px] font-bold uppercase px-3">
                            <Pencil className="h-3 w-3 mr-1.5" /> Editar
                        </Button>
                    </div>
                    {isMaster && (
                        <Button variant="ghost" size="sm" onClick={() => onDelete(grade.id)} className="h-8 rounded-lg text-[10px] font-bold uppercase px-3 text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3 mr-1.5" /> Excluir
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
});

GradeRow.displayName = "GradeRow";

// --- Main Component ---

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
    const [formDataLoaded, setFormDataLoaded] = useState(false)
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
        customDivisor: "2"
    })

    // Core load: only grades + settings + classes
    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [fetchedGrades, fetchedSettings, fetchedClasses] = await Promise.all([
                getStudentGrades(),
                getGradeSettings(),
                getClasses()
            ])
            setGrades(fetchedGrades)
            setGradeSettings(fetchedSettings)
            setClasses(fetchedClasses)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // Lazy load student & discipline lists for forms
    const ensureFormData = useCallback(async () => {
        if (formDataLoaded) return
        try {
            const [fetchedStudents, fetchedDisciplines] = await Promise.all([
                getStudents(),
                getDisciplines()
            ])
            setStudents(fetchedStudents)
            setDisciplines(fetchedDisciplines)
            setFormDataLoaded(true)
        } catch (err: any) {
            console.error("Error loading form data:", err)
        }
    }, [formDataLoaded])

    useEffect(() => {
        loadData()
    }, [loadData])

    // --- Performance Optimizations ---

    // 1. Create a student map for O(1) lookup
    const studentMap = useMemo(() => {
        const map = new Map<string, StudentProfile>();
        students.forEach(s => {
            if (s.cpf) map.set(s.cpf.replace(/\D/g, ''), s);
            if (s.enrollment_number) map.set(s.enrollment_number, s);
            if (s.email) map.set(s.email.toLowerCase().trim(), s);
        });
        return map;
    }, [students]);

    // 2. Optimized Filtering Logic
    const filteredGrades = useMemo(() => {
        const matriculados: StudentGrade[] = [];
        const publicos: StudentGrade[] = [];

        grades.forEach(g => {
            if (g.isPublic) {
                publicos.push(g);
            } else {
                // Filter by class if selected
                if (selectedClassId !== "all") {
                    const student = studentMap.get(g.studentIdentifier.replace(/\D/g, '')) || 
                                    studentMap.get(g.studentIdentifier);
                    
                    if (student?.class_id === selectedClassId) {
                        matriculados.push(g);
                    }
                } else {
                    matriculados.push(g);
                }
            }
        });

        return { matriculados, publicos };
    }, [grades, selectedClassId, studentMap]);

    // 3. Pagination Logic
    const paginatedMatriculados = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredGrades.matriculados.slice(start, start + PAGE_SIZE);
    }, [filteredGrades.matriculados, currentPage]);

    const paginatedPublicos = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredGrades.publicos.slice(start, start + PAGE_SIZE);
    }, [filteredGrades.publicos, currentPage]);

    // --- Handlers ---

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.studentName || !formData.studentIdentifier) {
                throw new Error("O nome e identificador do aluno são obrigatórios.")
            }

            const gradeToSave = {
                studentIdentifier: formData.studentIdentifier,
                studentId: formData.studentId,
                studentName: formData.studentName,
                disciplineId: formData.disciplineId,
                isPublic: formData.isPublic || false,
                examGrade: parseFloat(formData.examGrade) || 0,
                worksGrade: parseFloat(formData.worksGrade) || 0,
                seminarGrade: parseFloat(formData.seminarGrade) || 0,
                participationBonus: parseFloat(formData.participationBonus) || 0,
                attendanceScore: parseFloat(formData.attendanceScore) || 0,
                customDivisor: parseFloat(formData.customDivisor) || 2
            }

            await saveStudentGrade(gradeToSave as any, isEditing || undefined)

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

    const calculateAverage = useCallback((grade: StudentGrade) => {
        if (!gradeSettings) return "0.00"
        return calculateGlobalAverage(grade, gradeSettings)
    }, [gradeSettings])

    const toggleRelease = useCallback(async (grade: StudentGrade) => {
        try {
            await saveStudentGrade({ ...grade, isPublic: !grade.isPublic }, grade.id);
            loadData();
        } catch (err: any) {
            alert("Erro ao alterar visibilidade: " + err.message);
        }
    }, [loadData])

    const handleSync = useCallback(async () => {
        try {
            setSyncLoading(true)
            await bulkSyncGrades()
            await syncAllAttendanceScores()
            alert(`Sincronização concluída! As notas de presença foram recalculadas com base no registro de frequência.`)
            loadData()
        } catch (err: any) {
            alert("Erro na sincronização: " + err.message)
        } finally {
            setSyncLoading(false)
        }
    }, [loadData])

    const handleReleaseAll = useCallback(async () => {
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
    }, [selectedClassId, loadData])

    const handleBlockAll = useCallback(async () => {
        const msg = selectedClassId === "all" 
            ? "Deseja bloquear as notas e médias de TODOS os alunos? Elas não serão mais vistas no Portal."
            : "Deseja bloquear as notas de TODOS os alunos da TURMA SELECIONADA?"
        if (!confirm(msg)) return
        try {
            setReleasing(true)
            await blockAllGrades(selectedClassId)
            await loadData()
            alert("Notas bloqueadas com sucesso!")
        } catch (err: any) {
            alert("Erro ao bloquear todas as notas: " + err.message)
        } finally {
            setReleasing(false)
        }
    }, [selectedClassId, loadData])

    const handleEdit = useCallback((grade: StudentGrade) => {
        ensureFormData()
        setFormData(grade)
        setIsEditing(grade.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [ensureFormData]);

    // --- Render ---

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
                        <p className="text-muted-foreground mt-1 text-sm">Gere as notas de alunos matriculados e alunos de prova pública.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border shadow-sm">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtrar Turma:</span>
                            <select
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer text-foreground"
                                value={selectedClassId}
                                onChange={(e) => {
                                    setSelectedClassId(e.target.value);
                                    setCurrentPage(1); // Reset page on filter change
                                    if (e.target.value !== "all") ensureFormData(); // Pre-load students for filtering if class selected
                                }}
                            >
                                <option value="all">Todas as Turmas</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {isMaster && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleSync} 
                                disabled={syncLoading}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50 h-9"
                            >
                                {syncLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                <span className="hidden sm:inline">Sincronizar Vínculos</span>
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleReleaseAll} 
                            disabled={releasing}
                            className="border-green-600 text-green-600 hover:bg-green-50 h-9"
                        >
                            {releasing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                            <span className="hidden sm:inline">Liberar Todas</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={grades.length === 0}
                            onClick={() => {
                                if (!gradeSettings) {
                                    alert("Aguarde o carregamento das configurações de notas...");
                                    return;
                                }
                                printGradesReportPDF(grades, "Relatório Geral de Notas", gradeSettings)
                            }} 
                            className="border-primary text-primary hover:bg-primary/10 h-9"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </Button>
                        <Button size="sm" className="h-9 bg-primary hover:bg-primary/90" onClick={() => {
                            ensureFormData()
                            setFormData({
                                studentIdentifier: "", studentName: "", disciplineId: "", isPublic: false,
                                examGrade: "", worksGrade: "", seminarGrade: "", participationBonus: "", attendanceScore: "", customDivisor: "2"
                            })
                            setIsCreating(true)
                            setIsEditing(null)
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Lançar Notas
                        </Button>
                    </div>
                </div>

                {/* Form Section */}
                {(isCreating || isEditing) && (
                    <div className="bg-card border border-border shadow-md rounded-xl p-6 mb-8 animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-3 flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            {isEditing ? "Editar Notas" : "Novo Lançamento"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Aluno</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.studentName || ""}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                        placeholder="Nome"
                                        className="flex-1"
                                    />
                                    {!formData.isPublic && (
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            onChange={(e) => {
                                                const std = students.find(s => s.id === e.target.value)
                                                if (std) {
                                                    setFormData({ 
                                                        ...formData, 
                                                        studentName: std.name, 
                                                        studentId: std.id,
                                                        studentIdentifier: std.cpf || std.enrollment_number || "" 
                                                    })
                                                }
                                            }}
                                        >
                                            <option value="">Buscar Matriculado...</option>
                                            {students
                                                .filter(s => selectedClassId === "all" || s.class_id === selectedClassId)
                                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identificador (Email, CPF ou Matrícula)</Label>
                                <Input
                                    value={formData.studentIdentifier || ""}
                                    onChange={(e) => setFormData({ ...formData, studentIdentifier: e.target.value })}
                                    placeholder="Doc único do aluno"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Disciplina / Referência</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.disciplineId || ""}
                                    onChange={(e) => setFormData({ ...formData, disciplineId: e.target.value })}
                                >
                                    <option value="">Geral / Indefinido</option>
                                    {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2 flex items-center justify-between border border-border bg-muted/30 rounded-lg p-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prova Pública?</Label>
                                    <p className="text-[10px] text-muted-foreground mt-1">Marque se o aluno não estiver matriculado formalmente.</p>
                                </div>
                                <Switch
                                    checked={formData.isPublic}
                                    onCheckedChange={(c) => setFormData({ ...formData, isPublic: c })}
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:col-span-2 mt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Presença (Pts)</Label>
                                    <Input type="number" step="0.1" value={formData.attendanceScore} onChange={(e) => setFormData({ ...formData, attendanceScore: e.target.value })} placeholder="Cada presença = 2.5 pts" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nota de Prova</Label>
                                    <Input type="number" step="0.1" value={formData.examGrade} onChange={(e) => setFormData({ ...formData, examGrade: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                            <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setIsEditing(null); }}>
                                <X className="h-4 w-4 mr-2" /> Cancelar
                            </Button>
                            <Button size="sm" onClick={handleCreateOrUpdate} className="bg-primary hover:bg-primary/90 px-6 shadow-md">
                                <Save className="h-4 w-4 mr-2" /> Salvar Notas
                            </Button>
                        </div>
                    </div>
                )}

                {/* List Section */}
                <div className="space-y-8">
                    {[
                        { id: 'matriculados', title: 'Alunos Matriculados', list: paginatedMatriculados, total: filteredGrades.matriculados.length },
                        { id: 'publicos', title: 'Alunos de Prova Pública', list: paginatedPublicos, total: filteredGrades.publicos.length }
                    ].map((section) => {
                        if (section.total === 0) return null;

                        return (
                            <div key={section.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-muted/30 px-6 py-4 border-b border-border flex justify-between items-center">
                                    <h3 className="font-bold text-foreground flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", section.id === 'publicos' ? "bg-blue-500" : "bg-primary")} />
                                        {section.title} 
                                        <span className="text-xs font-normal text-muted-foreground ml-1">({section.total})</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-border">
                                    {section.list.map((grade) => (
                                        <GradeRow 
                                            key={grade.id} 
                                            grade={grade} 
                                            gradeSettings={gradeSettings}
                                            onToggleRelease={toggleRelease}
                                            onEdit={handleEdit}
                                            onDelete={setDeleteConfirm}
                                            isMaster={isMaster}
                                            calculateAverage={calculateAverage}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* Pagination Controls */}
                    {Math.max(filteredGrades.matriculados.length, filteredGrades.publicos.length) > PAGE_SIZE && (
                        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground">
                                Exibindo {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, Math.max(filteredGrades.matriculados.length, filteredGrades.publicos.length))} de {Math.max(filteredGrades.matriculados.length, filteredGrades.publicos.length)} registros
                            </span>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={currentPage === 1} 
                                    onClick={() => {
                                        setCurrentPage(p => p - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="h-8 text-xs"
                                >
                                    ← Anterior
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={currentPage * PAGE_SIZE >= Math.max(filteredGrades.matriculados.length, filteredGrades.publicos.length)} 
                                    onClick={() => {
                                        setCurrentPage(p => p + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="h-8 text-xs"
                                >
                                    Próxima →
                                </Button>
                            </div>
                        </div>
                    )}

                    {grades.length === 0 && !isCreating && (
                        <div className="bg-card border border-border border-dashed rounded-xl p-16 text-center text-muted-foreground animate-in fade-in duration-700">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                <Calculator className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">Nenhuma nota lançada.</h3>
                            <p className="text-sm max-w-xs mx-auto">Comece agora mesmo lançando a primeira nota do sistema clicando no botão acima.</p>
                            <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => setIsCreating(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Criar Lançamento
                            </Button>
                        </div>
                    )}
                </div>

                <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                    <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">Excluir Notas?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                Esta ação é irreversível. O boletim deste aluno será removido permanentemente do sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3 mt-4">
                            <AlertDialogCancel className="rounded-xl border-slate-200">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6">
                                Confirmar Exclusão
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ErrorBoundary>
    )
}
