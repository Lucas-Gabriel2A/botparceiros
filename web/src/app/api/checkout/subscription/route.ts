import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { SUBSCRIPTION_PLANS, PlanId } from "@/config/subscription";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { plan, interval = 'monthly' } = body;

        const selectedPlanConfig = SUBSCRIPTION_PLANS[plan as PlanId];

        if (!selectedPlanConfig) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const isYearly = interval === 'yearly';
        // Use exact yearly price from config to avoid floating point issues or mismatches
        const price = isYearly ? selectedPlanConfig.price_yearly * 12 : selectedPlanConfig.price;
        const frequency = isYearly ? 12 : 1;

        if (!session.user.email) {
            return NextResponse.json({ error: "Email is required for payment" }, { status: 400 });
        }

        const preapproval = new PreApproval(client);

        // Mercado Pago exige HTTPS real. Em dev (localhost), usamos example.com para não quebrar a API.
        const baseUrl = process.env.NEXTAUTH_URL?.includes('localhost')
            ? 'https://example.com'
            : process.env.NEXTAUTH_URL;

        const backUrl = `${baseUrl}/dashboard?success=true&plan=${plan}`;
        console.log("Creating PreApproval for", selectedPlanConfig.title, "Back URL:", backUrl);

        const response = await preapproval.create({
            body: {
                reason: `CoreBot ${selectedPlanConfig.title} Subscription`,
                auto_recurring: {
                    frequency: frequency,
                    frequency_type: "months",
                    transaction_amount: Number(price.toFixed(2)),
                    currency_id: "BRL"
                },
                back_url: backUrl,
                payer_email: session.user.email,
                external_reference: session.user.id,
                status: "pending"
            }
        });

        return NextResponse.json({ url: response.init_point });
    } catch (error) {
        console.error("MercadoPago Error:", error);
        return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
    }
}
