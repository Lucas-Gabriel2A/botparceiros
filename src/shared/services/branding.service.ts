/**
 * ⚡ Branding Service
 * 
 * Adiciona/remove footer "Powered by CoreBot" baseado no plano do servidor.
 * Free/Starter = com marca | Pro/Ultimate = sem marca
 */

import { getSubscriptionByUser } from './database';
import { logger } from './logger.service';

const BRANDING_FOOTER = '⚡ Powered by CoreBot';

// Cache simples para evitar queries repetidas (TTL 5 min)
const cache = new Map<string, { plan: string | null; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Retorna o footer de branding para uma guild.
 * Se o owner tiver plano Pro/Ultimate, retorna null (sem marca).
 */
export async function getBrandingFooter(ownerId: string): Promise<string | null> {
    try {
        // Check cache
        const cached = cache.get(ownerId);
        if (cached && cached.expires > Date.now()) {
            return shouldShowBranding(cached.plan) ? BRANDING_FOOTER : null;
        }

        const sub = await getSubscriptionByUser(ownerId);
        const plan = sub?.status === 'authorized' ? sub.plan : null;

        // Update cache
        cache.set(ownerId, { plan, expires: Date.now() + CACHE_TTL });

        return shouldShowBranding(plan) ? BRANDING_FOOTER : null;
    } catch (error) {
        logger.error('Erro ao verificar branding', { error });
        return BRANDING_FOOTER; // Falha = mostra marca (seguro)
    }
}

/**
 * Aplica branding a uma resposta de texto
 */
export function applyBranding(text: string, footer: string | null): string {
    if (!footer) return text;
    return `${text}\n\n-# ${footer}`;
}

function shouldShowBranding(plan: string | null): boolean {
    // Pro e Ultimate não mostram marca
    return plan !== 'pro' && plan !== 'ultimate';
}
