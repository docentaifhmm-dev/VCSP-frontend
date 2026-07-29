import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toast } from "./components/ui";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ClienteVirtualCriarPage from "./pages/ClienteVirtualCriarPage";
import ClienteVirtualAlunoApp from "./pages/ClienteVirtualAlunoApp";

// ── Rota pública do aluno — Cliente Virtual ─────────────────────────────────
// /cliente-virtual/acesso/{token}: acesso via link único, sem login de professor.
function isRutaClienteVirtualAluno() {
  return window.location.pathname.startsWith("/cliente-virtual/acesso");
}

function extrairTokenClienteVirtual() {
  const match = window.location.pathname.match(/^\/cliente-virtual\/acesso\/([^/]+)$/);
  return match ? match[1] : null;
}

function AppLayout() {
  const [page, setPage] = useState("dashboard"); // dashboard | criar
  const [cenarioAberto, setCenarioAberto] = useState(null); // id | null (null = novo cenário)
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    if (typeof msg === "string") setToast({ message: msg, type: "success" });
    else setToast(msg);
  };

  const abrirNovo = () => { setCenarioAberto(null); setPage("criar"); };
  const abrirExistente = (id) => { setCenarioAberto(id); setPage("criar"); };
  const voltarDashboard = () => { setCenarioAberto(null); setPage("dashboard"); };

  return (
    <>
      {page === "dashboard" && (
        <DashboardPage onNovoClienteVirtual={abrirNovo} onAbrirCenario={abrirExistente} />
      )}
      {page === "criar" && (
        <div className="min-h-screen bg-slate-950 p-8">
          <ClienteVirtualCriarPage
            key={cenarioAberto || "novo"}
            cenarioIdInicial={cenarioAberto}
            setToast={showToast}
            onVoltar={voltarDashboard}
          />
        </div>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (isRutaClienteVirtualAluno()) {
    return <ClienteVirtualAlunoApp tokenFromUrl={extrairTokenClienteVirtual()} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    );
  }

  return user ? <AppLayout /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
