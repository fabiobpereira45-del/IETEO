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
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarUpload({ currentUrl, userId, userName, type, onUploadSuccess, size = 'lg' }: AvatarUploadProps) {
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

  const containerSizes = {
    sm: "w-12 h-12 rounded-full border-2 border-white/20 shadow-md",
    md: "w-16 h-16 rounded-full border-2 border-white/20 shadow-lg",
    lg: "w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-xl"
  }

  const textSizes = {
    sm: "text-sm font-bold",
    md: "text-lg font-bold",
    lg: "text-2xl md:text-3xl font-bold"
  }

  const cameraButtonSizes = {
    sm: "p-1 bottom-0 right-0",
    md: "p-1.5 bottom-0 right-0",
    lg: "p-2 bottom-0 right-0"
  }

  const cameraIconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4 md:h-5 md:w-5"
  }

  const removeButtonSizes = {
    sm: "p-0.5 -top-1 -right-1",
    md: "p-1 -top-1 -right-1",
    lg: "p-1.5 -top-2 -right-2"
  }

  const removeIconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3 w-3"
  }

  const loaderSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div className="relative group shrink-0">
      <div className={`${containerSizes[size]} overflow-hidden bg-muted flex items-center justify-center relative`}>
        {currentUrl ? (
          <img src={currentUrl} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <span className={`${textSizes[size]} text-muted-foreground`}>{initials}</span>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <Loader2 className={`${loaderSizes[size]} animate-spin text-white`} />
          </div>
        )}
      </div>

      {currentUrl && !uploading && (
        <button
          onClick={handleRemove}
          className={`absolute ${removeButtonSizes[size]} bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all z-30`}
          title="Remover foto"
        >
          <X className={removeIconSizes[size]} />
        </button>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`absolute ${cameraButtonSizes[size]} bg-accent text-accent-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all z-20`}
        title="Alterar foto"
      >
        <Camera className={cameraIconSizes[size]} />
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
