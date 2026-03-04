"use client"

import { useEffect, useState, useRef } from "react"
import {
    FileText, UploadCloud, Trash2, Library, BookOpen, AlertCircle, Loader2, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
    type StudyMaterial, type Discipline,
    getStudyMaterials, addStudyMaterial, deleteStudyMaterial, getDisciplines
} from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
    })
}

export function StudyMaterialManager() {
    const [materials, setMaterials] = useState<StudyMaterial[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDiscId, setSelectedDiscId] = useState<string>("all")
    const [loading, setLoading] = useState(true)

    // Upload Modal
    const [uploadModal, setUploadModal] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [fileDiscId, setFileDiscId] = useState<string>("")
    const [file, setFile] = useState<File | null>(null)

    const [deleteId, setDeleteId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const supabase = createClient()

    async function load() {
        setLoading(true)
        const [m, d] = await Promise.all([getStudyMaterials(), getDisciplines()])
        setMaterials(m)
        setDisciplines(d)
        if (d.length > 0 && !fileDiscId) setFileDiscId(d[0].id)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleUpload() {
        if (!file || !title.trim() || !fileDiscId) {
            alert("Preencha todos os campos obrigatórios e selecione um arquivo.")
            return
        }

        setUploading(true)
        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
            const filePath = `disciplines/${fileDiscId}/${fileName}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('materials')
                .upload(filePath, file, { cacheControl: '3600', upsert: false })

            if (uploadError) throw new Error(uploadError.message)

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('materials')
                .getPublicUrl(filePath)

            // 3. Save to Database
            await addStudyMaterial({
                disciplineId: fileDiscId,
                title: title.trim(),
                description: description.trim() || undefined,
                fileUrl: publicUrl
            })

            setUploadModal(false)
            load()
        } catch (err: any) {
            alert("Erro no upload: " + err.message)
        } finally {
            setUploading(false)
            setFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    async function handleDelete() {
        if (!deleteId) return
        try {
            // Optionally delete from storage as well, but for simplicity we only delete from DB here.
            // E.g. const mat = materials.find(m => m.id === deleteId); 
            // if (mat) { const path = mat.fileUrl.split('/materials/')[1]; supabase.storage.from('materials').remove([path]) }

            await deleteStudyMaterial(deleteId)
            setDeleteId(null)
            load()
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message)
        }
    }

    const filteredMaterials = selectedDiscId === "all"
        ? materials
        : materials.filter(m => m.disciplineId === selectedDiscId)

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Biblioteca de Materiais</h2>
                    <p className="text-sm text-muted-foreground">Faça upload de PDFs e apostilas para os alunos</p>
                </div>
                <div className="flex gap-3">
                    <Select value={selectedDiscId} onValueChange={setSelectedDiscId}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Filtrar disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Disciplinas</SelectItem>
                            {disciplines.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => {
                        setTitle("")
                        setDescription("")
                        setFile(null)
                        if (disciplines.length > 0) setFileDiscId(disciplines[0].id)
                        setUploadModal(true)
                    }}>
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Upload de Material
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10 opacity-50"><Loader2 className="animate-spin h-6 w-6" /></div>
            ) : filteredMaterials.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center flex flex-col items-center">
                    <Library className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum material encontrado.</p>
                    {selectedDiscId !== "all" && <p className="text-xs text-muted-foreground mt-1">Tente selecionar outra disciplina ou adicione um novo material.</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMaterials.map(mat => {
                        const disc = disciplines.find(d => d.id === mat.disciplineId)
                        return (
                            <div key={mat.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col group hover:border-primary/30 transition-colors">
                                <div className="p-4 flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-semibold text-foreground line-clamp-2" title={mat.title}>{mat.title}</h3>
                                        <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2 bg-primary/10 w-fit px-2 py-0.5 rounded">
                                        <BookOpen className="h-3 w-3" />
                                        <span className="truncate max-w-[150px]" title={disc?.name}>{disc?.name || "Disciplina Removida"}</span>
                                    </div>
                                    {mat.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{mat.description}</p>}
                                </div>
                                <div className="bg-muted/50 px-4 py-3 border-t border-border flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-medium">{formatDate(mat.createdAt)}</span>
                                    <div className="flex gap-1.5">
                                        <Button size="sm" variant="outline" className="h-8 text-xs bg-background" asChild>
                                            <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-3 w-3 mr-1.5" /> Baixar
                                            </a>
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(mat.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Upload Dialog */}
            <Dialog open={uploadModal} onOpenChange={(o) => !uploading && setUploadModal(o)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Material de Estudo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Disciplina *</Label>
                            <Select value={fileDiscId} onValueChange={setFileDiscId} disabled={uploading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a disciplina" />
                                </SelectTrigger>
                                <SelectContent>
                                    {disciplines.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Título do Material *</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Apostila de Gênesis" disabled={uploading} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" disabled={uploading} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Arquivo PDF *</Label>
                            <Input
                                type="file"
                                accept=".pdf,application/pdf"
                                ref={fileInputRef}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                                className="cursor-pointer file:text-primary file:font-semibold file:bg-primary/10 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full hover:file:bg-primary/20"
                            />
                            <span className="text-xs text-muted-foreground mt-1">Limite recomendado: 50MB</span>
                        </div>

                        {uploading && (
                            <div className="flex items-center gap-2 text-sm text-primary font-medium mt-2 p-3 bg-primary/10 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin" /> Fazendo upload para a nuvem, aguarde...
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadModal(false)} disabled={uploading}>Cancelar</Button>
                        <Button onClick={handleUpload} disabled={uploading || !file || !title.trim() || !fileDiscId}>
                            {uploading ? "Salvando..." : "Fazer Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Material</AlertDialogTitle>
                        <AlertDialogDescription>Deseja confirmar a exclusão deste arquivo? Os alunos não poderão mais acessá-lo.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
