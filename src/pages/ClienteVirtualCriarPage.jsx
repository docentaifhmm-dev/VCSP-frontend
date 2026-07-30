/**
 * ClienteVirtualCriarPage — Wizard de 5 etapas para criar um Cliente Virtual
 * (persona/paciente/cliente simulado + framework normativo + critérios).
 *
 * Etapa 0 — Disciplina         (instituição/disciplina/período + plano de ensino + seleção de competências/habilidades/aprendizagens)
 * Etapa 1 — Cenário base       (título, área, persona, contexto)
 * Etapa 2 — Critérios          (lista de critérios, com assistência de IA)
 * Etapa 3 — Framework          (upload de protocolos/normas de referência)
 * Etapa 4 — Publicação         (modo de feedback + turmas + publicar)
 */
import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, Users, ClipboardList, FileUp, Send, GraduationCap,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle,
  Plus, Trash2, Sparkles, Copy, Check, History,
} from "lucide-react";
import { api } from "../services/api";
import { Card, Button, Input, Select, Textarea } from "../components/ui";

function cls(...args) { return args.filter(Boolean).join(" "); }

const STEP_LABELS = ["Disciplina", "Cenário", "Critérios", "Framework", "Publicação"];

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

const DEFAULT_NOVA_DISCIPLINA = { instituicao_nome: "", disciplina_nome: "", periodo_letivo: "" };

const STATUS_BADGE_CLASS = (status) => cls(
  "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
  status === "processado" && "bg-emerald-900/40 text-emerald-400",
  status === "erro" && "bg-red-900/40 text-red-400",
  ["pendente", "processando"].includes(status) && "bg-amber-900/40 text-amber-400",
);

