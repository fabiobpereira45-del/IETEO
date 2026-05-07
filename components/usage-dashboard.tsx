"use client"

import { useEffect, useState } from "react"
import { getUserLogs, type UserLog } from "@/lib/store"
import { 
  Activity, Users, Clock, Monitor, Search, Filter, 
  ChevronLeft, ChevronRight, Loader2, Calendar, Layout,
  Eye, MousePointer2, LogIn, Heart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function UsageDashboard() {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const data = await getUserLogs(200)
      setLogs(data)
    } catch (err) {
      console.error("Erro ao carregar logs:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.metadata?.path?.toLowerCase().includes(search.toLowerCase())
  )

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <LogIn className="h-4 w-4 text-green-500" />
      case 'page_visit': return <Eye className="h-4 w-4 text-blue-500" />
      case 'heartbeat': return <Heart className="h-4 w-4 text-rose-500" />
      default: return <MousePointer2 className="h-4 w-4 text-slate-500" />
    }
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'master': return <Badge className="bg-purple-500">Master</Badge>
      case 'professor': return <Badge className="bg-blue-500">Professor</Badge>
      case 'student': return <Badge className="bg-orange">Aluno</Badge>
      default: return <Badge variant="outline">Visitante</Badge>
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "-"
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight premium-text-gradient">Logs de Uso</h2>
          <p className="text-muted-foreground">Monitore acessos, visitas e tempo de uso da plataforma.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="h-4 w-4 mr-2" /> Usuários Ativos (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.filter(l => l.created_at?.startsWith(new Date().toISOString().split('T')[0])).map(l => l.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Layout className="h-4 w-4 mr-2" /> Visitas de Página
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'page_visit').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-2" /> Sessões Monitoradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.filter(l => l.action === 'login' || l.action === 'heartbeat').map(l => l.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Monitor className="h-4 w-4 mr-2" /> Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Atividade</CardTitle>
              <CardDescription>Últimos 200 eventos registrados no sistema</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuário, ação ou caminho..." 
                className="pl-9 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="p-4 font-semibold text-muted-foreground">Data/Hora</th>
                  <th className="p-4 font-semibold text-muted-foreground">Usuário</th>
                  <th className="p-4 font-semibold text-muted-foreground">Ação</th>
                  <th className="p-4 font-semibold text-muted-foreground">Caminho / Menu</th>
                  <th className="p-4 font-semibold text-muted-foreground">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/10 animate-pulse">
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      Nenhum log encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors group">
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-xs font-mono opacity-70 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 opacity-50" />
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{log.user_name || "Visitante"}</span>
                          <span className="text-[10px] opacity-60">{log.user_email || "Anônimo"}</span>
                          <div className="mt-1">{getRoleBadge(log.role)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="capitalize font-medium">
                            {log.action === 'page_visit' ? 'Visita' : 
                             log.action === 'heartbeat' ? 'Em uso' : 
                             log.action === 'login' ? 'Acesso' : log.action}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] bg-muted px-2 py-1 rounded max-w-[200px] truncate" title={log.metadata?.path}>
                            {log.metadata?.path || "/"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] opacity-60 truncate block max-w-[150px]" title={log.metadata?.userAgent}>
                          {log.metadata?.userAgent?.split(')')[0].replace('Mozilla/5.0 (', '') || "Browser"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
