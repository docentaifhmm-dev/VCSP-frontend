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
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    if (typeof msg === "string") setToast({ message: msg, type: "success" });
    else setToast(msg);
  };

  return (
    <>
      {page === "dashboard" && <DashboardPage onNovoClienteVirtual={() => setPage("criar")} />}
      {page === "criar" && (
        <div className="min-h-screen bg-slate-950 p-8">
          <ClienteVirtualCriarPage setToast={showToast} />
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
