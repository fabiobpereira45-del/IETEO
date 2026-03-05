"use client"

import { useEffect, useState } from "react"
import {
    Plus, Pencil, Trash2, CalendarDays, BookOpen, AlertCircle,
    Sun, Moon, Sunset, Laptop, ChevronDown, ChevronRight
} from "lucide-react"
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

const SHIFTS = [
    { value: "Matutino", label: "Matutino", icon: <Sun className="h-3.5 w-3.5" />, color: "bg-amber-50 border-amber-200 text-amber-800" },
    { value: "Vespertino", label: "Vespertino", icon: <Sunset className="h-3.5 w-3.5" />, color: "bg-orange-50 border-orange-200 text-orange-800" },
    { value: "Noturno", label: "Noturno", icon: <Moon className="h-3.5 w-3.5" />, color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { value: "EAD", label: "EAD", icon: <Laptop className="h-3.5 w-3.5" />, color: "bg-sky-50 border-sky-200 text-sky-800" },
]

function getShiftStyle(shift?: string) {
    return SHIFTS.find(s => s.value === shift) || SHIFTS[3]
}

export function SemesterManager() {
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [professors, setProfessors] = useState<ProfessorAccount[]>([])

    // Semester Modals
    const [semModal, setSemModal] = useState(false)
    const [editingSem, setEditingSem] = useState<Semester | null>(null)
    const [semName, setSemName] = useState("")
    const [semOrder, setSemOrder] = useState("")
    const [deleteSemId, setDeleteSemId] = useState<string | null>(null)

    // Discipline Modal
    const [discModal, setDiscModal] = useState(false)
    const [editingDisc, setEditingDisc] = useState<Discipline | null>(null)
    const [discName, setDiscName] = useState("")
    const [discDesc, setDiscDesc] = useState("")
    const [discSemId, setDiscSemId] = useState<string>("none")
    const [discShift, setDiscShift] = useState<string>("Matutino")
    const [discProfName, setDiscProfName] = useState<string>("none")
    const [deleteDiscId, setDeleteDiscId] = useState<string | null>(null)

    // Collapsed shift-blocks per semester
    const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())

    async function load() {
        const [s, d, p] = await Promise.all([getSemesters(), getDisciplines(), getProfessorAccounts()])
        setSemesters(s.sort((a, b) => a.order - b.order))
        setDisciplines(d)
        setProfessors(p)
    }

    useEffect(() => { load() }, [])

    function toggleBlock(key: string) {
        setCollapsedBlocks(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    // --- Semesters ---
    async function handleSaveSem() {
        if (!semName.trim() || !semOrder.trim()) return
        const orderNum = parseInt(semOrder, 10)
        if (editingSem) {
            await updateSemester(editingSem.id, { name: semName.trim(), order: orderNum })
        } else {
            await addSemester(semName.trim(), orderNum)
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
    function openNewDisc(semId?: string, shift?: string) {
        setEditingDisc(null)
        setDiscName("")
        setDiscDesc("")
        setDiscSemId(semId || semesters[0]?.id || "none")
        setDiscShift(shift || "Matutino")
        setDiscProfName("none")
        setDiscModal(true)
    }

    function openEditDisc(disc: Discipline) {
        setEditingDisc(disc)
        setDiscName(disc.name)
        setDiscDesc(disc.description || "")
        setDiscSemId(disc.semesterId || "none")
        setDiscShift(disc.shift || "Matutino")
        setDiscProfName(disc.professorName || "none")
        setDiscModal(true)
    }

    async function handleSaveDisc() {
        if (!discName.trim()) return
        if (editingDisc) {
            await updateDiscipline(editingDisc.id, {
                name: discName.trim(),
                description: discDesc.trim() || undefined,
                semesterId: discSemId === "none" ? undefined : discSemId,
                shift: discShift,
                professorName: discProfName === "none" ? undefined : discProfName
            })
        } else {
            await addDiscipline(
                discName.trim(),
                discDesc.trim() || undefined,
                discSemId === "none" ? undefined : discSemId,
                discProfName === "none" ? undefined : discProfName,
                discShift
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
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Gestão de Grade Curricular</h2>
                    <p className="text-sm text-muted-foreground">Organize disciplinas por semestre e turno — a mesma disciplina pode aparecer em turnos diferentes</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setEditingSem(null)
                        setSemName("")
                        setSemOrder(String(semesters.length + 1))
                        setSemModal(true)
                    }}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Novo Semestre
                    </Button>
                    <Button onClick={() => openNewDisc()}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Nova Disciplina
                    </Button>
                </div>
            </div>

            {/* Semester Cards */}
            <div className="flex flex-col gap-6">
                {semesters.map(sem => {
                    const semDiscs = disciplines.filter(d => d.semesterId === sem.id)
                    // Group disciplines by shift
                    const shifts = [...new Set(semDiscs.map(d => d.shift || "Sem Turno"))].sort()

                    return (
                        <div key={sem.id} className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
                            {/* Semester header */}
                            <div className="bg-primary/5 px-5 py-3.5 flex items-center justify-between border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{sem.name}</h3>
                                        <p className="text-xs text-muted-foreground">Ordem {sem.order} · {semDiscs.length} disciplina{semDiscs.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 items-center">
                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1.5 text-primary" onClick={() => openNewDisc(sem.id, "Matutino")} title="Adicionar disciplina a este semestre">
                                        <Plus className="h-3.5 w-3.5" /> Disciplina
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                                        setEditingSem(sem)
                                        setSemName(sem.name)
                                        setSemOrder(String(sem.order))
                                        setSemModal(true)
                                    }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteSemId(sem.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Shift Blocks */}
                            <div className="divide-y divide-border">
                                {semDiscs.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground italic">Nenhuma disciplina neste semestre.</p>
                                        <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs" onClick={() => openNewDisc(sem.id, "Matutino")}>
                                            <Plus className="h-3 w-3" /> Adicionar primeira disciplina
                                        </Button>
                                    </div>
                                ) : (
                                    shifts.map(shiftName => {
                                        const shiftDiscs = semDiscs.filter(d => (d.shift || "Sem Turno") === shiftName)
                                        const blockKey = `${sem.id}-${shiftName}`
                                        const isCollapsed = collapsedBlocks.has(blockKey)
                                        const style = getShiftStyle(shiftName)

                                        return (
                                            <div key={shiftName}>
                                                {/* Shift block header */}
                                                <button
                                                    className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition-colors hover:bg-muted/40`}
                                                    onClick={() => toggleBlock(blockKey)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.color}`}>
                                                            {style.icon} {shiftName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{shiftDiscs.length} disciplina{shiftDiscs.length !== 1 ? "s" : ""}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs gap-1 text-primary"
                                                            onClick={e => { e.stopPropagation(); openNewDisc(sem.id, shiftName) }}
                                                        >
                                                            <Plus className="h-3 w-3" /> Adicionar
                                                        </Button>
                                                        {isCollapsed
                                                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                                    </div>
                                                </button>

                                                {/* Disciplines grid */}
                                                {!isCollapsed && (
                                                    <div className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        {shiftDiscs.map(disc => (
                                                            <div key={disc.id} className="border border-border rounded-xl p-3.5 hover:border-primary/40 transition-colors group relative bg-background">
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                    <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-border hover:bg-muted text-muted-foreground" onClick={() => openEditDisc(disc)}>
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                    <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={() => setDeleteDiscId(disc.id)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                                <h4 className="font-semibold text-sm text-foreground pr-14 leading-snug" title={disc.name}>{disc.name}</h4>
                                                                {disc.professorName && <p className="text-xs text-primary font-medium truncate mt-1">Prof. {disc.professorName}</p>}
                                                                {disc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{disc.description}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}

                                {/* Add new shift block */}
                                {semDiscs.length > 0 && (
                                    <div className="px-5 py-3 flex gap-2 flex-wrap">
                                        {SHIFTS.filter(s => !shifts.includes(s.value)).map(s => (
                                            <button
                                                key={s.value}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${s.color}`}
                                                onClick={() => openNewDisc(sem.id, s.value)}
                                            >
                                                <Plus className="h-3 w-3" />
                                                {s.icon} Adicionar turno {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Unlinked disciplines */}
                {disciplines.some(d => !d.semesterId) && (
                    <div className="bg-card border border-amber-200 shadow-sm rounded-2xl overflow-hidden">
                        <div className="bg-amber-50 px-5 py-3.5 flex items-center justify-between border-b border-amber-200">
                            <div className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="h-4 w-4" />
                                <h3 className="font-semibold">Disciplinas Não Vinculadas</h3>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-amber-50/30">
                            {disciplines.filter(d => !d.semesterId).map(disc => (
                                <div key={disc.id} className="border border-amber-200/60 bg-white rounded-xl p-3.5 group relative">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button className="h-6 w-6 rounded flex items-center justify-center bg-background border border-border hover:bg-muted text-muted-foreground" onClick={() => openEditDisc(disc)}>
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

            {/* Modal: Semester */}
            <Dialog open={semModal} onOpenChange={setSemModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingSem ? "Editar Semestre" : "Novo Semestre"}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Nome do Semestre *</Label>
                            <Input value={semName} onChange={e => setSemName(e.target.value)} placeholder="Ex: 1º Semestre — 2026" autoFocus />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Ordem (Número) *</Label>
                            <Input type="number" min={1} value={semOrder} onChange={e => setSemOrder(e.target.value)} placeholder="Ex: 1" />
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                            💡 O turno agora é definido por bloco dentro do semestre, não no semestre inteiro — isso permite ter Matutino e Noturno no mesmo semestre.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSemModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSem}>Salvar Semestre</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Discipline */}
            <Dialog open={discModal} onOpenChange={setDiscModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingDisc ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Nome da Disciplina *</Label>
                            <Input value={discName} onChange={e => setDiscName(e.target.value)} placeholder="Ex: Teologia Sistemática" autoFocus />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input value={discDesc} onChange={e => setDiscDesc(e.target.value)} placeholder="Opcional" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>Semestre</Label>
                                <Select value={discSemId} onValueChange={setDiscSemId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem semestre</SelectItem>
                                        {semesters.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Turno *</Label>
                                <Select value={discShift} onValueChange={setDiscShift}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Turno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SHIFTS.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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

                        {/* Tip: same discipline in different shifts */}
                        {!editingDisc && (
                            <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-2">
                                ✨ Para ter a mesma disciplina em turnos diferentes (ex: Manhã e Noite), cadastre-a duas vezes escolhendo um turno diferente a cada vez.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveDisc}>Salvar Disciplina</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete dialogs */}
            <AlertDialog open={!!deleteSemId} onOpenChange={o => !o && setDeleteSemId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Semestre</AlertDialogTitle>
                        <AlertDialogDescription>Não é possível excluir semestres com disciplinas vinculadas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteSem(deleteSemId!)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteDiscId} onOpenChange={o => !o && setDeleteDiscId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Disciplina</AlertDialogTitle>
                        <AlertDialogDescription>A exclusão da disciplina remove as provas e questões vinculadas. Tem certeza?</AlertDialogDescription>
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
