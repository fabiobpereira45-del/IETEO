"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays, BookOpen, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    type Semester, type Discipline, type ProfessorAccount,
    getSemesters, addSemester, updateSemester, deleteSemester,
    getDisciplines, updateDiscipline, addDiscipline, deleteDiscipline, uid,
    getProfessorAccounts, MASTER_CREDENTIALS
} from "@/lib/store"

export function SemesterManager() {
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [professors, setProfessors] = useState<ProfessorAccount[]>([])

    // Semester Modals
    const [semModal, setSemModal] = useState(false)
    const [editingSem, setEditingSem] = useState<Semester | null>(null)
    const [semName, setSemName] = useState("")
    const [semOrder, setSemOrder] = useState("")
    const [semShift, setSemShift] = useState<string>("EAD")
    const [deleteSemId, setDeleteSemId] = useState<string | null>(null)

    // Discipline Modals
    const [discModal, setDiscModal] = useState(false)
    const [editingDisc, setEditingDisc] = useState<Discipline | null>(null)
    const [discName, setDiscName] = useState("")
    const [discDesc, setDiscDesc] = useState("")
    const [discSemId, setDiscSemId] = useState<string>("")
    const [discProfName, setDiscProfName] = useState<string>("none")
    const [deleteDiscId, setDeleteDiscId] = useState<string | null>(null)

    async function load() {
        const [s, d, p] = await Promise.all([getSemesters(), getDisciplines(), getProfessorAccounts()])
        setSemesters(s.sort((a, b) => a.order - b.order))
        setDisciplines(d)
        setProfessors(p)
    }

    useEffect(() => { load() }, [])

    // --- Semesters ---
    async function handleSaveSem() {
        if (!semName.trim() || !semOrder.trim()) return
        const orderNum = parseInt(semOrder, 10)

        if (editingSem) {
            await updateSemester(editingSem.id, { name: semName.trim(), order: orderNum, shift: semShift })
        } else {
            await addSemester(semName.trim(), orderNum, semShift)
        }
        setSemModal(false)
        load()
    }

    async function handleDeleteSem(id: string) {
        if (disciplines.some(d => d.semesterId === id)) {
            alert("Não é possível excluir um semestre que possui disciplinas vinculadas.")
            setDeleteSemId(null)
            return
        }
        await deleteSemester(id)
        setDeleteSemId(null)
        load()
    }

    // --- Disciplines ---
    async function handleSaveDisc() {
        if (!discName.trim()) return

        if (editingDisc) {
            await updateDiscipline(editingDisc.id, {
                name: discName.trim(),
                description: discDesc.trim() || undefined,
                semesterId: discSemId === "none" ? undefined : discSemId,
                professorName: discProfName === "none" ? undefined : discProfName
            })
        } else {
            await addDiscipline(
                discName.trim(),
                discDesc.trim() || undefined,
                discSemId === "none" ? undefined : discSemId,
                discProfName === "none" ? undefined : discProfName
            )
        }
        setDiscModal(false)
        load()
    }

    async function handleDeleteDisc(id: string) {
        await deleteDiscipline(id)
        setDeleteDiscId(null)
        load()
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Gestão de Grade Curricular</h2>
                    <p className="text-sm text-muted-foreground">Organize as disciplinas por semestres</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setEditingSem(null)
                        setSemName("")
                        setSemOrder(String(semesters.length + 1))
                        setSemShift("EAD")
                        setSemModal(true)
                    }}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Novo Semestre
                    </Button>
                    <Button onClick={() => {
                        setEditingDisc(null)
                        setDiscName("")
                        setDiscDesc("")
                        setDiscSemId(semesters[0]?.id || "none")
                        setDiscProfName("none")
                        setDiscModal(true)
                    }}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Nova Disciplina
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {semesters.map(sem => {
                    const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                    return (
                        <div key={sem.id} className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                            <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold text-foreground">{sem.name}</h3>
                                    <span className="text-xs text-muted-foreground ml-2">Ordem: {sem.order}</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                                        setEditingSem(sem)
                                        setSemName(sem.name)
                                        setSemOrder(String(sem.order))
                                        setSemShift(sem.shift || "EAD")
                                        setSemModal(true)
                                    }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteSemId(sem.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {semDisciplines.length === 0 ? (
                                    <div className="col-span-full text-center py-4 text-sm text-muted-foreground italic">
                                        Nenhuma disciplina cadastrada neste semestre.
                                    </div>
                                ) : (
                                    semDisciplines.map(disc => (
                                        <div key={disc.id} className="border border-border rounded-lg p-3 hover:border-primary/40 transition-colors group relative">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-border hover:bg-muted text-muted-foreground" onClick={() => {
                                                    setEditingDisc(disc)
                                                    setDiscName(disc.name)
                                                    setDiscDesc(disc.description || "")
                                                    setDiscSemId(disc.semesterId || "none")
                                                    setDiscProfName(disc.professorName || "none")
                                                    setDiscModal(true)
                                                }}>
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={() => {
                                                    setDeleteDiscId(disc.id)
                                                }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <h4 className="font-medium text-sm text-foreground pr-10 truncate" title={disc.name}>{disc.name}</h4>
                                            {disc.professorName && <p className="text-xs text-primary font-medium truncate mt-0.5">Prof. {disc.professorName}</p>}
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={disc.description}>{disc.description || "Sem descrição"}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Disciplinas Sem Semestre Vinculado */}
                {disciplines.some(d => !d.semesterId) && (
                    <div className="bg-card border border-amber-200 shadow-sm rounded-xl overflow-hidden">
                        <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
                            <div className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="h-4 w-4" />
                                <h3 className="font-semibold">Disciplinas Não Vinculadas</h3>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-amber-50/30">
                            {disciplines.filter(d => !d.semesterId).map(disc => (
                                <div key={disc.id} className="border border-amber-200/60 bg-white rounded-lg p-3 group relative">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-border hover:bg-muted text-muted-foreground" onClick={() => {
                                            setEditingDisc(disc)
                                            setDiscName(disc.name)
                                            setDiscDesc(disc.description || "")
                                            setDiscSemId("none")
                                            setDiscProfName(disc.professorName || "none")
                                            setDiscModal(true)
                                        }}>
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <h4 className="font-medium text-sm text-foreground pr-10 truncate">{disc.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{disc.description || "Sem descrição"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals for Semester */}
            <Dialog open={semModal} onOpenChange={setSemModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingSem ? "Editar Semestre" : "Novo Semestre"}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Nome do Semestre *</Label>
                            <Input value={semName} onChange={(e) => setSemName(e.target.value)} placeholder="Ex: 1º Semestre" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Ordem (Número) *</Label>
                            <Input type="number" min={1} value={semOrder} onChange={(e) => setSemOrder(e.target.value)} placeholder="Ex: 1" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Turno *</Label>
                            <Select value={semShift} onValueChange={setSemShift}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o turno" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EAD">EAD</SelectItem>
                                    <SelectItem value="Matutino">Matutino</SelectItem>
                                    <SelectItem value="Vespertino">Vespertino</SelectItem>
                                    <SelectItem value="Noturno">Noturno</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSemModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSem}>Salvar Semestre</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modals for Discipline */}
            <Dialog open={discModal} onOpenChange={setDiscModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingDisc ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Nome da Disciplina *</Label>
                            <Input value={discName} onChange={(e) => setDiscName(e.target.value)} placeholder="Ex: Teologia Sistemática" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input value={discDesc} onChange={(e) => setDiscDesc(e.target.value)} placeholder="Opcional" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Semestre</Label>
                            <Select value={discSemId} onValueChange={setDiscSemId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um semestre" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não vincular (Sem Semestre)</SelectItem>
                                    {semesters.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.shift || "EAD"})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Professor / Docente</Label>
                            <Select value={discProfName} onValueChange={setDiscProfName}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o professor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem professor atribuído</SelectItem>
                                    <SelectItem value={MASTER_CREDENTIALS.name}>{MASTER_CREDENTIALS.name}</SelectItem>
                                    {professors.map(p => (
                                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveDisc}>Salvar Disciplina</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogs de Exclusão... */}
            <AlertDialog open={!!deleteSemId} onOpenChange={(o) => !o && setDeleteSemId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Semestre</AlertDialogTitle>
                        <AlertDialogDescription>Deseja excluir este semestre? Não é possível excluir semestres com disciplinas vinculadas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteSem(deleteSemId!)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteDiscId} onOpenChange={(o) => !o && setDeleteDiscId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Disciplina</AlertDialogTitle>
                        <AlertDialogDescription>A exclusão da disciplina exclui as provas e questões vinculadas. Tem certeza?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteDisc(deleteDiscId!)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
