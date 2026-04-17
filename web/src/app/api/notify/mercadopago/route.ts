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

            console.log(`💰 Pagamento recebido: ${payment.id} - Status: ${payment.status}`);

            // Tenta obter o ID da assinatura atrelada (PreApproval)
            let subscriptionId = payment.metadata?.preapproval_id || null;

            // Se o pagamento veio de uma assinatura, o external_reference herda o user_id originado no checkout
            const userId = payment.external_reference;

            if (!subscriptionId && userId) {
                // Buscar a assinatura ativa mais recente deste usuário para fazer o vinculo (já que MP costuma omitir preapproval_id diretamente)
                const userSub = await database.getSubscriptionByUser(userId);
                if (userSub) {
                    subscriptionId = userSub.id;
                }
            }

            if (subscriptionId) {
                try {
                    await database.createPayment(
                        Number(payment.id),
                        String(subscriptionId),
                        Number(payment.transaction_amount || 0),
                        String(payment.status)
                    );
                    console.log(`✅ Pagamento ${payment.id} salvo na tabela payments vinculado à assinatura ${subscriptionId}`);
                } catch (dbError) {
                    console.warn(`⚠️ Erro ao salvar log do pagamento (verifique restrições no banco de dados):`, dbError);
                }
            } else {
                console.log(`ℹ️ Pagamento ${payment.id} ignorado para a tabela payments (Sem subscription_id ou user_id mapeável encontrado)`);
            }
        }

        return NextResponse.json({ message: "OK" });
    } catch (error) {
        console.error("❌ Erro no webhook:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
