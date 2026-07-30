import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toast } from "./components/ui";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import DisciplinasPage from "./pages/DisciplinasPage";
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
  const [page, setPage] = useState("home"); // home | disciplinas | dashboard | criar
  const [cenarioAberto, setCenarioAberto] = useState(null); // id | null (null = novo cenário)
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    if (typeof msg === "string") setToast({ message: msg, type: "success" });
    else setToast(msg);
  };

  const abrirNovo = () => { setCenarioAberto(null); setPage("criar"); };
  const abrirExistente = (id) => { setCenarioAberto(id); setPage("criar"); };
  const voltarHome = () => { setCenarioAberto(null); setPage("home"); };

  return (
    <>
      {page === "home" && (
        <HomePage
          onAcessarDisciplinas={() => setPage("disciplinas")}
          onNovoClienteVirtual={abrirNovo}
          onAcessarClientes={() => setPage("dashboard")}
        />
      )}
      {page === "disciplinas" && (
        <DisciplinasPage onVoltar={voltarHome} setToast={showToast} />
      )}
      {page === "dashboard" && (
        <DashboardPage onNovoClienteVirtual={abrirNovo} onAbrirCenario={abrirExistente} onVoltar={voltarHome} />
      )}
      {page === "criar" && (
        <div className="min-h-screen bg-slate-950 p-8">
          <ClienteVirtualCriarPage
            key={cenarioAberto || "novo"}
            cenarioIdInicial={cenarioAberto}
            setToast={showToast}
            onVoltar={voltarHome}
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
