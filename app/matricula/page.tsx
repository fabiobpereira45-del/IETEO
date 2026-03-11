import { redirect } from "next/navigation"

// Redirect /matricula to /registrar for easier sharing
export default function MatriculaPage() {
    redirect("/registrar")
}
