"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AvatarUpload } from "@/components/avatar-upload"
import { createClient } from "@/lib/supabase/client"
import type { StudentProfile } from "@/lib/store"

interface ProfileTabProps {
    profile: StudentProfile
    onUpdateSuccess: () => Promise<void>
}

export function ProfileTab({ profile, onUpdateSuccess }: ProfileTabProps) {
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [editName, setEditName] = useState(profile.name || "")
    const [editBio, setEditBio] = useState(profile.bio || "")
    const [showPwd, setShowPwd] = useState(false)
    const [pwdLoading, setPwdLoading] = useState(false)
    const [pwdMsg, setPwdMsg] = useState("")
    const [pwdErr, setPwdErr] = useState("")
    const supabase = createClient()

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        setPwdErr("")
        setPwdMsg("")
        
        if (!editName.trim()) { setPwdErr("O nome não pode ficar vazio."); return }
        if (newPassword && newPassword.length < 6) { setPwdErr("A nova senha deve ter no mínimo 6 caracteres."); return }
        if (newPassword && newPassword !== confirmPassword) { setPwdErr("As senhas não coincidem."); return }
        
        setPwdLoading(true)
        try {
            // Update Auth (Name + Password)
            const authUpdates: any = { data: { full_name: editName.trim() } }
            if (newPassword) authUpdates.password = newPassword
            
            const { error: authError } = await supabase.auth.updateUser(authUpdates)
            if (authError) throw authError

            // Update Database Profile
            const { error: dbError } = await supabase.from('students').update({
                name: editName.trim(),
                bio: editBio.trim()
            }).eq('id', profile.id)
            
            if (dbError) throw dbError

            setPwdMsg("Perfil atualizado com sucesso!")
            setNewPassword("")
            setConfirmPassword("")
            onUpdateSuccess() // Refresh profile data
        } catch (err: any) {
            setPwdErr(err.message || "Erro ao atualizar o perfil.")
        } finally {
            setPwdLoading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white border border-border/50 rounded-3xl p-10 shadow-xl shadow-black/5">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <AvatarUpload 
                            currentUrl={profile.avatar_url}
                            userId={profile.id}
                            userName={profile.name}
                            type="student"
                            onUploadSuccess={onUpdateSuccess}
                        />
                        <p className="text-xs text-muted-foreground">Clique na câmera para alterar sua foto</p>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">Meu Perfil</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">Mantenha seus dados atualizados.</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Nome Completo</label>
                        <input
                            type="text"
                            className="w-full border border-border rounded-2xl px-5 py-4 text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-medium"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Mini Biografia (Bio)</label>
                        <textarea
                            className="w-full min-h-[100px] border border-border rounded-2xl px-5 py-4 text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-medium resize-y"
                            placeholder="Fale um pouco sobre você, sua igreja, seu ministério..."
                            value={editBio}
                            onChange={e => setEditBio(e.target.value)}
                        />
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Nova Senha (opcional)</label>
                                <div className="relative">
                                    <input
                                        type={showPwd ? "text" : "password"}
                                        className="w-full border border-border rounded-2xl px-5 py-3 text-sm bg-slate-50"
                                        placeholder="Min 6 caracteres"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Confirmar Senha</label>
                                <input
                                    type={showPwd ? "text" : "password"}
                                    className="w-full border border-border rounded-2xl px-5 py-3 text-sm bg-slate-50"
                                    placeholder="Repita a nova senha"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 italic">Deixe em branco se não quiser alterar sua senha.</p>
                    </div>

                    {pwdMsg && <p className="text-sm text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100 font-bold">{pwdMsg}</p>}
                    {pwdErr && <p className="text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 font-bold">{pwdErr}</p>}

                    <Button type="submit" disabled={pwdLoading} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-black/10 gap-2">
                        {pwdLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Salvar Alterações do Perfil
                    </Button>
                </form>
            </div>
        </div>
    )
}
