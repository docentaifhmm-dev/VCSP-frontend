import { MessageSquare, GraduationCap, Plus, History, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui";

export default function HomePage({ onAcessarDisciplinas, onNovoClienteVirtual, onAcessarClientes }) {
  const { user, logout } = useAuth();

  const opcoes = [
    {
      titulo: "Cadastro do Docente",
      descricao: "Instituições, disciplinas, período letivo e plano de ensino.",
      icon: GraduationCap,
      onClick: onAcessarDisciplinas,
    },
    {
      titulo: "Novo Cliente Virtual",
      descricao: "Crie uma persona simulada para uma nova atividade.",
      icon: Plus,
      onClick: onNovoClienteVirtual,
    },
    {
      titulo: "Meus Clientes Virtuais",
      descricao: "Veja e gerencie os casos já criados e publicados.",
      icon: History,
      onClick: onAcessarClientes,
    },
  ];

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

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Painel</h1>
          <p className="text-slate-400 text-sm mt-1">O que você quer fazer?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {opcoes.map(({ titulo, descricao, icon: Icon, onClick }) => (
            <Card key={titulo} onClick={onClick} className="space-y-3">
              <div className="w-11 h-11 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <Icon size={22} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{titulo}</p>
                <p className="text-slate-500 text-xs mt-1">{descricao}</p>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
