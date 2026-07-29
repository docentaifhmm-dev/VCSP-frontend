import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Card, Button, Input } from "../components/ui";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState("login"); // login | registro
  const [form, setForm] = useState({ nome: "", email: "", password: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submeter = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      if (modo === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setErro(err.message || "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={26} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-black text-white">VCSP</h1>
          <p className="text-slate-400 text-sm mt-1">
            {modo === "login" ? "Entre na sua conta" : "Crie sua conta de professor"}
          </p>
        </div>

        <form onSubmit={submeter} className="space-y-4">
          {modo === "registro" && (
            <Input label="Nome completo" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome" required />
          )}
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@instituicao.edu.br" required />
          <Input label="Senha" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 8 caracteres" required />

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? <Loader2 size={16} className="animate-spin" /> : modo === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          onClick={() => { setModo(modo === "login" ? "registro" : "login"); setErro(""); }}
          className="w-full text-center text-sm text-slate-400 hover:text-amber-400"
        >
          {modo === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
