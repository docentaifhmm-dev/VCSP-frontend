/**
 * ClienteVirtualAlunoApp — mini-app independente para o aluno.
 *
 * Renderizado fora do AuthContext/AppLayout do professor (ver App.jsx —
 * isRutaClienteVirtualAluno()). O link é único por TURMA — a primeira coisa
 * que o app faz é identificar o aluno (nome + matrícula) para então trocar
 * isso por uma sessão JWT. Gerencia seu próprio ciclo de vida: identificação,
 * lista de cenários publicados, histórico de sessões anteriores e a conversa
 * ativa.
 */
import { useEffect, useState } from "react";
import { MessageSquare, History, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { apiAluno } from "../services/apiAluno";
import { Input, Button } from "../components/ui";
import ClienteVirtualChatPage from "./ClienteVirtualChatPage";

function cls(...args) { return args.filter(Boolean).join(" "); }

export default function ClienteVirtualAlunoApp({ tokenFromUrl }) {
  const [status, setStatus] = useState("carregando"); // carregando | identificar | erro | lista | chat
  const [erro, setErro] = useState("");
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [aba, setAba] = useState("cenarios"); // cenarios | historico
  const [cenarios, setCenarios] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [iniciandoId, setIniciandoId] = useState(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(null); // { sessao, cenarioTitulo }

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [identificando, setIdentificando] = useState(false);

  const turmaToken = tokenFromUrl;

  const carregarPainel = async () => {
    const [cenariosData, historicoData] = await Promise.all([apiAluno.listarCenarios(), apiAluno.listarHistorico()]);
    setCenarios(cenariosData || []);
    setHistorico(historicoData || []);
    setStatus("lista");
  };

  useEffect(() => {
    if (!turmaToken) {
      setErro("Link de acesso não encontrado. Peça ao professor o link da turma.");
      setStatus("erro");
      return;
    }

    const salva = apiAluno.getIdentidadeSalva(turmaToken);
    if (!salva) {
      setStatus("identificar");
      return;
    }

    apiAluno.entrarNaTurma(turmaToken, salva.nome, salva.matricula)
      .then((data) => { setAlunoInfo(data); return carregarPainel(); })
      .catch((e) => {
        setErro(e.message || "Não foi possível validar seu acesso.");
        setStatus("erro");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaToken]);

  const identificar = async (e) => {
    e.preventDefault();
    setErro(""); setIdentificando(true);
    try {
      const data = await apiAluno.entrarNaTurma(turmaToken, nome, matricula);
      setAlunoInfo(data);
      await carregarPainel();
    } catch (e2) {
      setErro(e2.message || "Não foi possível entrar na turma.");
    } finally {
      setIdentificando(false);
    }
  };

  const trocarIdentificacao = () => {
    apiAluno.esquecerIdentidade(turmaToken);
    setNome(""); setMatricula("");
    setStatus("identificar");
  };

  const iniciarCenario = async (cenario) => {
    setIniciandoId(cenario.id);
    setErro("");
    try {
      const sessao = await apiAluno.iniciarSessao(cenario.id);
      setSessaoAtiva({ sessao, cenarioTitulo: cenario.titulo });
      setStatus("chat");
    } catch (e) {
      setErro(e.message || "Não foi possível iniciar a simulação.");
    } finally {
      setIniciandoId(null);
    }
  };

  const abrirSessaoHistorico = async (sessaoResumo) => {
    try {
      const sessaoCompleta = await apiAluno.detalharSessao(sessaoResumo.id);
      setSessaoAtiva({ sessao: sessaoCompleta, cenarioTitulo: sessaoResumo.cenario_titulo });
      setStatus("chat");
    } catch (e) {
      setErro(e.message || "Não foi possível abrir esta sessão.");
    }
  };

  const voltarParaLista = async () => {
    setSessaoAtiva(null);
    setStatus("lista");
    try {
      const historicoData = await apiAluno.listarHistorico();
      setHistorico(historicoData || []);
    } catch { /* silencioso */ }
  };

  if (status === "carregando") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="text-amber-400 animate-spin" />
      </div>
    );
  }

  if (status === "identificar") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={22} className="text-amber-400" />
            </div>
            <h1 className="text-lg font-bold text-white">Identifique-se para continuar</h1>
            <p className="text-slate-400 text-sm mt-1">Use sempre a mesma matrícula para acompanhar seu histórico.</p>
          </div>
          <form onSubmit={identificar} className="space-y-4">
            <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required />
            <Input label="Matrícula / ID acadêmico" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 2024012345" required />
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <Button type="submit" className="w-full" disabled={identificando}>
              {identificando ? <Loader2 size={16} className="animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (status === "erro") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-slate-300 text-sm">{erro}</p>
        </div>
      </div>
    );
  }

  if (status === "chat" && sessaoAtiva) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <ClienteVirtualChatPage
          sessao={sessaoAtiva.sessao}
          cenarioTitulo={sessaoAtiva.cenarioTitulo}
          onVoltar={voltarParaLista}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Olá, {alunoInfo?.aluno_nome}</h1>
            <p className="text-slate-500 text-sm">{alunoInfo?.turma_nome}</p>
          </div>
          <button onClick={trocarIdentificacao} className="text-xs text-slate-500 hover:text-amber-400">
            Não é você?
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-700/40">
          {[
            { id: "cenarios", label: "Simulações disponíveis", icon: MessageSquare },
            { id: "historico", label: "Meu histórico", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={cls(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                aba === t.id ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}

        {aba === "cenarios" && (
          <div className="space-y-3">
            {cenarios.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">Nenhuma simulação disponível para sua turma ainda.</p>
            ) : cenarios.map((c) => (
              <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                <p className="text-white font-bold">{c.titulo}</p>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{c.contexto_cenario}</p>
                <button
                  onClick={() => iniciarCenario(c)}
                  disabled={iniciandoId === c.id}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-sm rounded-xl"
                >
                  {iniciandoId === c.id ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                  Iniciar simulação
                </button>
              </div>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="space-y-3">
            {historico.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">Você ainda não fez nenhuma simulação.</p>
            ) : historico.map((s) => (
              <button
                key={s.id}
                onClick={() => abrirSessaoHistorico(s)}
                className="w-full text-left bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-slate-200 font-semibold text-sm">{s.cenario_titulo}</p>
                  {s.status === "finalizada" ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={13} /> Finalizada</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 text-xs"><Clock size={13} /> Em andamento</span>
                  )}
                </div>
                {s.avaliacao && (
                  <p className="text-slate-400 text-xs mt-1">Pontuação: {s.avaliacao.relatorio?.pontuacao_geral ?? "—"}/100</p>
                )}
                <p className="text-slate-600 text-xs mt-1">{new Date(s.iniciado_em).toLocaleDateString("pt-BR")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
