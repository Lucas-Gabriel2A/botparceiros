import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { serverBuilder } from "@shared/services/server-builder.service";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { prompt } = await req.json();
        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
        }

        // Use the ServerBuilderService directly (shared code)
        const schema = await serverBuilder.generateServerPlan(prompt);

        if (!schema) {
            return NextResponse.json({ error: "Falha ao gerar estrutura. Tente novamente." }, { status: 500 });
        }

        return NextResponse.json({ schema });
    } catch (error) {
        console.error("[ServerBuilder Generate] Error:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
