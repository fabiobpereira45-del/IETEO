"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import {
    Send, Bot, User, Loader2, Paperclip, X, FileText, ImageIcon,
    Check, Sparkles, AlertCircle, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    type Discipline,
} from "@/lib/store"

interface Props {
    selectedDiscipline?: Discipline
}

export function AIAssistantChat({ selectedDiscipline }: Props) {
    const [file, setFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // O useChat do v6.x tem uma API diferente. 
    // Como a configuração de 'api' via options está dando erro de tipo, 
    // e renomeamos a rota para o padrão /api/chat, removemos essas opções.
    const { messages, sendMessage, status, error, setMessages } = useChat({
        experimental_throttle: 50,
        initialMessages: [
            {
                id: "welcome",
                role: "assistant",
                content: `Olá! Sou o seu Assistente Teológico IA. ${selectedDiscipline ? ` Estou pronto para ajudar com a disciplina de **${selectedDiscipline.name}**.` : ""} Como posso ajudar você hoje? Você pode enviar materiais (PDF, Fotos, TXT) para que eu analise.`
            }
        ]
    } as any)

    const isLoading = status === ("submitted" as any)

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    function scrollToBottom() {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0] || null
        setFile(selectedFile)

        if (selectedFile?.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onloadend = () => setFilePreview(reader.result as string)
            reader.readAsDataURL(selectedFile)
        } else {
            setFilePreview(null)
        }
    }

    function removeFile() {
        setFile(null)
        setFilePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setInput(e.target.value)
    }

    async function onChatSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!input.trim() && !file) return

        const messageText = input.trim()
        setInput("")

        // Se houver arquivo, no v6 o tratamento de anexos pode ser feito via metadados ou multipart
        // Para simplificar, continuaremos usando a rota customizada se necessário, 
        // mas aqui chamamos sendMessage que por padrão usa POST na rota /api/chat ou configurada.
        // Nota: O useChat do v6 costuma esperar /api/chat por padrão se não mudar no provider.
        // Mas podemos passar o 'message' diretamente.

        if (file) {
            const formData = new FormData()
            formData.append("messages", JSON.stringify([...messages, { role: "user", content: messageText }]))
            formData.append("file", file)

            removeFile()
            sendMessage({ role: "user", content: messageText, experimental_formData: formData } as any)
            return
        }

        sendMessage({ role: "user", content: messageText } as any)
    }

    return (
        <div className="flex flex-col h-[600px] bg-background border border-border rounded-2xl overflow-hidden premium-shadow">
            {/* Header */}
            <div className="bg-primary/5 border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Chat Assistente Teológico</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Gemini 1.5 Pro</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-6">
                <div className="flex flex-col gap-6">
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={`flex items-start gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border ${m.role === "user"
                                ? "bg-accent-gradient text-white border-orange/20"
                                : "bg-white text-primary border-border"
                                }`}>
                                {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                            </div>
                            <div className={`flex flex-col gap-1.5 max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user"
                                    ? "bg-muted text-foreground rounded-tr-none"
                                    : "bg-white border border-border text-foreground rounded-tl-none premium-shadow"
                                    }`}>
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                    {m.role === "user" ? "Você" : "Assistente IETEO"}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-white border border-border flex items-center justify-center text-primary animate-pulse">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div className="bg-white border border-border premium-shadow rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce shadow-sm"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s] shadow-sm"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s] shadow-sm"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-xs p-4 rounded-xl border border-destructive/20 flex items-center gap-2 mx-4">
                            <AlertCircle className="h-4 w-4" />
                            <span>Erro: {error.message}</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-muted/30 border-t border-border mt-auto">
                <form onSubmit={onChatSubmit} className="flex flex-col gap-3">
                    {file && (
                        <div className="flex items-center gap-3 bg-white border border-border p-2 rounded-xl animate-in slide-in-from-bottom-2">
                            <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
                                {filePreview ? (
                                    <img src={filePreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                    <FileText className="h-5 w-5 text-primary" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.txt,.jpg,.jpeg,.png"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl flex-shrink-0 border-border"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className="h-5 w-5" />
                        </Button>

                        <div className="relative flex-1">
                            <Input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Questione a IA..."
                                className="h-11 rounded-xl pr-12 bg-white"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isLoading || (!input.trim() && !file)}
                                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg accent-gradient shadow-md"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
