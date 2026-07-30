import { useEffect, useState } from "react";
import { MessageSquare, Plus, LogOut, Loader2, ChevronLeft, Link2, Copy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Card, Button, Badge } from "../components/ui";

const STATUS_VARIANT = {
  rascunho: "warning",
  publicado: "success",
  arquivado: "default",
};

export default function DashboardPage({ onNovoClienteVirtual, onAbrirCenario, onVoltar }) {
  const { user, logout } = useAuth();
  const [cenarios, setCenarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [linksExpandido, setLinksExpandido] = useState(null); // cenario id | null
  const [linksPorCenario, setLinksPorCenario] = useState({}); // cenario_id -> turmas publicadas
  const [carregandoLinks, setCarregandoLinks] = useState(false);

  useEffect(() => {
    api.listarCenariosVirtuais()
      .then((data) => setCenarios(data || []))
      .finally(() => setCarregando(false));
  }, []);

  const toggleLinks = async (e, cenarioId) => {
    e.stopPropagation();
    if (linksExpandido === cenarioId) { setLinksExpandido(null); return; }
    setLinksExpandido(cenarioId);
    if (linksPorCenario[cenarioId]) return; // já carregado
    setCarregandoLinks(true);
    try {
      const turmas = await api.listarTurmasPublicadasCenario(cenarioId);
      setLinksPorCenario((m) => ({ ...m, [cenarioId]: turmas || [] }));
    } catch {
      setLinksPorCenario((m) => ({ ...m, [cenarioId]: [] }));
    } finally {
      setCarregandoLinks(false);
    }
  };

  const copiarLink = (e, link) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(link);
  };

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
        <div className="flex items-center gap-4">
          {onVoltar && (
            <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400">
              <ChevronLeft size={16} /> Painel
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400">
            <LogOut size={16} /> Sair
          </button>
        </div>
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
              <Card key={c.id} className="space-y-0">
                <div onClick={() => onAbrirCenario(c.id)} className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-white font-semibold text-sm">{c.titulo}</p>
                    <p className="text-slate-500 text-xs mt-1">{c.area}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[c.status] || "default"}>{c.status}</Badge>
                    {c.status === "publicado" && (
                      <button onClick={(e) => toggleLinks(e, c.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400">
                        <Link2 size={13} /> Link
                      </button>
                    )}
                  </div>
                </div>

                {linksExpandido === c.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700/40 space-y-2">
                    {carregandoLinks && !linksPorCenario[c.id] ? (
                      <Loader2 size={16} className="text-amber-400 animate-spin" />
                    ) : (linksPorCenario[c.id] || []).length === 0 ? (
                      <p className="text-slate-600 text-xs">Ainda não publicado em nenhuma turma.</p>
                    ) : (
                      (linksPorCenario[c.id] || []).map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-slate-300 text-xs font-medium truncate">{t.nome}</p>
                            <p className="text-amber-300/80 text-xs truncate">{t.link_acesso}</p>
                          </div>
                          <button onClick={(e) => copiarLink(e, t.link_acesso)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 flex-shrink-0">
                            <Copy size={12} /> Copiar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
