import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";
import { database } from "@shared/services/database";

// Inicializa Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, data } = body;
        const topic = body.topic || type; // topic for webhooks, type for some notifications
        const id = data?.id || body.resource; // data.id or resource ID

        console.log(`🔔 Webhook MP recebido: ${topic} - ID: ${id}`);

        if (!id) {
            return NextResponse.json({ message: "No ID provided" }, { status: 400 });
        }

        // 1. Tratamento para PREAPPROVAL (Assinaturas)
        if (topic === 'subscription_preapproval') {
            const preapproval = new PreApproval(client);
            const subscription = await preapproval.get({ id });

            await database.updateSubscriptionStatus(
                subscription.id!, // ID da assinatura (ex: 2c938084...)
                subscription.status!, // authorized, cancelled, etc.
                subscription.next_payment_date ? new Date(subscription.next_payment_date) : undefined
            );

            console.log(`✅ Assinatura ${subscription.id} atualizada para: ${subscription.status}`);
        }

        // 2. Tratamento para PAYMENT (Cobranças/Faturas)
        if (topic === 'payment') {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id });

            // Se for um pagamento de assinatura, o metadata costuma ter info, 
            // ou payment.external_reference pode ser o ID da assinatura se configurarmos assim.
            // Por padrão, o MP nem sempre linka direto no json simples, mas vamos tentar achar o payment.

            // Em assinaturas, geralmente vinculamos via `order.id` ou `subscription.id` se disponível.
            // Para simplificar agora, vamos apenas logar o pagamento se conseguirmos identificar.

            // ATENÇÃO: Pagamentos de assinatura automatica as vezes vem sem external_reference claro do nosso lado
            // mas o objeto payment tem `metadata`.

            console.log(`💰 Pagamento recebido: ${payment.id} - Status: ${payment.status}`);

            // TODO: Implementar lógica de salvar pagamento na tabela `payments`
            // Por enquanto, focar apenas em ativar a assinatura
        }

        return NextResponse.json({ message: "OK" });
    } catch (error) {
        console.error("❌ Erro no webhook:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
