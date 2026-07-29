/**
 * VCSP API Service — professor.
 *
 * Segurança:
 *  - Access token armazenado APENAS em memória (nunca em localStorage/sessionStorage)
 *  - Refresh token em cookie HttpOnly gerenciado pelo backend (invisível ao JS)
 *  - Em caso de 401, tenta renovar o token automaticamente antes de falhar
 *  - credentials: "include" em todas as requisições (envia cookies automaticamente)
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "https://api.appdocentia.com.br/api";

class ApiService {
  constructor() {
    this._accessToken = null;
    this._refreshing = null;
  }

  setToken(token) {
    this._accessToken = token;
  }

  clearToken() {
    this._accessToken = null;
  }

  async request(method, path, body = null, _retry = true) {
    const headers = { "Content-Type": "application/json" };
    if (this._accessToken) headers["Authorization"] = `Bearer ${this._accessToken}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 204) return null;

    if (res.status === 401 && _retry) {
      const renewed = await this._tryRefresh();
      if (renewed) return this.request(method, path, body, false);
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Erro ${res.status} — resposta inesperada do servidor`);
    }
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

  async _tryRefresh() {
    if (!this._refreshing) {
      this._refreshing = fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) return false;
          const { access_token } = await res.json();
          this._accessToken = access_token;
          return true;
        })
        .catch(() => false)
        .finally(() => {
          this._refreshing = null;
        });
    }
    return this._refreshing;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  register(dados) {
    return this.request("POST", "/auth/register", dados);
  }

  login(email, password) {
    return this.request("POST", "/auth/login", { email, password });
  }

  me() {
    return this.request("GET", "/auth/me");
  }

  logout() {
    return fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      this._accessToken = null;
    });
  }

  tryRestoreSession() {
    return this._tryRefresh();
  }

  // ── Cliente Virtual — Professor ───────────────────────────────────────────

  listarTurmasVirtuais() {
    return this.request("GET", "/cliente-virtual/professor/turmas");
  }

  criarTurmaVirtual(dados) {
    return this.request("POST", "/cliente-virtual/professor/turmas", dados);
  }

  regenerarLinkTurma(turmaId) {
    return this.request("POST", `/cliente-virtual/professor/turmas/${turmaId}/regenerar-link`);
  }

  listarAlunosTurma(turmaId) {
    return this.request("GET", `/cliente-virtual/professor/turmas/${turmaId}/alunos`);
  }

  desativarAluno(turmaId, alunoId) {
    return this.request("DELETE", `/cliente-virtual/professor/turmas/${turmaId}/alunos/${alunoId}`);
  }

  listarCenariosVirtuais() {
    return this.request("GET", "/cliente-virtual/professor/cenarios");
  }

  detalharCenarioVirtual(id) {
    return this.request("GET", `/cliente-virtual/professor/cenarios/${id}`);
  }

  criarCenarioVirtual(dados) {
    return this.request("POST", "/cliente-virtual/professor/cenarios", dados);
  }

  atualizarCenarioVirtual(id, dados) {
    return this.request("PUT", `/cliente-virtual/professor/cenarios/${id}`, dados);
  }

  deletarCenarioVirtual(id) {
    return this.request("DELETE", `/cliente-virtual/professor/cenarios/${id}`);
  }

  assistirCriteriosCenario(id, instrucoesAdicionais = null) {
    return this.request("POST", `/cliente-virtual/professor/cenarios/${id}/criterios/assistir`, {
      instrucoes_adicionais: instrucoesAdicionais,
    });
  }

  listarFrameworkCenario(id) {
    return this.request("GET", `/cliente-virtual/professor/cenarios/${id}/framework`);
  }

  async uploadFrameworkCenario(cenarioId, arquivo, _retry = true) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const headers = {};
    if (this._accessToken) headers["Authorization"] = `Bearer ${this._accessToken}`;

    const res = await fetch(`${API_BASE}/cliente-virtual/professor/cenarios/${cenarioId}/framework/upload`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });

    if (res.status === 401 && _retry) {
      const renewed = await this._tryRefresh();
      if (renewed) return this.uploadFrameworkCenario(cenarioId, arquivo, false);
    }

    let data;
    try { data = await res.json(); } catch { throw new Error(`Erro ${res.status}`); }
    if (!res.ok) {
      const detail = Array.isArray(data.detail)
        ? data.detail.map((e) => e.msg || JSON.stringify(e)).join("; ")
        : data.detail;
      throw new Error(detail || `Erro ${res.status}`);
    }
    return data;
  }

  publicarCenarioVirtual(id, turmaIds) {
    return this.request("POST", `/cliente-virtual/professor/cenarios/${id}/publicar`, { turma_ids: turmaIds });
  }
}

export const api = new ApiService();
