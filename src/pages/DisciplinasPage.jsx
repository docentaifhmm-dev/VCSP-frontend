/**
 * DisciplinasPage — Cadastro do Docente: instituições, disciplinas, período
 * letivo e plano de ensino (com extração de competências/habilidades/
 * aprendizagens via IA).
 */
import { useEffect, useRef, useState } from "react";
import {
  GraduationCap, Plus, FileUp, Loader2, ChevronLeft, ChevronDown, ChevronUp, Trash2, AlertCircle,
} from "lucide-react";
import { api } from "../services/api";
import { Card, Button } from "../components/ui";

function cls(...args) { return args.filter(Boolean).join(" "); }

const STATUS_BADGE_CLASS = (status) => cls(
  "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
  status === "processado" && "bg-emerald-900/40 text-emerald-400",
  status === "erro" && "bg-red-900/40 text-red-400",
  ["pendente", "processando"].includes(status) && "bg-amber-900/40 text-amber-400",
);

const DEFAULT_NOVA = { instituicao_nome: "", disciplina_nome: "", periodo_letivo: "" };

export default function DisciplinasPage({ onVoltar, setToast }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(DEFAULT_NOVA);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  const [expandida, setExpandida] = useState(null);
  const [docsPorDisciplina, setDocsPorDisciplina] = useState({});
  const [conhecimentoPorDisciplina, setConhecimentoPorDisciplina] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.listarDisciplinas().then((d) => setDisciplinas(d || [])).finally(() => setCarregando(false));
  }, []);

  const carregarDocs = async (id) => {
    try {
      const docs = await api.listarPlanoEnsino(id);
      setDocsPorDisciplina((m) => ({ ...m, [id]: docs || [] }));
    } catch { /* silencioso */ }
  };

  const carregarConhecimento = async (id) => {
    try {
      const c = await api.obterConhecimentoDisciplina(id);
      setConhecimentoPorDisciplina((m) => ({ ...m, [id]: c }));
    } catch {
      setConhecimentoPorDisciplina((m) => ({ ...m, [id]: null }));
    }
  };

  const toggleExpandir = async (id) => {
    if (expandida === id) { setExpandida(null); return; }
    setExpandida(id);
    if (!docsPorDisciplina[id]) await carregarDocs(id);
    if (!(id in conhecimentoPorDisciplina)) await carregarConhecimento(id);
  };

  useEffect(() => {
    if (!expandida) return;
    pollRef.current = setInterval(() => {
      const docs = docsPorDisciplina[expandida] || [];
      const temPendente = docs.some((d) => ["pendente", "processando"].includes(d.status_processamento));
      if (temPendente) { carregarDocs(expandida); carregarConhecimento(expandida); }
    }, 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida, docsPorDisciplina]);

  const criarDisciplina = async () => {
    if (!nova.instituicao_nome.trim() || !nova.disciplina_nome.trim() || !nova.periodo_letivo.trim()) return;
    setCriando(true); setErro("");
    try {
      const criada = await api.criarDisciplina(nova);
      setDisciplinas((d) => [criada, ...d]);
      setNova(DEFAULT_NOVA);
      setToast?.({ message: "Disciplina cadastrada.", type: "success" });
    } catch (e) {
      setErro(e.message || "Erro ao criar disciplina.");
    } finally {
      setCriando(false);
    }
  };

  const removerDisciplina = async (id) => {
    if (!confirm("Remover esta disciplina? Os planos de ensino enviados também serão removidos.")) return;
    try {
      await api.deletarDisciplina(id);
      setDisciplinas((d) => d.filter((x) => x.id !== id));
      if (expandida === id) setExpandida(null);
    } catch (e) {
      setErro(e.message || "Erro ao remover disciplina.");
    }
  };

  const handleUpload = async (id, e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setUploadingId(id); setErro("");
    try {
      await api.uploadPlanoEnsino(id, arquivo);
      await carregarDocs(id);
      setToast?.({ message: "Plano de ensino enviado. Extraindo competências, habilidades e aprendizagens...", type: "success" });
    } catch (e2) {
      setErro(e2.message || "Erro ao enviar plano de ensino.");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <GraduationCap size={18} className="text-amber-400" />
          </div>
          <p className="font-bold text-white text-sm">Cadastro do Docente</p>
        </div>
        {onVoltar && (
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400">
            <ChevronLeft size={16} /> Painel
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-white">Instituições e Disciplinas</h1>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre onde você atua e envie o plano de ensino de cada disciplina para extrair
            competências, habilidades e aprendizagens que poderão ser usadas na criação de casos.
          </p>
        </div>

        {erro && (
          <div className="flex gap-3 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{erro}</p>
          </div>
        )}

        <Card className="space-y-3">
          <p className="text-sm font-bold text-white">Nova disciplina</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={nova.instituicao_nome}
              onChange={(e) => setNova((n) => ({ ...n, instituicao_nome: e.target.value }))}
              placeholder="Instituição"
              className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={nova.disciplina_nome}
              onChange={(e) => setNova((n) => ({ ...n, disciplina_nome: e.target.value }))}
              placeholder="Disciplina"
              className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={nova.periodo_letivo}
              onChange={(e) => setNova((n) => ({ ...n, periodo_letivo: e.target.value }))}
              placeholder="Período (ex: 2026/1)"
              className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <Button
            size="sm"
            onClick={criarDisciplina}
            disabled={criando || !nova.instituicao_nome.trim() || !nova.disciplina_nome.trim() || !nova.periodo_letivo.trim()}
          >
            {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Cadastrar
          </Button>
        </Card>

        {carregando ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="text-amber-400 animate-spin" /></div>
        ) : disciplinas.length === 0 ? (
          <Card className="text-center py-10">
            <GraduationCap size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhuma disciplina cadastrada ainda.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {disciplinas.map((d) => (
              <div key={d.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{d.disciplina_nome}</p>
                    <p className="text-slate-500 text-xs truncate">{d.instituicao_nome} — {d.periodo_letivo}</p>
                  </div>
                  <button onClick={() => removerDisciplina(d.id)} className="text-slate-500 hover:text-red-400 p-1.5 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => toggleExpandir(d.id)} className="text-slate-400 hover:text-amber-400 p-1.5 flex-shrink-0">
                    {expandida === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {expandida === d.id && (
                  <div className="border-t border-slate-700/40 p-4 space-y-3">
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600/50 rounded-xl p-6 cursor-pointer hover:border-amber-500/40 transition-colors">
                      <FileUp size={22} className="text-slate-500" />
                      <span className="text-xs text-slate-400">
                        {uploadingId === d.id ? "Enviando..." : "Enviar plano de ensino (PDF, DOCX, TXT)"}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleUpload(d.id, e)}
                        disabled={uploadingId === d.id}
                        accept=".pdf,.docx,.doc,.txt,.md"
                      />
                    </label>

                    <div className="space-y-1.5">
                      {(docsPorDisciplina[d.id] || []).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
                          <span className="text-slate-300 text-xs truncate">{doc.nome_original}</span>
                          <span className={STATUS_BADGE_CLASS(doc.status_processamento)}>{doc.status_processamento}</span>
                        </div>
                      ))}
                      {(docsPorDisciplina[d.id] || []).length === 0 && (
                        <p className="text-slate-600 text-xs text-center py-2">Nenhum plano de ensino enviado ainda.</p>
                      )}
                    </div>

                    {conhecimentoPorDisciplina[d.id] && (
                      <div className="space-y-3 pt-1">
                        {[
                          { label: "Competências", lista: conhecimentoPorDisciplina[d.id].competencias || [] },
                          { label: "Habilidades", lista: conhecimentoPorDisciplina[d.id].habilidades || [] },
                          { label: "Aprendizagens", lista: conhecimentoPorDisciplina[d.id].aprendizagens || [] },
                        ].filter((g) => g.lista.length > 0).map(({ label, lista }) => (
                          <div key={label}>
                            <p className="text-xs text-slate-500 mb-1.5">{label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {lista.map((item) => (
                                <span key={item} className="text-xs bg-slate-800/60 text-slate-300 rounded-full px-2.5 py-1">{item}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
