/**
 * ClienteVirtualCriarPage — Wizard de 4 etapas para criar um Cliente Virtual
 * (persona/paciente/cliente simulado + framework normativo + critérios).
 *
 * Etapa 0 — Cenário base       (título, área, persona, contexto)
 * Etapa 1 — Critérios          (lista de critérios, com assistência de IA)
 * Etapa 2 — Framework          (upload de protocolos/normas de referência)
 * Etapa 3 — Publicação         (modo de feedback + turmas + publicar)
 */
import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, Users, ClipboardList, FileUp, Send,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle,
  Plus, Trash2, Sparkles, Copy, Check, History,
} from "lucide-react";
import { api } from "../services/api";
import { Card, Button, Input, Select, Textarea } from "../components/ui";

function cls(...args) { return args.filter(Boolean).join(" "); }

const STEP_LABELS = ["Cenário", "Critérios", "Framework", "Publicação"];

const AREAS = [
  { value: "geral", label: "Geral" },
  { value: "saude", label: "Saúde" },
  { value: "direito", label: "Direito" },
  { value: "engenharia", label: "Engenharia" },
  { value: "administracao", label: "Administração" },
];

function StepIndicator({ current, labels }) {
  return (
    <div className="mb-8 select-none" style={{ display: "grid", gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const first = i === 0;
        const last = i === labels.length - 1;
        return (
          <div key={i} className="flex flex-col items-center relative">
            {!first && <div className={cls("absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2", done || active ? "bg-emerald-500" : "bg-slate-700")} />}
            {!last && <div className={cls("absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2", done ? "bg-emerald-500" : "bg-slate-700")} />}
            <div className={cls(
              "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
              done && "bg-emerald-500 border-emerald-500 text-white",
              active && "bg-amber-500 border-amber-500 text-slate-900",
              !done && !active && "bg-slate-800 border-slate-600 text-slate-400",
            )}>
              {done ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={cls("text-xs font-medium text-center mt-1.5", done && "text-emerald-400", active && "text-amber-400", !done && !active && "text-slate-500")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_FORM = {
  titulo: "",
  area: "geral",
  persona_desc: "",
  contexto_cenario: "",
  feedback_modo: "fim_sessao",
};

export default function ClienteVirtualCriarPage({ setToast }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [cenarioId, setCenarioId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [criterios, setCriterios] = useState([]);
  const [assistindo, setAssistindo] = useState(false);

  const [frameworks, setFrameworks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const [turmas, setTurmas] = useState([]);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [criandoTurma, setCriandoTurma] = useState(false);
  const [turmaExpandida, setTurmaExpandida] = useState(null);
  const [alunosTexto, setAlunosTexto] = useState("");
  const [linksGerados, setLinksGerados] = useState([]);
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const canNext = [
    form.titulo.trim().length >= 5 && form.persona_desc.trim().length >= 15 && form.contexto_cenario.trim().length >= 30,
    true, // critérios são opcionais (podem ser gerados por IA depois)
    true, // framework é opcional
    turmasSelecionadas.length > 0,
  ];

  // ── Etapa 0: salvar cenário base ──────────────────────────────────────────

  const salvarCenarioBase = async () => {
    setErro(""); setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        area: form.area,
        persona_desc: form.persona_desc,
        contexto_cenario: form.contexto_cenario,
        feedback_modo: form.feedback_modo,
      };
      if (cenarioId) {
        await api.atualizarCenarioVirtual(cenarioId, payload);
      } else {
        const criado = await api.criarCenarioVirtual(payload);
        setCenarioId(criado.id);
        setCriterios(criado.criterios_avaliacao || []);
      }
      setStep(1);
    } catch (e) {
      setErro(e.message || "Erro ao salvar cenário.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Etapa 1: critérios ────────────────────────────────────────────────────

  const adicionarCriterio = () => setCriterios((c) => [...c, { criterio: "", peso: 3, descricao: "" }]);
  const removerCriterio = (i) => setCriterios((c) => c.filter((_, idx) => idx !== i));
  const atualizarCriterio = (i, campo, valor) => setCriterios((c) => c.map((cr, idx) => idx === i ? { ...cr, [campo]: valor } : cr));

  const salvarCriterios = async () => {
    setErro(""); setSalvando(true);
    try {
      await api.atualizarCenarioVirtual(cenarioId, { criterios_avaliacao: criterios });
      setStep(2);
    } catch (e) {
      setErro(e.message || "Erro ao salvar critérios.");
    } finally {
      setSalvando(false);
    }
  };

  const assistirComIA = async () => {
    setAssistindo(true); setErro("");
    try {
      const atualizado = await api.assistirCriteriosCenario(cenarioId);
      setCriterios(atualizado.criterios_avaliacao || []);
      setToast?.({ message: "Critérios sugeridos pela IA. Revise antes de continuar.", type: "success" });
    } catch (e) {
      setErro(e.message || "Erro ao gerar critérios com IA.");
    } finally {
      setAssistindo(false);
    }
  };

  // ── Etapa 2: framework ────────────────────────────────────────────────────

  const carregarFrameworks = async () => {
    if (!cenarioId) return;
    try {
      const data = await api.listarFrameworkCenario(cenarioId);
      setFrameworks(data || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (step !== 2 || !cenarioId) return;
    carregarFrameworks();
    // Polling simples enquanto houver documento pendente/processando
    pollRef.current = setInterval(() => {
      setFrameworks((atual) => {
        const temPendente = atual.some((d) => ["pendente", "processando"].includes(d.status_processamento));
        if (temPendente) carregarFrameworks();
        return atual;
      });
    }, 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cenarioId]);

  const handleUploadFramework = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setUploading(true); setErro("");
    try {
      await api.uploadFrameworkCenario(cenarioId, arquivo);
      await carregarFrameworks();
      setToast?.({ message: "Documento enviado. Processando...", type: "success" });
    } catch (e2) {
      setErro(e2.message || "Erro ao enviar documento.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Etapa 3: turmas e publicação ──────────────────────────────────────────

  useEffect(() => {
    if (step !== 3) return;
    api.listarTurmasVirtuais().then((data) => setTurmas(data || [])).catch(() => {});
  }, [step]);

  const criarTurma = async () => {
    if (!novaTurmaNome.trim()) return;
    setCriandoTurma(true);
    try {
      const nova = await api.criarTurmaVirtual({ nome: novaTurmaNome.trim() });
      setTurmas((t) => [nova, ...t]);
      setNovaTurmaNome("");
    } catch (e) {
      setErro(e.message || "Erro ao criar turma.");
    } finally {
      setCriandoTurma(false);
    }
  };

  const toggleTurmaSelecionada = (id) =>
    setTurmasSelecionadas((sel) => sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  const adicionarAlunos = async (turmaId) => {
    const nomes = alunosTexto.split("\n").map((n) => n.trim()).filter(Boolean);
    if (nomes.length === 0) return;
    try {
      const criados = await api.adicionarAlunosTurma(turmaId, nomes.map((nome) => ({ nome })));
      setLinksGerados(criados);
      setAlunosTexto("");
      setToast?.({ message: `${criados.length} aluno(s) adicionado(s).`, type: "success" });
    } catch (e) {
      setErro(e.message || "Erro ao adicionar alunos.");
    }
  };

  const publicar = async () => {
    setPublicando(true); setErro("");
    try {
      await api.publicarCenarioVirtual(cenarioId, turmasSelecionadas);
      setPublicado(true);
      setToast?.({ message: "Cenário publicado com sucesso!", type: "success" });
      window.dispatchEvent(new CustomEvent("atividadeGerada", { detail: { tipo: "cliente-virtual" } }));
    } catch (e) {
      setErro(e.message || "Erro ao publicar cenário.");
    } finally {
      setPublicando(false);
    }
  };

  const handleNovo = () => {
    setStep(0); setForm(DEFAULT_FORM); setCenarioId(null);
    setCriterios([]); setFrameworks([]); setTurmasSelecionadas([]);
    setLinksGerados([]); setPublicado(false); setErro("");
  };

  // ── render — sucesso ──────────────────────────────────────────────────────

  if (publicado) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black text-white">Cliente Virtual publicado!</h1>
        <p className="text-slate-400 text-sm">Os alunos das turmas selecionadas já podem acessar via link individual.</p>
        <Button onClick={handleNovo}><Plus size={16} /> Criar novo cenário</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <MessageSquare size={22} className="text-amber-400" />
          </span>
          Cliente Virtual
        </h1>
        <p className="text-slate-400 text-sm mt-1.5 ml-14">
          Crie uma persona simulada que conversa com o aluno e o avalia contra critérios e normas da sua área
        </p>
      </div>

      <StepIndicator current={step} labels={STEP_LABELS} />

      {erro && (
        <div className="flex gap-3 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {/* ── Etapa 0 — Cenário base ── */}
      {step === 0 && (
        <Card className="space-y-4">
          <Input label="Título do cenário" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Atendimento de paciente com dor torácica" />
          <Select label="Área" value={form.area} onChange={(e) => set("area", e.target.value)} options={AREAS} />
          <Textarea
            label="Descrição da persona (cliente/paciente/réu...)"
            value={form.persona_desc}
            onChange={(e) => set("persona_desc", e.target.value)}
            placeholder="Ex: Homem, 58 anos, chega à emergência com dor torácica há 30 minutos, ansioso, histórico de hipertensão não tratada..."
            rows={4}
          />
          <Textarea
            label="Contexto do cenário"
            value={form.contexto_cenario}
            onChange={(e) => set("contexto_cenario", e.target.value)}
            placeholder="Ex: O aluno deve conduzir a anamnese, priorizar condutas conforme protocolo de dor torácica e comunicar-se adequadamente com o paciente ansioso..."
            rows={5}
          />
        </Card>
      )}

      {/* ── Etapa 1 — Critérios ── */}
      {step === 1 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Critérios de avaliação</h2>
              <p className="text-slate-400 text-sm">Como o desempenho do aluno será avaliado ao final da simulação.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={assistirComIA} disabled={assistindo}>
              {assistindo ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Sugerir com IA
            </Button>
          </div>

          <div className="space-y-3">
            {criterios.map((c, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={c.criterio}
                    onChange={(e) => atualizarCriterio(i, "criterio", e.target.value)}
                    placeholder="Nome do critério"
                    className="flex-1 bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                  <input
                    type="number" min={1} max={5}
                    value={c.peso}
                    onChange={(e) => atualizarCriterio(i, "peso", Number(e.target.value))}
                    className="w-16 bg-slate-800/60 border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-slate-100 text-center"
                  />
                  <button onClick={() => removerCriterio(i)} className="text-slate-500 hover:text-red-400 p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={c.descricao}
                  onChange={(e) => atualizarCriterio(i, "descricao", e.target.value)}
                  placeholder="O que o aluno deve fazer/dizer para atender este critério"
                  rows={2}
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none"
                />
              </div>
            ))}
          </div>

          <button onClick={adicionarCriterio} className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
            <Plus size={15} /> Adicionar critério
          </button>
        </Card>
      )}

      {/* ── Etapa 2 — Framework ── */}
      {step === 2 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Framework de referência</h2>
            <p className="text-slate-400 text-sm">Anexe protocolos, normas ou jurisprudência — a IA usará estes documentos para avaliar o aluno.</p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600/50 rounded-xl p-8 cursor-pointer hover:border-amber-500/40 transition-colors">
            <FileUp size={28} className="text-slate-500" />
            <span className="text-sm text-slate-400">{uploading ? "Enviando..." : "Clique para enviar um documento (PDF, DOCX, TXT)"}</span>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFramework} disabled={uploading} accept=".pdf,.docx,.doc,.txt,.md" />
          </label>

          <div className="space-y-2">
            {frameworks.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-700/40 rounded-xl px-4 py-3">
                <span className="text-slate-300 text-sm truncate">{f.nome_original}</span>
                <span className={cls(
                  "text-xs font-semibold px-2 py-1 rounded-full",
                  f.status_processamento === "processado" && "bg-emerald-900/40 text-emerald-400",
                  f.status_processamento === "erro" && "bg-red-900/40 text-red-400",
                  ["pendente", "processando"].includes(f.status_processamento) && "bg-amber-900/40 text-amber-400",
                )}>
                  {f.status_processamento}
                </span>
              </div>
            ))}
            {frameworks.length === 0 && <p className="text-slate-500 text-xs text-center py-2">Nenhum documento enviado ainda (opcional).</p>}
          </div>
        </Card>
      )}

      {/* ── Etapa 3 — Publicação ── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-white">Modo de feedback</h2>
            <div className="flex gap-3">
              {[
                { id: "fim_sessao", label: "Ao final da sessão" },
                { id: "tempo_real", label: "Em tempo real" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => set("feedback_modo", m.id)}
                  className={cls(
                    "flex-1 p-3 rounded-xl border text-sm font-semibold transition-all",
                    form.feedback_modo === m.id ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-slate-800/40 border-slate-700/40 text-slate-400",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-white">Turmas</h2>
            <div className="flex gap-2">
              <input
                value={novaTurmaNome}
                onChange={(e) => setNovaTurmaNome(e.target.value)}
                placeholder="Nome da nova turma"
                className="flex-1 bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-slate-100"
              />
              <Button size="sm" onClick={criarTurma} disabled={criandoTurma || !novaTurmaNome.trim()}>
                <Plus size={14} /> Criar
              </Button>
            </div>

            <div className="space-y-2">
              {turmas.map((t) => (
                <div key={t.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={turmasSelecionadas.includes(t.id)}
                      onChange={() => toggleTurmaSelecionada(t.id)}
                      className="w-4 h-4"
                    />
                    <span className="flex-1 text-slate-200 text-sm font-medium">{t.nome}</span>
                    <button
                      onClick={() => setTurmaExpandida(turmaExpandida === t.id ? null : t.id)}
                      className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <Users size={13} /> Alunos
                    </button>
                  </div>
                  {turmaExpandida === t.id && (
                    <div className="border-t border-slate-700/40 p-4 space-y-3">
                      <textarea
                        value={alunosTexto}
                        onChange={(e) => setAlunosTexto(e.target.value)}
                        placeholder={"Um nome de aluno por linha\nEx:\nMaria Silva\nJoão Souza"}
                        rows={3}
                        className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none"
                      />
                      <Button size="sm" onClick={() => adicionarAlunos(t.id)}>
                        <Send size={13} /> Gerar links de acesso
                      </Button>
                      {linksGerados.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          {linksGerados.map((a) => (
                            <LinkAlunoRow key={a.id} aluno={a} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {turmas.length === 0 && <p className="text-slate-500 text-xs text-center py-2">Nenhuma turma criada ainda.</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Navegação ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || salvando}
          className={cls("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold", step === 0 || salvando ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700")}
        >
          <ChevronLeft size={16} /> Voltar
        </button>

        {step === 0 && (
          <button onClick={salvarCenarioBase} disabled={!canNext[0] || salvando} className={cls("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold", canNext[0] && !salvando ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-slate-700/40 text-slate-500 cursor-not-allowed")}>
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <>Continuar <ChevronRight size={16} /></>}
          </button>
        )}
        {step === 1 && (
          <button onClick={salvarCriterios} disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <>Continuar <ChevronRight size={16} /></>}
          </button>
        )}
        {step === 2 && (
          <button onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">
            Continuar <ChevronRight size={16} />
          </button>
        )}
        {step === 3 && (
          <button onClick={publicar} disabled={!canNext[3] || publicando} className={cls("flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm", canNext[3] && !publicando ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-amber-500/50 text-slate-700 cursor-not-allowed")}>
            {publicando ? <Loader2 size={17} className="animate-spin" /> : <><MessageSquare size={17} /> Publicar</>}
          </button>
        )}
      </div>
    </div>
  );
}

function LinkAlunoRow({ aluno }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(aluno.link_acesso).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  };
  return (
    <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
      <span className="flex-1 text-xs text-slate-300 truncate">{aluno.nome}</span>
      <button onClick={copiar} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 flex-shrink-0">
        {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
