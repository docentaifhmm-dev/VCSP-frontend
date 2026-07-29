/**
 * Cliente Virtual — API do Aluno.
 *
 * Cliente HTTP separado do `api` (professor) de propósito: o principal
 * autenticado aqui é um AlunoTurma, nunca um User — misturar os dois no
 * mesmo singleton arriscaria contaminar o estado de sessão entre papéis na
 * mesma aba do navegador.
 *
 * Sessão: o link único do aluno (access_token) é opaco e permanente — é
 * trocado por um JWT de curta duração (12h) a cada carregamento da página.
 * Persistimos apenas o access_token bruto em localStorage (não o JWT), para
 * que o link salvo/favoritado continue funcionando em visitas futuras.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "https://api.appdocentia.com.br/api";
const STORAGE_KEY = "vcsp_cv_access_token";

class ApiAlunoService {
  constructor() {
    this._alunoToken = null;
  }

  getStoredAccessToken() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  saveAccessToken(token) {
    try { localStorage.setItem(STORAGE_KEY, token); } catch { /* ignore */ }
  }

  clearSession() {
    this._alunoToken = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  /** Troca o access_token (link único) por uma sessão JWT de aluno. */
  async trocarSessao(accessToken) {
    const res = await fetch(`${API_BASE}/cliente-virtual/aluno/sessao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Link de acesso inválido ou expirado.");

    this._alunoToken = data.token;
    this.saveAccessToken(accessToken);
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
