
// Simplified valid check script using fetch only to avoid TS issues with the SDK
const accessToken = 'TEST-1826830300308599-020423-a97f5cf3cc016e6a7f5f672d8c997630-1117308706';

async function check() {
    console.log("🔍 Checking Mercadopago Credentials...");
    console.log(`🔑 Access Token: ${accessToken.substring(0, 20)}...`);

    try {
        const response = await fetch('https://api.mercadopago.com/users/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("❌ Failed to fetch user info:", response.status, response.statusText);
            const text = await response.text();
            console.error("Body:", text);
            return;
        }

        const data = await response.json();
        console.log("\n✅ Credentials Valid! Account Info Found:");
        console.log("------------------------------------------------");
        console.log("🆔 User ID:", data.id);
        console.log("👤 Full Name:", `${data.first_name} ${data.last_name}`);
        console.log("� Nickname:", data.nickname);
        console.log("🏢 Company Name:", data.company?.corporate_name || 'N/A');
        console.log("📧 Email:", data.email);
        console.log("------------------------------------------------");

        console.log("\n� Investigating Application Info...");

        // Try to get specific application info if possible, referencing the client_id if we have it
        // Often 'nickname' or 'company.corporate_name' is what appears on the invoice.

        if (data.nickname === 'PegaMeuKit' || data.company?.corporate_name === 'PegaMeuKit') {
            console.log("🚨 FOUND IT! The name 'PegaMeuKit' is coming from your Account Nickname or Company Name.");
        } else {
            console.log("ℹ️ usage: The name likely comes from the 'Application' settings in the dev panel, which is separate from User Info.");
            console.log("ℹ️ Try checking: https://www.mercadopago.com.br/developers/panel/app");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

check();
