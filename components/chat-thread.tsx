"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type ChatMessage, getChatMessages, sendChatMessage, markChatAsRead } from "@/lib/store"

interface ChatThreadProps {
    disciplineId: string
    studentId: string
    isStudentView: boolean
    professorName?: string
    studentName?: string
}

export function ChatThread({ disciplineId, studentId, isStudentView, professorName = "Professor", studentName = "Aluno" }: ChatThreadProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [newMessage, setNewMessage] = useState("")
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    async function loadMessages() {
        setLoading(true)
        const msgs = await getChatMessages(disciplineId, studentId)
        setMessages(msgs)

        // Mark unread messages as read
        const unread = msgs.filter(m => !m.read && (isStudentView ? !m.isFromStudent : m.isFromStudent))
        for (const msg of unread) {
            await markChatAsRead(msg.id)
        }

        setLoading(false)
        scrollToBottom()
    }

    useEffect(() => {
        loadMessages()
        // A more advanced app would use Supabase Realtime here.
        const interval = setInterval(loadMessages, 10000) // simple polling every 10s
        return () => clearInterval(interval)
    }, [disciplineId, studentId])

    function scrollToBottom() {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        try {
            const msg = await sendChatMessage(studentId, disciplineId, newMessage.trim(), isStudentView)
            setMessages(prev => [...prev, msg])
            setNewMessage("")
            scrollToBottom()
        } catch (err: any) {
            alert("Erro ao enviar mensagem: " + err.message)
        }
        setSending(false)
    }

    if (loading && messages.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="flex flex-col h-[500px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-sm">
                        {isStudentView ? `Chat com Prof. ${professorName}` : `Chat com aluno(a) ${studentName}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">Tire suas dúvidas ou comente sobre a disciplina.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm italic">
                        Nenhuma mensagem ainda. Envie a primeira mensagem!
                    </div>
                ) : (
                    messages.map(msg => {
                        // Determine if the message belongs to the current viewer
                        const isMine = isStudentView ? msg.isFromStudent : !msg.isFromStudent
                        return (
                            <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                <div className={`text-xs text-muted-foreground mb-1 px-1`}>
                                    {isMine ? 'Você' : (msg.isFromStudent ? studentName : professorName)}
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-sm ${isMine
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-muted text-foreground border border-border rounded-tl-sm'
                                    }`}>
                                    {msg.message}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMine && (
                                        <span className="ml-1 tracking-tighter">
                                            {msg.read ? <span className="text-primary">✓✓</span> : <span>✓</span>}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-background border-t border-border flex gap-2">
                <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 rounded-full bg-muted/50"
                    autoFocus
                />
                <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!newMessage.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </div>
    )
}
