import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth-options";
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        let folder = (formData.get('folder') as string) || 'corebot/whitelabel';

        // 🔒 Security Check 1: Restrição Absoluta de Diretórios (Prevenir Path Traversal/Hijack)
        const ALLOWED_FOLDERS = ['corebot/whitelabel'];
        if (!ALLOWED_FOLDERS.includes(folder)) {
             folder = 'corebot/whitelabel'; // Override forçado
        }

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 🔒 Security Check 2: Validação de Plano para Uploads na Cloud
        // Somente usuários com Ultimate podem usar a rede para subir assets de Whitelabel
        const { getSubscriptionByUser } = await import('@shared/services/database');
        const userId = (session.user as any).id;
        const sub = await getSubscriptionByUser(userId);
        if (sub?.plan !== 'ultimate' || sub?.status !== 'authorized') {
            return NextResponse.json({ error: 'Plano Ultimate requerido para envio de arquivos em nuvem.' }, { status: 403 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        const url = await uploadImage(file, folder);
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
