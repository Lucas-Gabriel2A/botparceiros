/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      COREBOT CALLS - SALAS VIP PRIVADAS                   ║
 * ║                   Criação e Gerenciamento de Calls VIP                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Criação de salas de voz VIP exclusivas
 * - Painel de controle interativo
 * - Convites privados via DM
 * - Gerenciamento completo (renomear, limite, fechar, transferir)
 * - Deleção automática quando vazia
 */
interface CallData {
    ownerId: string;
    createdAt: Date;
    isOpen: boolean;
    memberLimit: number | null;
}
declare const privateCallOwners: Map<string, CallData>;
export { privateCallOwners, CallData };
//# sourceMappingURL=index.d.ts.map