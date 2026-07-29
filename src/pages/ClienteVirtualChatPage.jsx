/**
 * ClienteVirtualChatPage — chat da simulação (visão do aluno).
 *
 * Recebe uma sessão já iniciada (com a fala inicial da persona) e conduz a
 * conversa turno a turno. Ao finalizar, exibe o relatório de desempenho.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Loader2, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { apiAluno } from "../services/apiAluno";

const MAX_TURNS = 20;

function cls(...args) { return args.filter(Boolean).join(" "); }

function IconAtendido({ atendido }) {
  if (atendido === "sim") return <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />;
  if (atendido === "parcial") return <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />;
  if (atendido === "nao") return <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />;
  return <MinusCircle size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />;
}

function RelatorioAvaliacao({ relatorio }) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Pontuação geral</p>
        <p className="text-4xl font-black text-amber-400">{relatorio.pontuacao_geral ?? "—"}<span className="text-lg text-slate-500">/100</span></p>
        {relatorio.resumo_texto && (
          <p className="text-slate-300 text-sm mt-3 max-w-lg mx-auto">{relatorio.resumo_texto}</p>
        )}
      </div>

      {Array.isArray(relatorio.criterios) && relatorio.criterios.length > 0 && (
        <div className="space-y-2">
          {relatorio.criterios.map((c, i) => (
            <div key={i} className="flex gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <IconAtendido atendido={c.atendido} />
              <div className="min-w-0">
                <p className="text-slate-200 text-sm font-semibold">{c.criterio}</p>
                {c.comentario && <p className="text-slate-400 text-xs mt-1">{c.comentario}</p>}
                {c.evidencia_trecho && (
                  <p className="text-slate-500 text-xs mt-1 italic">"{c.evidencia_trecho}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClienteVirtualChatPage({ sessao, cenarioTitulo, onVoltar }) {
  const [mensagens, setMensagens] = useState(sessao.mensagens || []);
  const [status, setStatus] = useState(sessao.status || "em_andamento");
  const [turnoAtual, setTurnoAtual] = useState(sessao.turno_atual || 0);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [avaliacao, setAvaliacao] = useState(null);
  const [erro, setErro] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens]);

  // Reabrindo uma sessão já finalizada (a partir do histórico) — busca o
  // relatório já gerado em vez de mostrar o chat com o botão "Finalizar" de novo.
  useEffect(() => {
    if (sessao.status === "finalizada" && !avaliacao) {
      apiAluno.finalizarSessao(sessao.id)
        .then((resultado) => setAvaliacao(resultado.relatorio))
        .catch((e) => setErro(e.message || "Erro ao carregar relatório."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviarMensagem = async () => {
    const conteudo = input.trim();
    if (!conteudo || enviando || status !== "em_andamento") return;

    setErro("");
    setEnviando(true);
    setInput("");
    setMensagens((m) => [...m, { role: "aluno", conteudo, ordem: m.length, id: `local-${Date.now()}` }]);

    try {
      const respostaPersona = await apiAluno.enviarMensagem(sessao.id, conteudo);
      setMensagens((m) => [...m, respostaPersona]);
      setTurnoAtual((t) => t + 1);
    } catch (e) {
      setErro(e.message || "Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const finalizar = async () => {
    setFinalizando(true);
    setErro("");
    try {
      const resultado = await apiAluno.finalizarSessao(sessao.id);
      setAvaliacao(resultado.relatorio);
      setStatus("finalizada");
    } catch (e) {
      setErro(e.message || "Erro ao finalizar sessão.");
    } finally {
      setFinalizando(false);
    }
  };

  const limiteAtingido = turnoAtual >= MAX_TURNS;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4">
        <button onClick={onVoltar} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/60">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{cenarioTitulo}</h1>
          <p className="text-slate-500 text-xs">{status === "finalizada" ? "Sessão finalizada" : `Turno ${turnoAtual}/${MAX_TURNS}`}</p>
        </div>
      </div>

      {avaliacao ? (
        <div className="flex-1 overflow-y-auto pb-6">
          <RelatorioAvaliacao relatorio={avaliacao} />
          <button
            onClick={onVoltar}
            className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl"
          >
            Voltar aos cenários
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
            {mensagens.map((m, i) => (
              <div key={m.id || i} className={cls("flex", m.role === "aluno" ? "justify-end" : "justify-start")}>
                {m.role === "sistema" ? (
                  <div className="mx-auto text-xs text-slate-500 bg-slate-800/60 rounded-full px-3 py-1">{m.conteudo}</div>
                ) : (
                  <div className={cls(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "aluno"
                      ? "bg-amber-500 text-slate-900 font-medium"
                      : "bg-slate-800/70 border border-slate-700/50 text-slate-200",
                  )}>
                    {m.conteudo}
                  </div>
                )}
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl px-4 py-2.5">
                  <Loader2 size={16} className="text-slate-400 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {erro && <p className="text-red-400 text-xs mb-2">{erro}</p>}

          <div className="border-t border-slate-700/40 pt-4 space-y-3">
            {status === "em_andamento" && !limiteAtingido && (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                  placeholder="Digite sua mensagem..."
                  disabled={enviando}
                  className="flex-1 bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={enviando || !input.trim()}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 rounded-xl transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
            <button
              onClick={finalizar}
              disabled={finalizando}
              className="w-full py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {finalizando ? "Gerando avaliação..." : limiteAtingido ? "Ver relatório de desempenho" : "Finalizar sessão"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
