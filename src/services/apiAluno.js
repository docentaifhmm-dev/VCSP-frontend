/**
 * Cliente Virtual — API do Aluno.
 *
 * Cliente HTTP separado do `api` (professor) de propósito: o principal
 * autenticado aqui é um AlunoTurma, nunca um User — misturar os dois no
 * mesmo singleton arriscaria contaminar o estado de sessão entre papéis na
 * mesma aba do navegador.
 *
 * Sessão: o link é único por TURMA (não por aluno) — quem identifica o aluno
 * é a matrícula que ele digita ao entrar. A mesma matrícula sempre recupera
 * o mesmo histórico, mesmo em outro dispositivo. Guardamos nome+matrícula em
 * localStorage (por turma) só como conveniência, para não pedir de novo no
 * mesmo aparelho — não é o mecanismo de identificação em si.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "https://api.appdocentia.com.br/api";
const STORAGE_PREFIX = "vcsp_cv_identidade_";

class ApiAlunoService {
  constructor() {
    this._alunoToken = null;
  }

  getIdentidadeSalva(turmaToken) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + turmaToken);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  salvarIdentidade(turmaToken, nome, matricula) {
    try { localStorage.setItem(STORAGE_PREFIX + turmaToken, JSON.stringify({ nome, matricula })); } catch { /* ignore */ }
  }

  esquecerIdentidade(turmaToken) {
    try { localStorage.removeItem(STORAGE_PREFIX + turmaToken); } catch { /* ignore */ }
  }

  /** Identifica o aluno (nome + matrícula) pelo link único da turma. */
  async entrarNaTurma(turmaToken, nome, matricula) {
    const res = await fetch(`${API_BASE}/cliente-virtual/aluno/turma/${turmaToken}/entrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, matricula }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Link de acesso inválido ou expirado.");

    this._alunoToken = data.token;
    this.salvarIdentidade(turmaToken, nome, matricula);
    return data; // { token, aluno_nome, turma_nome }
  }

  async request(method, path, body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this._alunoToken) headers["Authorization"] = `Bearer ${this._alunoToken}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 204) return null;

    let data;
    try { data = await res.json(); } catch { throw new Error(`Erro ${res.status}`); }
    if (!res.ok) {
      const detail = Array.isArray(data.detail)
        ? data.detail.map((e) => e.msg || JSON.stringify(e)).join("; ")
        : data.detail;
      const err = new Error(detail || `Erro ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  listarCenarios() {
    return this.request("GET", "/cliente-virtual/aluno/cenarios");
  }

  iniciarSessao(cenarioId) {
    return this.request("POST", "/cliente-virtual/aluno/sessoes", { cenario_id: cenarioId });
  }

  enviarMensagem(sessaoId, conteudo) {
    return this.request("POST", `/cliente-virtual/aluno/sessoes/${sessaoId}/mensagens`, { conteudo });
  }

  finalizarSessao(sessaoId) {
    return this.request("POST", `/cliente-virtual/aluno/sessoes/${sessaoId}/finalizar`);
  }

  listarHistorico() {
    return this.request("GET", "/cliente-virtual/aluno/sessoes");
  }

  detalharSessao(id) {
    return this.request("GET", `/cliente-virtual/aluno/sessoes/${id}`);
  }
}

export const apiAluno = new ApiAlunoService();
