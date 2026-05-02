/**
 * ⚡ Branding Service
 *
 * Adiciona/remove footer "Powered by CoreBot" baseado no plano do servidor.
 * Free/Starter = com marca | Pro/Ultimate = sem marca
 */
/**
 * Retorna o footer de branding para uma guild.
 * Se o owner tiver plano Pro/Ultimate, retorna null (sem marca).
 */
export declare function getBrandingFooter(ownerId: string): Promise<string | null>;
/**
 * Aplica branding a uma resposta de texto
 */
export declare function applyBranding(text: string, footer: string | null): string;
//# sourceMappingURL=branding.service.d.ts.map