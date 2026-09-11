/**
 * Corrida de revisao na gravacao de `Agency`. Lancada pelo repositorio quando a
 * guarda otimista (`revision = esperada`) nao encontra a linha: outra transacao
 * ja' gravou uma revisao posterior. Sem isso o `UPDATE` sobrescrevia a alteracao
 * concorrente em silencio (lost update) e o evento publicado carregava
 * `previous*` obsoleto (S4c/ANX-460).
 */
export class AgencyRevisionConflictError extends Error {
	constructor() {
		super("Agency revision conflict");
		this.name = "AgencyRevisionConflictError";
	}
}
