"use client"

import { useEffect, useState, useMemo } from "react"
import {
    Plus, Pencil, Trash2, CalendarDays, BookOpen, AlertCircle, X,
    MessageSquare, CheckCircle2,
    Search, LogOut, ArrowRightCircle, ChevronUp, ChevronDown, Download, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    getDisciplines, updateDiscipline, addDiscipline, deleteDiscipline,
    getProfessorAccounts, MASTER_CREDENTIALS
} from "@/lib/store"
import { printCurriculumPDF } from "@/lib/pdf"

// ─── Componente Removido: Dias e Turnos agora vivem no Quadro de Horários ─────

export function SemesterManager({ isMaster }: { isMaster?: boolean }) {
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [professors, setProfessors] = useState<ProfessorAccount[]>([])
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    // Semester modal
    const [semModal, setSemModal] = useState(false)
    const [editingSem, setEditingSem] = useState<Semester | null>(null)
    const [semName, setSemName] = useState("")
    const [semOrder, setSemOrder] = useState("")
    const [selectedPoolDiscs, setSelectedPoolDiscs] = useState<Set<string>>(new Set())
    const [deleteSemId, setDeleteSemId] = useState<string | null>(null)

    // Discipline modal
    const [discModal, setDiscModal] = useState(false)
    const [editingDisc, setEditingDisc] = useState<Discipline | null>(null)
    const [selectedPoolDisc, setSelectedPoolDisc] = useState<Discipline | null>(null)
    const [discSearch, setDiscSearch] = useState("")
    const [discName, setDiscName] = useState("")
    const [discDesc, setDiscDesc] = useState("")
    const [discSemId, setDiscSemId] = useState("")
    const [discProfName, setDiscProfName] = useState("none")

    // Delete confirmations
    const [unlinkDiscId, setUnlinkDiscId] = useState<string | null>(null)   // unlink from semester (back to pool)
    const [deleteDiscId, setDeleteDiscId] = useState<string | null>(null)   // permanent delete (from pool only)
    const [deleteSemIdConfirm, setDeleteSemIdConfirm] = useState<string | null>(null)

    // New Fields
    const [discMonth, setDiscMonth] = useState<string>("none")
    const [discYear, setDiscYear] = useState<string>("2026")

    async function load() {
        const [s, d, p] = await Promise.all([getSemesters(), getDisciplines(), getProfessorAccounts()])
        setSemesters(s.sort((a, b) => a.order - b.order))
        setDisciplines(d)
        setProfessors(p)
    }

    useEffect(() => { load() }, [])

    // Pool = disciplines not linked to any semester
    const poolDiscs = useMemo(() => disciplines.filter(d => !d.semesterId), [disciplines])

    // Filtered pool for search
    const filteredPool = useMemo(() => {
        if (!discSearch.trim()) return poolDiscs
        return poolDiscs.filter(d => d.name.toLowerCase().includes(discSearch.toLowerCase()))
    }, [poolDiscs, discSearch])

    function toggleCollapse(key: string) {
        setCollapsed(prev => {
            const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
        })
    }

    // ── Semester actions ──────────────────────────────────────────────────────
    async function handleSaveSem() {
        if (!semName.trim() || !semOrder.trim()) return
        let semId = ""
        if (editingSem) {
            await updateSemester(editingSem.id, { name: semName.trim(), order: parseInt(semOrder, 10) })
            semId = editingSem.id
        } else {
            const newSem = await addSemester(semName.trim(), parseInt(semOrder, 10))
            semId = newSem.id
        }

        // Link selected disciplines
        if (selectedPoolDiscs.size > 0) {
            await Promise.all(
                Array.from(selectedPoolDiscs).map(id => updateDiscipline(id, { semesterId: semId }))
            )
        }

        setSemModal(false); setSelectedPoolDiscs(new Set()); load()
    }

    async function handleDeleteSem(id: string) {
        if (disciplines.some(d => d.semesterId === id)) {
            alert("Não é possível excluir um semestre com disciplinas vinculadas.")
            setDeleteSemIdConfirm(null); return
        }
        await deleteSemester(id); setDeleteSemIdConfirm(null); load()
    }

    // ── Discipline modal ──────────────────────────────────────────────────────
    function openNewDisc(semId?: string) {
        setEditingDisc(null); setSelectedPoolDisc(null); setDiscSearch("")
        setDiscName(""); setDiscDesc(""); setDiscSemId(semId || semesters[0]?.id || "")
        setDiscProfName("none"); setDiscMonth("none"); setDiscYear(new Date().getFullYear().toString())
        setDiscModal(true)
    }

    function openEditDisc(disc: Discipline) {
        setEditingDisc(disc); setSelectedPoolDisc(null); setDiscSearch("")
        setDiscName(disc.name); setDiscDesc(disc.description || "")
        setDiscSemId(disc.semesterId || "")
        setDiscProfName(disc.professorName || "none")
        setDiscMonth(disc.applicationMonth || "none")
        setDiscYear(disc.applicationYear || new Date().getFullYear().toString())
        setDiscModal(true)
    }

    // Pick an existing discipline from the pool
    function pickPoolDisc(disc: Discipline) {
        setSelectedPoolDisc(disc)
        setDiscName(disc.name)
        setDiscDesc(disc.description || "")
        setDiscProfName(disc.professorName || "none")
        setDiscSearch("")
    }

    function clearPickedDisc() {
        setSelectedPoolDisc(null); setDiscName(""); setDiscDesc(""); setDiscProfName("none"); setDiscSearch("")
    }

    async function handleSaveDisc() {
        if (!discName.trim() && !selectedPoolDisc) return
        const semId = discSemId === "none" ? null : (discSemId || null)
        const prof = discProfName === "none" ? null : discProfName
        const month = discMonth === "none" ? null : discMonth
        const year = discYear

        if (selectedPoolDisc) {
            await updateDiscipline(selectedPoolDisc.id, {
                semesterId: semId, professorName: prof, applicationMonth: month, applicationYear: year
            })
        } else if (editingDisc) {
            await updateDiscipline(editingDisc.id, {
                name: discName.trim(), description: discDesc.trim() || null,
                semesterId: semId, professorName: prof, applicationMonth: month, applicationYear: year
            })
        } else {
            const newDisc = await addDiscipline(discName.trim(), discDesc.trim() || undefined, semId, prof, "", "ead")
            await updateDiscipline(newDisc.id, { applicationMonth: month, applicationYear: year })
        }
        setDiscModal(false); load()
    }

    // ── Unlink = remove from semester, send back to pool ──────────────────────
    async function handleUnlinkDisc(id: string) {
        await updateDiscipline(id, { semesterId: null })
        setUnlinkDiscId(null); load()
    }

    // ── Permanent delete (from pool only) ─────────────────────────────────────
    async function handleDeleteDisc(id: string) {
        await deleteDiscipline(id); setDeleteDiscId(null); load()
    }

    async function handleMoveDisc(disc: Discipline, direction: 'up' | 'down', semDiscs: Discipline[]) {
        const idx = semDiscs.findIndex(d => d.id === disc.id)
        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === semDiscs.length - 1) return

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1
        const otherDisc = semDiscs[targetIdx]

        // Swap order
        const currentOrder = disc.order
        const targetOrder = otherDisc.order

        // Se ambos forem 0, precisamos inicializar ordens baseadas no index atual
        if (currentOrder === targetOrder) {
            // Inicializar ordens para todos neste semestre para garantir consistência
            await Promise.all(semDiscs.map((d, i) => {
                let newOrder = i * 10
                if (i === idx) newOrder = targetIdx * 10
                if (i === targetIdx) newOrder = idx * 10
                return updateDiscipline(d.id, { order: newOrder })
            }))
        } else {
            await updateDiscipline(disc.id, { order: targetOrder })
            await updateDiscipline(otherDisc.id, { order: currentOrder })
        }

        load()
    }

    async function toggleConcludeDisc(disc: Discipline) {
        await updateDiscipline(disc.id, { isConcluded: !disc.isConcluded })
        load()
    }

    async function toggleConcludeSem(sem: Semester) {
        await updateSemester(sem.id, { isConcluded: !sem.isConcluded })
        load()
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">

            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Grade Curricular</h2>
                    <p className="text-sm text-muted-foreground">
                        Organize por semestre e dia da semana — a mesma disciplina pode aparecer em dias diferentes
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => printCurriculumPDF(semesters, disciplines)} className="border-primary text-primary hover:bg-primary/10">
                        <Download className="h-4 w-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" onClick={() => {
                        setEditingSem(null); setSemName(""); setSemOrder(String(semesters.length + 1)); setSelectedPoolDiscs(new Set()); setSemModal(true)
                    }}>
                        <CalendarDays className="h-4 w-4 mr-2" /> Novo Semestre
                    </Button>
                    <Button onClick={() => openNewDisc()}>
                        <BookOpen className="h-4 w-4 mr-2" /> Nova Disciplina
                    </Button>
                </div>
            </div>

            {/* Semester cards */}
            <div className="flex flex-col gap-6">
                {semesters.length === 0 && (
                    <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
                        <CalendarDays className="h-10 w-10 mx-auto opacity-30 mb-3" />
                        <p className="text-sm">Nenhum semestre criado ainda.</p>
                        <Button size="sm" variant="outline" className="mt-4" onClick={() => { setEditingSem(null); setSemName(""); setSemOrder("1"); setSemModal(true) }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar primeiro semestre
                        </Button>
                    </div>
                )}

                {semesters.map(sem => {
                    const semDiscs = disciplines.filter(d => d.semesterId === sem.id)

                    return (
                        <div key={sem.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                            {/* Semester header */}
                            <div className="bg-primary/5 px-5 py-4 border-b border-border flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground">{sem.name}</h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className="text-xs text-muted-foreground">Ordem {sem.order}</span>
                                            <span className="text-xs text-muted-foreground">· {semDiscs.length} disciplina{semDiscs.length !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className={cn(
                                            "h-8 px-2 text-xs gap-1",
                                            sem.isConcluded ? "text-green-600 bg-green-50" : "text-primary hover:bg-primary/5"
                                        )}
                                        onClick={() => toggleConcludeSem(sem)}
                                    >
                                        <CheckCircle2 className={cn("h-3.5 w-3.5", sem.isConcluded ? "fill-green-600 text-white" : "")} />
                                        {sem.isConcluded ? "Concluído" : "Concluir"}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-primary gap-1" onClick={() => openNewDisc(sem.id)}>
                                        <Plus className="h-3.5 w-3.5" /> Disciplina
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingSem(sem); setSemName(sem.name); setSemOrder(String(sem.order)); setSelectedPoolDiscs(new Set()); setSemModal(true) }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {isMaster && (
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeleteSemIdConfirm(sem.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Disciplines block */}
                            <div className="divide-y divide-border">
                                {semDiscs.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <BookOpen className="h-8 w-8 mx-auto opacity-20 mb-3" />
                                        <p className="text-sm text-muted-foreground italic">Nenhuma disciplina neste semestre.</p>
                                        <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs" onClick={() => openNewDisc(sem.id)}>
                                            <Plus className="h-3 w-3" /> Adicionar disciplina
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {semDiscs.map(disc => (
                                            <div key={disc.id} className="group relative border border-border rounded-xl px-4 py-3 bg-background hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <button
                                                            className={cn(
                                                                "h-6 w-6 rounded flex items-center justify-center border transition-colors",
                                                                disc.isConcluded
                                                                    ? "bg-green-100 border-green-200 text-green-700"
                                                                    : "bg-card border-border hover:bg-muted text-muted-foreground"
                                                            )}
                                                            onClick={(e) => { e.stopPropagation(); toggleConcludeDisc(disc) }}
                                                            title={disc.isConcluded ? "Marcar como não concluída" : "Marcar como concluída"}
                                                        >
                                                            <CheckCircle2 className={cn("h-3 w-3", disc.isConcluded ? "fill-green-700 text-white" : "")} />
                                                        </button>
                                                        <button className="h-6 w-6 rounded flex items-center justify-center bg-card border border-border hover:bg-muted text-muted-foreground" onClick={() => openEditDisc(disc)} title="Editar">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        {isMaster && (
                                                            <>
                                                                <button
                                                                    className="h-6 w-6 rounded flex items-center justify-center bg-card border border-border hover:bg-muted text-muted-foreground"
                                                                    onClick={() => handleMoveDisc(disc, 'up', semDiscs)}
                                                                    title="Mover para cima"
                                                                >
                                                                    <ChevronUp className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    className="h-6 w-6 rounded flex items-center justify-center bg-card border border-border hover:bg-muted text-muted-foreground"
                                                                    onClick={() => handleMoveDisc(disc, 'down', semDiscs)}
                                                                    title="Mover para baixo"
                                                                >
                                                                    <ChevronDown className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    className="h-6 w-6 rounded flex items-center justify-center bg-card border border-amber-300 hover:bg-amber-50 text-amber-600"
                                                                    onClick={() => setUnlinkDiscId(disc.id)}
                                                                    title="Remover do semestre"
                                                                >
                                                                    <LogOut className="h-3 w-3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <h4 className="font-semibold text-sm pr-14 leading-snug flex items-center gap-2">
                                                        {disc.name}
                                                        {disc.isConcluded && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 fill-green-600/10" />}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {disc.professorName && <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Prof. {disc.professorName}</p>}
                                                        {disc.applicationMonth && (
                                                            <p className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 rounded">
                                                                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(disc.applicationMonth) - 1]}/{disc.applicationYear}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {disc.description && <div className="mt-3 pt-3 border-t border-border/50">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Carga Horária / Info</span>
                                                    <p className="text-xs text-muted-foreground line-clamp-2" title={disc.description}>{disc.description}</p>
                                                </div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Pool: unlinked disciplines */}
                {poolDiscs.length > 0 && (
                    <div className="bg-card border border-amber-200 rounded-2xl overflow-hidden">
                        <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="h-4 w-4" />
                                <h3 className="font-semibold text-sm">Disciplinas Disponíveis (não vinculadas)</h3>
                                <span className="text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-bold">{poolDiscs.length}</span>
                            </div>
                            <p className="text-xs text-amber-600 hidden sm:block">Clique em "↗" para alocar · 🗑️ para excluir permanentemente</p>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-amber-50/30">
                            {poolDiscs.map(disc => (
                                <div key={disc.id} className="group relative border border-amber-200/80 bg-white rounded-xl px-4 py-3 hover:border-amber-400 transition-colors">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                        {/* Allocate: open modal pre-filled */}
                                        <button
                                            className="h-6 w-6 rounded flex items-center justify-center border border-primary/30 hover:bg-primary/10 text-primary"
                                            onClick={() => { pickPoolDisc(disc); setDiscSemId(semesters[0]?.id || ""); setDiscModal(true) }}
                                            title="Alocar em semestre"
                                        >
                                            <ArrowRightCircle className="h-3 w-3" />
                                        </button>
                                        {/* Permanent delete */}
                                        {isMaster && (
                                            <button
                                                className="h-6 w-6 rounded flex items-center justify-center border border-destructive/30 hover:bg-destructive/10 text-destructive"
                                                onClick={() => setDeleteDiscId(disc.id)}
                                                title="Excluir permanentemente"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-sm pr-14">{disc.name}</h4>
                                    {disc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{disc.description}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Semester Modal ────────────────────────────────────────────────────── */}
            <Dialog open={semModal} onOpenChange={setSemModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editingSem ? "Editar Semestre" : "Novo Semestre"}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Nome do Semestre *</Label>
                            <Input value={semName} onChange={e => setSemName(e.target.value)} placeholder="Ex: 1º Semestre — 2026" autoFocus onKeyDown={e => e.key === "Enter" && handleSaveSem()} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Ordem de exibição *</Label>
                            <Input type="number" min={1} value={semOrder} onChange={e => setSemOrder(e.target.value)} placeholder="Ex: 1" />
                        </div>

                        {poolDiscs.length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                                <Label className="text-primary font-bold">Vincular Disciplinas do Banco ({poolDiscs.length} disponíveis)</Label>
                                <div className="border border-border rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/20">
                                    {poolDiscs.map(d => (
                                        <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-background rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedPoolDiscs.has(d.id)}
                                                onChange={() => {
                                                    setSelectedPoolDiscs(prev => {
                                                        const next = new Set(prev)
                                                        next.has(d.id) ? next.delete(d.id) : next.add(d.id)
                                                        return next
                                                    })
                                                }}
                                            />
                                            <span className="text-sm font-medium">{d.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-1">Selecione as disciplinas que deseja alocar neste semestre</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSemModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSem}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Discipline Modal ──────────────────────────────────────────────────── */}
            <Dialog open={discModal} onOpenChange={open => { if (!open) setDiscModal(false) }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingDisc ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">

                        {/* ── Pool search (only when adding new) ────────────────────── */}
                        {!editingDisc && (
                            <div className="flex flex-col gap-2">
                                <Label>Buscar disciplina disponível</Label>
                                {selectedPoolDisc ? (
                                    /* Selected pill */
                                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                                        <ArrowRightCircle className="h-4 w-4 text-primary shrink-0" />
                                        <span className="text-sm font-semibold flex-1">{selectedPoolDisc.name}</span>
                                        <button onClick={clearPickedDisc} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                className="pl-9"
                                                placeholder="Pesquisar disciplinas disponíveis..."
                                                value={discSearch}
                                                onChange={e => setDiscSearch(e.target.value)}
                                            />
                                        </div>
                                        {/* Dropdown results */}
                                        {poolDiscs.length === 0 ? (
                                            <p className="text-xs text-muted-foreground px-1">Nenhuma disciplina disponível no banco — preencha abaixo para criar nova.</p>
                                        ) : filteredPool.length > 0 ? (
                                            <div className="border border-border rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                                                {filteredPool.map(d => (
                                                    <button key={d.id} type="button"
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b last:border-0 border-border"
                                                        onClick={() => pickPoolDisc(d)}
                                                    >
                                                        <ArrowRightCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span className="font-medium">{d.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : discSearch ? (
                                            <p className="text-xs text-muted-foreground px-1">Nenhuma disciplina encontrada com "{discSearch}". Preencha abaixo para criar nova.</p>
                                        ) : null}

                                        {/* Separator */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-px bg-border" />
                                            <span className="text-xs text-muted-foreground">ou crie nova abaixo</span>
                                            <div className="flex-1 h-px bg-border" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Name + desc (shown only when NOT picked from pool) ──── */}
                        {!selectedPoolDisc && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Nome da Disciplina *</Label>
                                    <Input value={discName} onChange={e => setDiscName(e.target.value)} placeholder="Ex: Teologia Sistemática" autoFocus={!!editingDisc} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Carga Horária / Avaliações (opcional)</Label>
                                    <Textarea value={discDesc} onChange={e => setDiscDesc(e.target.value)} placeholder="Ex: Carga Horária de 40h. Necessário resumo do material." className="resize-none h-16" />
                                </div>
                            </>
                        )}

                        {/* ── Semester + Professor ──────────────────────────── */}
                        <div className="flex flex-col gap-1.5">
                            <Label>Semestre</Label>
                            <Select value={discSemId} onValueChange={setDiscSemId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o semestre" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem semestre</SelectItem>
                                    {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Professor / Docente</Label>
                            <Select value={discProfName} onValueChange={setDiscProfName}>
                                <SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem professor atribuído</SelectItem>
                                    <SelectItem value={MASTER_CREDENTIALS.name}>{MASTER_CREDENTIALS.name}</SelectItem>
                                    {professors.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month / Year selection */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className="flex flex-col gap-1.5">
                                <Label>Mês de Aplicação</Label>
                                <Select value={discMonth} onValueChange={setDiscMonth}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Não definido</SelectItem>
                                        <SelectItem value="01">Janeiro</SelectItem>
                                        <SelectItem value="02">Fevereiro</SelectItem>
                                        <SelectItem value="03">Março</SelectItem>
                                        <SelectItem value="04">Abril</SelectItem>
                                        <SelectItem value="05">Maio</SelectItem>
                                        <SelectItem value="06">Junho</SelectItem>
                                        <SelectItem value="07">Julho</SelectItem>
                                        <SelectItem value="08">Agosto</SelectItem>
                                        <SelectItem value="09">Setembro</SelectItem>
                                        <SelectItem value="10">Outubro</SelectItem>
                                        <SelectItem value="11">Novembro</SelectItem>
                                        <SelectItem value="12">Dezembro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Ano de Aplicação</Label>
                                <Select value={discYear} onValueChange={setDiscYear}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o ano" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2026">2026</SelectItem>
                                        <SelectItem value="2027">2027</SelectItem>
                                        <SelectItem value="2028">2028</SelectItem>
                                        <SelectItem value="2029">2029</SelectItem>
                                        <SelectItem value="2030">2030</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveDisc} disabled={!selectedPoolDisc && !discName.trim()}>
                            {selectedPoolDisc ? "Alocar Disciplina" : editingDisc ? "Salvar Alterações" : "Criar e Alocar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Unlink confirm ──────────────────────────────────────────────────── */}
            <AlertDialog open={!!unlinkDiscId} onOpenChange={o => !o && setUnlinkDiscId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover do Semestre</AlertDialogTitle>
                        <AlertDialogDescription>
                            A disciplina será <strong>removida deste semestre</strong> e voltará para o banco de disciplinas disponíveis. Ela não será excluída do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={() => handleUnlinkDisc(unlinkDiscId!)}>Remover do Semestre</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Permanent delete confirm ────────────────────────────────────────── */}
            <AlertDialog open={!!deleteDiscId} onOpenChange={o => !o && setDeleteDiscId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Disciplina Permanentemente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é <strong>irreversível</strong>. A disciplina e todas as provas/questões vinculadas serão excluídas do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteDisc(deleteDiscId!)}>Excluir Permanentemente</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Semester delete confirm ─────────────────────────────────────────── */}
            <AlertDialog open={!!deleteSemIdConfirm} onOpenChange={o => !o && setDeleteSemIdConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Semestre</AlertDialogTitle>
                        <AlertDialogDescription>Não é possível excluir semestres com disciplinas vinculadas. Remova-as antes.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteSem(deleteSemIdConfirm!)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
