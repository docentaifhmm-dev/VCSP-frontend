import { useEffect, useState } from "react";
import { MessageSquare, Plus, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Card, Button, Badge } from "../components/ui";

const STATUS_VARIANT = {
  rascunho: "warning",
  publicado: "success",
  arquivado: "default",
};

export default function DashboardPage({ onNovoClienteVirtual }) {
  const { user, logout } = useAuth();
  const [cenarios, setCenarios] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.listarCenariosVirtuais()
      .then((data) => setCenarios(data || []))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <MessageSquare size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">VCSP</p>
            <p className="text-slate-500 text-xs">{user?.nome}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400">
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-white">Meus Clientes Virtuais</h1>
          <Button onClick={onNovoClienteVirtual}><Plus size={16} /> Novo Cliente Virtual</Button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="text-amber-400 animate-spin" /></div>
        ) : cenarios.length === 0 ? (
          <Card className="text-center py-12">
            <MessageSquare size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Você ainda não criou nenhum Cliente Virtual.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {cenarios.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{c.titulo}</p>
                  <p className="text-slate-500 text-xs mt-1">{c.area}</p>
                </div>
                <Badge variant={STATUS_VARIANT[c.status] || "default"}>{c.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