export default function ClienteVirtualCriarPage({ setToast, cenarioIdInicial = null, onVoltar }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [cenarioId, setCenarioId] = useState(cenarioIdInicial);
  const [carregandoCenario, setCarregandoCenario] = useState(!!cenarioIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Disciplina ──────────────────────────────────────────────────────────────
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaId, setDisciplinaId] = useState(null);
  const [novaDisciplina, setNovaDisciplina] = useState(DEFAULT_NOVA_DISCIPLINA);
  const [criandoDisciplina, setCriandoDisciplina] = useState(false);
  const [planoDocs, setPlanoDocs] = useState([]);
  const [uploadingPlano, setUploadingPlano] = useState(false);
  const planoFileInputRef = useRef(null);
  const planoPollRef = useRef(null);
  const [conhecimento, setConhecimento] = useState(null);
  const [competenciasSelecionadas, setCompetenciasSelecionadas] = useState([]);
  const [habilidadesSelecionadas, setHabilidadesSelecionadas] = useState([]);
  const [aprendizagensSelecionadas, setAprendizagensSelecionadas] = useState([]);

  const [criterios, setCriterios] = useState([]);
  const [assistindo, setAssistindo] = useState(false);

  const [frameworks, setFrameworks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const [turmas, setTurmas] = useState([]);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [turmasPublicadas, setTurmasPublicadas] = useState([]); // turmas já publicadas para este cenário (com link fixo)
  const turmasPreSelecionadasRef = useRef(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [criandoTurma, setCriandoTurma] = useState(false);
  const [turmaExpandida, setTurmaExpandida] = useState(null);
  const [alunosPorTurma, setAlunosPorTurma] = useState({}); // turma_id -> lista de alunos
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(false);

  // Reabrindo um cenário já existente (a partir do dashboard) — carrega os
  // dados já salvos em vez de começar do formulário em branco.
  useEffect(() => {
    if (!cenarioIdInicial) { return; }
    api.detalharCenarioVirtual(cenarioIdInicial)
      .then((c) => {
        setForm({
          titulo: c.titulo,
          area: c.area || "geral",
          persona_desc: c.persona_desc,
          contexto_cenario: c.contexto_cenario,
          feedback_modo: c.feedback_modo,
        });
        setCriterios(c.criterios_avaliacao || []);
        setDisciplinaId(c.disciplina_id || null);
        setCompetenciasSelecionadas(c.competencias_selecionadas || []);
        setHabilidadesSelecionadas(c.habilidades_selecionadas || []);
        setAprendizagensSelecionadas(c.aprendizagens_selecionadas || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar cenário."))
      .finally(() => setCarregandoCenario(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.listarDisciplinas().then((d) => setDisciplinas(d || [])).catch(() => {});
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const canNext = [
    true, // disciplina é opcional
    form.titulo.trim().length >= 5 && form.persona_desc.trim().length >= 15 && form.contexto_cenario.trim().length >= 30,
    true, // critérios são opcionais (podem ser gerados por IA depois)
    true, // framework é opcional
    turmasSelecionadas.length > 0,
  ];

  // ── Etapa 0: disciplina, plano de ensino e seleção pedagógica ────────────────

  const carregarPlanoDocs = async (discId) => {
    if (!discId) return;
    try {
      const data = await api.listarPlanoEnsino(discId);
      setPlanoDocs(data || []);
    } catch { /* silencioso */ }
  };

  const carregarConhecimento = async (discId) => {
    if (!discId) return;
    try {
      const data = await api.obterConhecimentoDisciplina(discId);
      setConhecimento(data);
    } catch {
      setConhecimento(null);
    }
  };

  useEffect(() => {
    if (!disciplinaId) { setPlanoDocs([]); setConhecimento(null); return; }
    carregarPlanoDocs(disciplinaId);
    carregarConhecimento(disciplinaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplinaId]);

  useEffect(() => {
    if (step !== 0 || !disciplinaId) return;
    planoPollRef.current = setInterval(() => {
      setPlanoDocs((atual) => {
        const temPendente = atual.some((d) => ["pendente", "processando"].includes(d.status_processamento));
        if (temPendente) {
          carregarPlanoDocs(disciplinaId);
          carregarConhecimento(disciplinaId);
        }
        return atual;
      });
    }, 4000);
    return () => clearInterval(planoPollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, disciplinaId]);

  const criarNovaDisciplina = async () => {
    if (!novaDisciplina.instituicao_nome.trim() || !novaDisciplina.disciplina_nome.trim() || !novaDisciplina.periodo_letivo.trim()) return;
    setCriandoDisciplina(true); setErro("");
    try {
      const criada = await api.criarDisciplina(novaDisciplina);
      setDisciplinas((d) => [criada, ...d]);
      setDisciplinaId(criada.id);
      setNovaDisciplina(DEFAULT_NOVA_DISCIPLINA);
    } catch (e) {
      setErro(e.message || "Erro ao criar disciplina.");
    } finally {
      setCriandoDisciplina(false);
    }
  };

  const handleUploadPlano = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !disciplinaId) return;
    setUploadingPlano(true); setErro("");
    try {
      await api.uploadPlanoEnsino(disciplinaId, arquivo);
      await carregarPlanoDocs(disciplinaId);
      setToast?.({ message: "Plano de ensino enviado. Extraindo competências, habilidades e aprendizagens...", type: "success" });
    } catch (e2) {
      setErro(e2.message || "Erro ao enviar plano de ensino.");
    } finally {
      setUploadingPlano(false);
      if (planoFileInputRef.current) planoFileInputRef.current.value = "";
    }
  };

  const toggleSelecionado = (lista, setLista, valor) =>
    setLista(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

  // ── Etapa 1: salvar cenário base ──────────────────────────────────────────

  const salvarCenarioBase = async () => {
    setErro(""); setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        area: form.area,
        persona_desc: form.persona_desc,
        contexto_cenario: form.contexto_cenario,
        feedback_modo: form.feedback_modo,
        disciplina_id: disciplinaId || null,
        competencias_selecionadas: competenciasSelecionadas,
        habilidades_selecionadas: habilidadesSelecionadas,
        aprendizagens_selecionadas: aprendizagensSelecionadas,
      };
      if (cenarioId) {
        await api.atualizarCenarioVirtual(cenarioId, payload);
      } else {
        const criado = await api.criarCenarioVirtual(payload);
        setCenarioId(criado.id);
        setCriterios(criado.criterios_avaliacao || []);
      }
      setStep(2);
    } catch (e) {
      setErro(e.message || "Erro ao salvar cenário.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Etapa 2: critérios ────────────────────────────────────────────────────

  const adicionarCriterio = () => setCriterios((c) => [...c, { criterio: "", peso: 3, descricao: "" }]);
  const removerCriterio = (i) => setCriterios((c) => c.filter((_, idx) => idx !== i));
  const atualizarCriterio = (i, campo, valor) => setCriterios((c) => c.map((cr, idx) => idx === i ? { ...cr, [campo]: valor } : cr));

  const salvarCriterios = async () => {
    setErro(""); setSalvando(true);
    try {
      await api.atualizarCenarioVirtual(cenarioId, { criterios_avaliacao: criterios });
      setStep(3);
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

  // ── Etapa 3: framework ────────────────────────────────────────────────────

  const carregarFrameworks = async () => {
    if (!cenarioId) return;
    try {
      const data = await api.listarFrameworkCenario(cenarioId);
      setFrameworks(data || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (step !== 3 || !cenarioId) return;
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

  // ── Etapa 4: turmas e publicação ──────────────────────────────────────────

  useEffect(() => {
    if (step !== 4) return;
    api.listarTurmasVirtuais().then((data) => setTurmas(data || [])).catch(() => {});
    if (!cenarioId) return;
    api.listarTurmasPublicadasCenario(cenarioId).then((data) => {
      const publicadas = data || [];
      setTurmasPublicadas(publicadas);
      // Pré-marca as turmas já publicadas apenas na primeira vez que a etapa é
      // aberta — evita sobrescrever seleções que o professor já ajustou.
      if (!turmasPreSelecionadasRef.current) {
        turmasPreSelecionadasRef.current = true;
        setTurmasSelecionadas((sel) => sel.length > 0 ? sel : publicadas.map((t) => t.id));
      }
    }).catch(() => {});
  }, [step, cenarioId]);

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

  const toggleExpandirTurma = async (turmaId) => {
    if (turmaExpandida === turmaId) { setTurmaExpandida(null); return; }
    setTurmaExpandida(turmaId);
    if (alunosPorTurma[turmaId]) return; // já carregado
    setCarregandoAlunos(true);
    try {
      const alunos = await api.listarAlunosTurma(turmaId);
      setAlunosPorTurma((m) => ({ ...m, [turmaId]: alunos || [] }));
    } catch (e) {
      setErro(e.message || "Erro ao carregar alunos da turma.");
    } finally {
      setCarregandoAlunos(false);
    }
  };

  const copiarLinkTurma = (link) => {
    navigator.clipboard?.writeText(link);
    setToast?.({ message: "Link copiado!", type: "success" });
  };

  const regenerarLink = async (turmaId) => {
    if (!confirm("Gerar um novo link vai invalidar o link antigo — quem ainda não entrou vai precisar do link novo. Continuar?")) return;
    try {
      const atualizada = await api.regenerarLinkTurma(turmaId);
      setTurmas((t) => t.map((x) => x.id === turmaId ? atualizada : x));
      setToast?.({ message: "Novo link gerado.", type: "success" });
    } catch (e) {
      setErro(e.message || "Erro ao gerar novo link.");
    }
  };

  const publicar = async () => {
    setPublicando(true); setErro("");
    try {
      await api.publicarCenarioVirtual(cenarioId, turmasSelecionadas);
      const publicadas = await api.listarTurmasPublicadasCenario(cenarioId).catch(() => []);
      setTurmasPublicadas(publicadas || []);
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
    setCriterios([]); setFrameworks([]); setTurmasSelecionadas([]); setTurmasPublicadas([]);
    turmasPreSelecionadasRef.current = false;
    setAlunosPorTurma({}); setTurmaExpandida(null); setPublicado(false); setErro("");
    setDisciplinaId(null); setConhecimento(null); setPlanoDocs([]);
    setCompetenciasSelecionadas([]); setHabilidadesSelecionadas([]); setAprendizagensSelecionadas([]);
    setNovaDisciplina(DEFAULT_NOVA_DISCIPLINA);
  };

  // ── render — carregando cenário existente ─────────────────────────────────

  if (carregandoCenario) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="text-amber-400 animate-spin" />
      </div>
    );
  }

  // ── render — sucesso ──────────────────────────────────────────────────────

  if (publicado) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Cliente Virtual publicado!</h1>
          <p className="text-slate-400 text-sm">
            O link de cada turma é fixo — pode ser reutilizado sempre que você quiser que os
            alunos façam esta atividade novamente, em qualquer semestre.
          </p>
        </div>

        {turmasPublicadas.length > 0 && (
          <Card className="space-y-2">
            <p className="text-sm font-bold text-white">Links para compartilhar com os alunos</p>
            {turmasPublicadas.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/40 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{t.nome}</p>
                  <p className="text-amber-300/80 text-xs truncate">{t.link_acesso}</p>
                </div>
                <button onClick={() => copiarLinkTurma(t.link_acesso)} className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 flex-shrink-0 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-3 py-2">
                  <Copy size={13} /> Copiar
                </button>
              </div>
            ))}
          </Card>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={handleNovo}><Plus size={16} /> Criar novo cenário</Button>
          {onVoltar && <Button variant="secondary" onClick={onVoltar}>Voltar ao painel</Button>}
        </div>
      </div>
    );
  }

  const gruposConhecimento = conhecimento ? [
    { campo: "competencias", label: "Competências", lista: conhecimento.competencias || [], sel: competenciasSelecionadas, setSel: setCompetenciasSelecionadas },
    { campo: "habilidades", label: "Habilidades", lista: conhecimento.habilidades || [], sel: habilidadesSelecionadas, setSel: setHabilidadesSelecionadas },
    { campo: "aprendizagens", label: "Aprendizagens", lista: conhecimento.aprendizagens || [], sel: aprendizagensSelecionadas, setSel: setAprendizagensSelecionadas },
  ] : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
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
        {onVoltar && (
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 flex-shrink-0">
            <ChevronLeft size={16} /> Painel
          </button>
        )}
      </div>

      <StepIndicator current={step} labels={STEP_LABELS} />

      {erro && (
        <div className="flex gap-3 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {/* ── Etapa 0 — Disciplina ── */}
      {step === 0 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap size={18} className="text-amber-400" /> Disciplina (opcional)
            </h2>
            <p className="text-slate-400 text-sm">
              Vincule esta atividade a uma disciplina para extrair competências, habilidades e
              aprendizagens do plano de ensino e selecionar quais serão trabalhadas neste caso.
            </p>
          </div>

          <Select
            label="Disciplina"
            value={disciplinaId || ""}
            onChange={(e) => setDisciplinaId(e.target.value || null)}
            options={[
              { value: "", label: "Nenhuma — não vincular a uma disciplina" },
              ...disciplinas.map((d) => ({
                value: d.id,
                label: `${d.disciplina_nome} — ${d.instituicao_nome} (${d.periodo_letivo})`,
              })),
            ]}
          />

          <div className="border-t border-slate-700/40 pt-4 space-y-3">
            <p className="text-xs text-slate-500 font-semibold">Cadastrar nova disciplina</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={novaDisciplina.instituicao_nome}
                onChange={(e) => setNovaDisciplina((n) => ({ ...n, instituicao_nome: e.target.value }))}
                placeholder="Instituição"
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
              <input
                value={novaDisciplina.disciplina_nome}
                onChange={(e) => setNovaDisciplina((n) => ({ ...n, disciplina_nome: e.target.value }))}
                placeholder="Disciplina"
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
              <input
                value={novaDisciplina.periodo_letivo}
                onChange={(e) => setNovaDisciplina((n) => ({ ...n, periodo_letivo: e.target.value }))}
                placeholder="Período (ex: 2026/1)"
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={criarNovaDisciplina}
              disabled={criandoDisciplina || !novaDisciplina.instituicao_nome.trim() || !novaDisciplina.disciplina_nome.trim() || !novaDisciplina.periodo_letivo.trim()}
            >
              {criandoDisciplina ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Criar disciplina
            </Button>
          </div>

          {disciplinaId && (
            <div className="border-t border-slate-700/40 pt-4 space-y-3">
              <p className="text-xs text-slate-500 font-semibold">Plano de ensino</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600/50 rounded-xl p-6 cursor-pointer hover:border-amber-500/40 transition-colors">
                <FileUp size={22} className="text-slate-500" />
                <span className="text-xs text-slate-400">{uploadingPlano ? "Enviando..." : "Clique para enviar o plano de ensino (PDF, DOCX, TXT)"}</span>
                <input ref={planoFileInputRef} type="file" className="hidden" onChange={handleUploadPlano} disabled={uploadingPlano} accept=".pdf,.docx,.doc,.txt,.md" />
              </label>

              <div className="space-y-1.5">
                {planoDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 bg-slate-900/40 border border-slate-700/40 rounded-lg px-3 py-2">
                    <span className="text-slate-300 text-xs truncate">{d.nome_original}</span>
                    <span className={STATUS_BADGE_CLASS(d.status_processamento)}>{d.status_processamento}</span>
                  </div>
                ))}
              </div>

              {gruposConhecimento.some((g) => g.lista.length > 0) && (
                <div className="space-y-4 pt-2">
                  {gruposConhecimento.filter((g) => g.lista.length > 0).map(({ campo, label, lista, sel, setSel }) => (
                    <div key={campo}>
                      <p className="text-xs text-slate-500 mb-1.5">{label} — selecione as trabalhadas nesta atividade</p>
                      <div className="space-y-1">
                        {lista.map((item) => (
                          <label key={item} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-900/50">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={sel.includes(item)}
                              onChange={() => toggleSelecionado(sel, setSel, item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── Etapa 1 — Cenário base ── */}
      {step === 1 && (
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

      {/* ── Etapa 2 — Critérios ── */}
      {step === 2 && (
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

      {/* ── Etapa 3 — Framework ── */}
      {step === 3 && (
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
                <span className={STATUS_BADGE_CLASS(f.status_processamento)}>
                  {f.status_processamento}
                </span>
              </div>
            ))}
            {frameworks.length === 0 && <p className="text-slate-500 text-xs text-center py-2">Nenhum documento enviado ainda (opcional).</p>}
          </div>
        </Card>
      )}

      {/* ── Etapa 4 — Publicação ── */}
      {step === 4 && (
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
                    {turmasPublicadas.some((tp) => tp.id === t.id) && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">publicado</span>
                    )}
                    <button
                      onClick={() => toggleExpandirTurma(t.id)}
                      className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <Users size={13} /> Alunos
                    </button>
                  </div>
                  {turmaExpandida === t.id && (
                    <div className="border-t border-slate-700/40 p-4 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Link único da turma — compartilhe com todos os alunos. Cada um se identifica com nome + matrícula ao entrar.</p>
                        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                          <span className="flex-1 text-xs text-amber-300 truncate">{t.link_acesso}</span>
                          <button onClick={() => copiarLinkTurma(t.link_acesso)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 flex-shrink-0">
                            <Copy size={12} /> Copiar
                          </button>
                        </div>
                        <button onClick={() => regenerarLink(t.id)} className="text-xs text-slate-500 hover:text-red-400 mt-1.5">
                          Gerar novo link (invalida o atual)
                        </button>
                      </div>

                      <div className="border-t border-slate-700/30 pt-3">
                        <p className="text-xs text-slate-500 mb-2">Alunos que já entraram</p>
                        {carregandoAlunos && !alunosPorTurma[t.id] ? (
                          <Loader2 size={16} className="text-amber-400 animate-spin" />
                        ) : (alunosPorTurma[t.id] || []).length === 0 ? (
                          <p className="text-slate-600 text-xs">Ninguém entrou ainda.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {alunosPorTurma[t.id].map((a) => (
                              <div key={a.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                                <span className="text-slate-200">{a.nome}</span>
                                <span className="text-slate-500">{a.matricula}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
          <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">
            Continuar <ChevronRight size={16} />
          </button>
        )}
        {step === 1 && (
          <button onClick={salvarCenarioBase} disabled={!canNext[1] || salvando} className={cls("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold", canNext[1] && !salvando ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-slate-700/40 text-slate-500 cursor-not-allowed")}>
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <>Continuar <ChevronRight size={16} /></>}
          </button>
        )}
        {step === 2 && (
          <button onClick={salvarCriterios} disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <>Continuar <ChevronRight size={16} /></>}
          </button>
        )}
        {step === 3 && (
          <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">
            Continuar <ChevronRight size={16} />
          </button>
        )}
        {step === 4 && (
          <button onClick={publicar} disabled={!canNext[4] || publicando} className={cls("flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm", canNext[4] && !publicando ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-amber-500/50 text-slate-700 cursor-not-allowed")}>
            {publicando ? <Loader2 size={17} className="animate-spin" /> : <><MessageSquare size={17} /> Publicar</>}
          </button>
        )}
      </div>
    </div>
  );
}
