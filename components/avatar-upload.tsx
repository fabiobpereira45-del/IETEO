"use client"

import { useState, useRef } from "react"
import { Camera, Loader2, User, X } from "lucide-react"
import { uploadAvatar, updateProfileAvatar } from "@/lib/store"
import { toast } from "sonner"

interface AvatarUploadProps {
  currentUrl?: string | null
  userId: string
  userName: string
  type: 'student' | 'professor' | 'board'
  onUploadSuccess: (newUrl: string) => void
}

export function AvatarUpload({ currentUrl, userId, userName, type, onUploadSuccess }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida.")
      return
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.")
      return
    }

    try {
      setUploading(true)
      
      const folder = type === 'student' ? 'students' : type === 'professor' ? 'professors' : 'board'
      const publicUrl = await uploadAvatar(file, userId, folder)
      
      await updateProfileAvatar(userId, publicUrl, type)
      
      onUploadSuccess(publicUrl)
      toast.success("Foto de perfil atualizada!")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error("Erro ao fazer upload: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Deseja realmente remover sua foto de perfil?")) return
    
    try {
      setUploading(true)
      await updateProfileAvatar(userId, "", type)
      onUploadSuccess("")
      toast.success("Foto removida com sucesso!")
    } catch (error: any) {
      toast.error("Erro ao remover foto: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative group">
      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-background shadow-xl bg-muted flex items-center justify-center relative">
        {currentUrl ? (
          <img src={currentUrl} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl md:text-3xl font-bold text-muted-foreground">{initials}</span>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {currentUrl && !uploading && (
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all z-30"
          title="Remover foto"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 p-2 bg-accent text-accent-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all z-20"
        title="Alterar foto"
      >
        <Camera className="h-4 w-4 md:h-5 md:w-5" />
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  )
}
